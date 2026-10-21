# SES production-access support reply

Case display ID: 179257518900594. Region: ap-south-1. Prepared 21 October 2026. This text is a draft for submission in the existing AWS Support case; it has not been sent.

---

Hello AWS Support team,

Thank you for the review. Please find the requested information below.

**Website/application URLs**

- Public website: https://www.ai4impact.in/
- Staff console: https://admin.ai4impact.in/
- AI4Impact provides AI/data training courses and a student learning application. The website accepts course enquiries, and authorized staff follow up with prospective students.

**Email type**

Transactional messages only for the initial release: personalized course quotes and pro forma invoice PDFs requested by the recipient during a consented course-enquiry call. Account invitations and first-login temporary passwords currently use Amazon Cognito’s default sender. Future enrollment confirmations will relate to a specific student’s course access. We are not requesting production access for bulk newsletters or unsolicited promotions.

The payment checkout is currently a demonstration. Quote messages explicitly say that no money is collected, no course access is granted by demo completion, and the pro forma PDF is not a tax invoice or proof of payment.

**Expected volume**

Our initial estimate is fewer than 100 transactional emails per day, approximately up to 3,000 per month. We will start with small volumes and monitor reputation and feedback before increasing sending.

**Recipient source and consent**

Recipients submit their own contact details and contact consent on our website, or already hold a student account. During follow-up, staff records the student’s authorization to create/link an account and receive the requested quote. The saved enquiry retains the contact-consent version/time, and staff account/quote/delivery actions are audited. We do not purchase, rent, scrape or import third-party mailing lists.

Each quote recipient comes from the saved student quote. The sending API does not accept an arbitrary recipient list or address supplied with the send request. Existing accounts retain their passwords when linked. No promotional mailing campaign is enabled by this workflow.

**Bounce and complaint handling**

We configure SES account-level and configuration-set suppression for BOUNCE and COMPLAINT. Application sends specify the `pilearn-transactional` configuration set. Its enabled SNS event destination publishes bounce, complaint, rejection and rendering-failure events to our restricted `pilearn-operations` SNS topic, monitored by our operations contact, siddartha.yadav@payintelli.com. Our backend also records email-submission status and the provider message ID. We do not automatically retry ambiguous submissions, and we will review feedback and keep affected recipients suppressed before any further send. End-to-end feedback testing will precede production email activation.

**Sample email**

From: AI4Impact <noreply@ai4impact.in>
Subject: AI4Impact | Your course quote and demo checkout link

Hello Example Learner,

Thank you for speaking with us. Here is your personal quote for your selected AI4Impact course:

Marked price: INR 50,000.00
Discount: 10%
Total: INR 45,000.00

Your pro forma PDF is attached. Open demo checkout: [owner-specific authenticated checkout link on admin.ai4impact.in]

DEMO ONLY. No payment is collected. Completing this checkout does not grant course access. The attached PDF is pro forma, not a tax invoice or proof of payment.

We’re here to help you take the next step.
The AI4Impact team

The HTML email includes our logo and the same content, with a clearly labelled demo-checkout button. It contains no payment-card or bank-data collection.

**Identity verification**

The `ai4impact.in` SES domain identity exists in ap-south-1. We have published all three AWS-provided DKIM CNAMEs at the domain’s authoritative GoDaddy nameservers, and confirmed that they resolve both authoritatively and through public DNS. SES still reports verification pending at our last check. We will keep automatic SES application sending disabled until identity verification completes and production access is approved. Please let us know if you require any further identity-validation steps.

Thank you,
Siddartha Yadav
AI4Impact
siddartha.yadav@payintelli.com
