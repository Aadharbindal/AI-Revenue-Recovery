"""
The LLM layer — deliberately small.

The model does exactly one job in the money path: it writes a message
*template* containing placeholders. It never sees an amount, never writes a
number, never picks a recipient, never decides whether to send. Rendering the
template — substituting the rupee figure, the name, the link — is string
substitution in Python against values the database computed.

Two consequences worth stating out loud, because they are the whole argument:

**Cost and latency.** Templates are cached on
`(recovery_class, tier, language)`. A batch of six hundred cases needs on the
order of eighteen model calls, not six hundred. The model does the creative
work once; the code does the per-record work every time.

**Failure containment.** If the provider is down, rate-limits us, returns
malformed JSON, or writes a number into the body, the validator rejects it and
a deterministic Jinja template takes over. The rejection is logged with its
reason. The batch does not stop, and no customer receives a number the model
invented.
"""

import os
import re
from typing import Optional

from app.llm.fallback import get_fallback_template
from app.llm.prompts import SYSTEM_PROMPT, build_user_prompt
from app.llm.validator import DraftMessage, validate

try:
    from litellm import completion as _completion
    _HAS_LITELLM = True
except ImportError:  # the repo must run with zero API keys and no litellm
    _completion = None
    _HAS_LITELLM = False

MODEL = os.environ.get("LLM_MODEL", "groq/llama-3.3-70b-versatile")

# Cache key is (recovery_class, tier, language) — deliberately not the channel,
# because channel only changes the length cap, which the validator enforces.
_template_cache: dict = {}
_call_count = 0


def call_count() -> int:
    """How many times we actually hit the provider this process."""
    return _call_count


def reset_cache():
    global _call_count
    _template_cache.clear()
    _call_count = 0


def _fallback(recovery_class: str, channel: str, language: str,
              reason: str, validation: Optional[dict] = None) -> dict:
    return {
        "body": get_fallback_template(recovery_class, channel, language),
        "llm_used": False,
        "llm_rejected_reason": reason,
        "validation": validation,
    }


def get_message_template(recovery_class: str, tier: int, channel: str,
                         language: str) -> dict:
    """
    Return a validated template for this situation.

    Always returns something sendable. `llm_used` says whether the model's
    output survived validation; `llm_rejected_reason` says why it did not.
    """
    global _call_count

    cache_key = (recovery_class, tier, language, channel)
    if cache_key in _template_cache:
        return _template_cache[cache_key]

    if not _HAS_LITELLM:
        return _fallback(recovery_class, channel, language, "LITELLM_NOT_INSTALLED")
    if not (os.environ.get("GROQ_API_KEY") or os.environ.get("GEMINI_API_KEY")):
        return _fallback(recovery_class, channel, language, "NO_API_KEY")

    try:
        _call_count += 1
        response = _completion(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(
                    recovery_class, channel, language)},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=400,
        )
        raw = response.choices[0].message.content
    except Exception as exc:
        return _fallback(recovery_class, channel, language,
                         f"PROVIDER_ERROR:{type(exc).__name__}")

    result = validate(raw, {"language": language, "channel": channel})
    if not result.ok:
        # This is the interesting path, not the sad one: the guardrail worked.
        return _fallback(recovery_class, channel, language, result.reason,
                         result.checks)

    draft = DraftMessage.model_validate_json(raw)
    template = {
        "body": draft.body,
        "llm_used": True,
        "llm_rejected_reason": None,
        "validation": result.checks,
    }
    _template_cache[cache_key] = template
    return template


_PLACEHOLDER = re.compile(r"\{\{\s*(\w+)\s*\}\}")


def render(template: str, values: dict) -> str:
    """
    Fill a validated template. Every substituted value comes from the database;
    none of them passed through the model.

    An unknown placeholder is left visible rather than silently blanked — a
    message that reads `{{amount}}` is an obvious bug, whereas one that reads
    "your payment of  is pending" is a bug that ships.
    """
    return _PLACEHOLDER.sub(
        lambda m: str(values.get(m.group(1), m.group(0))), template
    )
