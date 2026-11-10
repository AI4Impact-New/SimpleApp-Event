export type CheckoutResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
export type CheckoutFailure = {
  description: string;
  code?: string;
  reason?: string;
  step?: string;
  source?: string;
};
export type OpenRazorpayOptions = Record<string, unknown> & {
  onFailure?: (failure: CheckoutFailure) => void;
};

export async function openRazorpay(_options: OpenRazorpayOptions): Promise<CheckoutResult | null> {
  throw new Error('Open this order in the student web portal to pay securely.');
}
