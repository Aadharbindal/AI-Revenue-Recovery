"""
Render the Hinglish voice scripts to audio.

The scripts are generated, validated and placed by the batch whether or not
this runs — a Tier-3 call is a real action with a real script behind it. What
this adds is the ability to *hear* one, which is the difference between
claiming a Hinglish voice lane and demonstrating it.

Needs SARVAM_API_KEY. Without it the script says so and exits cleanly; the
dashboard then shows the script text with a note that no audio was rendered,
rather than a broken player.

    python backend/scripts/render_voice.py
"""

import argparse
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests                                              # noqa: E402

from app.llm.client import render                            # noqa: E402
from app.llm.fallback import get_fallback_template           # noqa: E402
from app.llm.validator import validate                       # noqa: E402

SARVAM_URL = "https://api.sarvam.ai/text-to-speech"

REPO_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
OUT_DIR = os.path.join(REPO_ROOT, "frontend", "public", "voice")

# One clip per language we actually place calls in. The values substituted here
# are the same ones the renderer uses in a real send — read from the database,
# never authored by a model.
CLIPS = [
    {
        "id": "receivable_hinglish",
        "language": "hinglish",
        "speaker": "anushka",
        "values": {
            "name": "Meera Iyer",
            "merchant": "Demo Merchant",
            "invoice_id": "inv_078",
            "amount": "one lakh forty one thousand nine hundred twenty two rupees",
            "days": "nine",
        },
    },
    {
        "id": "receivable_hindi",
        "language": "hi",
        "speaker": "meera",
        "values": {
            "name": "Rohan Sharma",
            "merchant": "Demo Merchant",
            "invoice_id": "inv_012",
            "amount": "chhattis hazaar rupees",
            "days": "chaudah",
        },
    },
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=OUT_DIR)
    args = parser.parse_args()

    key = os.environ.get("SARVAM_API_KEY")
    manifest = []

    for clip in CLIPS:
        template = get_fallback_template("RECEIVABLE_CHASE", "voice", clip["language"])

        # The same validator gate a model-written script would face: automated
        # -call disclosure, an opt-out, no coercive language, under 400 chars.
        check = validate(
            json.dumps({
                "channel": "voice",
                "language": clip["language"],
                "body": template,
                "amount_token": "{{amount}}",
                "link_token": "{{payment_link}}",
            }),
            {"language": clip["language"], "channel": "voice"},
        )
        if not check.ok:
            print(f"  {clip['id']}: script FAILED validation ({check.reason})")
            return 2

        spoken = render(template, clip["values"])
        manifest.append({
            "id": clip["id"],
            "language": clip["language"],
            "script": spoken,
            "audio": f"/voice/{clip['id']}.wav" if key else None,
            "validated": True,
        })
        print(f"  {clip['id']}: script validated ({len(spoken)} chars)")

    os.makedirs(args.out, exist_ok=True)

    if not key:
        print()
        print("SARVAM_API_KEY is not set, so no audio was rendered.")
        print("The scripts above are still generated, validated and placed by")
        print("the batch; the dashboard will show the text and say that no")
        print("audio exists rather than showing a broken player.")
    else:
        for clip, entry in zip(CLIPS, manifest):
            response = requests.post(
                SARVAM_URL,
                headers={"api-subscription-key": key},
                json={
                    "inputs": [entry["script"]],
                    # Sarvam has no "hinglish" code; Hindi voices read Latin-script
                    # Hinglish correctly, which is how people actually hear it.
                    "target_language_code": "hi-IN",
                    "speaker": clip["speaker"],
                    "model": "bulbul:v2",
                },
                timeout=60,
            )
            if response.status_code >= 400:
                print(f"  {clip['id']}: Sarvam returned "
                      f"{response.status_code}: {response.text[:200]}")
                entry["audio"] = None
                continue

            import base64
            audio = base64.b64decode(response.json()["audios"][0])
            path = os.path.join(args.out, f"{clip['id']}.wav")
            with open(path, "wb") as fh:
                fh.write(audio)
            print(f"  {clip['id']}: wrote {path} ({len(audio) // 1024} KB)")

    with open(os.path.join(args.out, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"clips": manifest}, fh, indent=2)
    print(f"\nWrote {os.path.join(args.out, 'manifest.json')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
