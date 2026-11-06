export type CheckoutResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
export async function openRazorpay(_options: Record<string, unknown>): Promise<CheckoutResult | null> {
  throw new Error('Open this order in the student web portal to pay securely.');
}
