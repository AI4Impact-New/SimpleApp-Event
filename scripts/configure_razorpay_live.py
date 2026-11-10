#!/usr/bin/env python3
"""Configure Razorpay LIVE credentials in AWS Secrets Manager safely without shell history leaks."""
import argparse
import getpass
import json
import secrets
import boto3
from botocore.config import Config
import requests


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', default=None, help='AWS CLI profile (defaults to default or AWS_PROFILE)')
    parser.add_argument('--region', default='ap-south-1', help='AWS region (default: ap-south-1)')
    args = parser.parse_args()

    print("=" * 60)
    print("  Configure Razorpay LIVE Mode for AI4Impact")
    print("=" * 60)
    print("NOTE: Make sure your Razorpay Dashboard is toggled to LIVE mode.")
    print()

    key_id = input("Enter Razorpay LIVE Key ID (starts with rzp_live_): ").strip()
    if not key_id.startswith("rzp_live_"):
        raise SystemExit("Error: Key ID must begin with 'rzp_live_'. Nothing was modified.")

    key_secret = getpass.getpass("Enter Razorpay LIVE Key Secret (hidden): ").strip()
    if not key_secret:
        raise SystemExit("Error: Key Secret cannot be empty. Nothing was modified.")

    # Validate live credentials against Razorpay API
    print("Validating live credentials with Razorpay API...")
    try:
        res = requests.get(
            "https://api.razorpay.com/v1/orders",
            params={"count": 1},
            auth=(key_id, key_secret),
            timeout=(5, 10),
        )
    except Exception as e:
        raise SystemExit(f"Connection error to Razorpay: {e}")

    if res.status_code != 200:
        raise SystemExit(
            f"Error: Razorpay rejected authentication (HTTP {res.status_code}). "
            "Please check that your Key ID and Secret are correct and active in LIVE mode."
        )

    print("✓ Live API credentials validated successfully!")

    # Check for existing webhook secret or generate a secure one
    session = boto3.Session(profile_name=args.profile, region_name=args.region) if args.profile else boto3.Session(region_name=args.region)
    sm = session.client("secretsmanager", config=Config(connect_timeout=3, read_timeout=5, retries={"total_max_attempts": 3}))

    secret_name = "pilearn/razorpay"
    try:
        existing = json.loads(sm.get_secret_value(SecretId=secret_name)["SecretString"])
    except Exception:
        existing = {}

    webhook_secret = existing.get("webhook_secret") or secrets.token_urlsafe(32)

    live_payload = {
        "mode": "live",
        "key_id": key_id,
        "key_secret": key_secret,
        "webhook_secret": webhook_secret,
    }

    print(f"Updating AWS Secrets Manager secret '{secret_name}'...")
    res = sm.put_secret_value(SecretId=secret_name, SecretString=json.dumps(live_payload))
    print(f"✓ AWS Secrets Manager updated successfully! (ARN: {res['ARN']})")
    print()
    print("=" * 60)
    print("ACTION REQUIRED IN RAZORPAY DASHBOARD (LIVE MODE):")
    print("=" * 60)
    print("1. In Razorpay Dashboard, ensure toggle is switched to LIVE.")
    print("2. Go to: Account & Settings -> Webhooks (or Developers -> Webhooks)")
    print("3. Click '+ Add New Webhook' and set:")
    print("   - Webhook URL: https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com/webhooks/razorpay")
    print(f"   - Secret: {webhook_secret}")
    print("   - Active Events: payment.captured, order.paid, refund.processed")
    print("   - Alert Email: (your operational email)")
    print("4. Go to: Account & Settings -> Capture and refund settings")
    print("   - Ensure 'Automatically capture all payments immediately' is ENABLED.")
    print("=" * 60)
    print("AI4Impact is now configured for LIVE payments!")


if __name__ == "__main__":
    main()
