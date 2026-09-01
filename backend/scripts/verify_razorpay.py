import os
import sys

# Add backend dir to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.razorpay_client.links import create_payment_link

def main():
    if not os.environ.get("RZP_KEY_ID") or not os.environ.get("RZP_KEY_SECRET"):
        print("Please set RZP_KEY_ID and RZP_KEY_SECRET environment variables.")
        return

    print("Verifying Razorpay Test-Mode Integration...")
    
    customer = {
        "name": "Test User",
        "email": "test@example.com",
        "phone": "+919876543210",
        "rclass": "TEST_VERIFICATION"
    }

    try:
        res = create_payment_link(
            amount_paise=10000, # Rs 100
            customer=customer,
            description="RecoverOS Integration Test",
            reference_id="test_ref_001"
        )
        print(f"Success! Link generated: {res.get('short_url')}")
    except Exception as e:
        print(f"Failed to generate link: {e}")

if __name__ == "__main__":
    main()
