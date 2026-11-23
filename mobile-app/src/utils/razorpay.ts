export type CheckoutResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
export type CheckoutFailure = {
  description: string;
  code?: string;
  reason?: string;
  step?: string;
  source?: string;
};
export type PaymentFailureDiagnosis = {
  title: string;
  message: string;
  reasonCode: string;
  suggestion: string;
};

export function formatPaymentFailure(failure?: CheckoutFailure | null): PaymentFailureDiagnosis {
  return {
    title: 'Payment Declined by Bank',
    message: failure?.description || 'Payment was declined by your bank or provider. No money was deducted.',
    reasonCode: failure?.reason || failure?.code || 'bank_declined',
    suggestion: 'Try paying with UPI, another card, or Netbanking.',
  };
}

export type OpenRazorpayOptions = Record<string, unknown> & {
  onFailure?: (failure: CheckoutFailure) => void;
};

export async function openRazorpay(_options: OpenRazorpayOptions): Promise<CheckoutResult | null> {
  throw new Error('Open this order in the student web portal to pay securely.');
}
