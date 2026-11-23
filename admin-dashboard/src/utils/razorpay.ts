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
  if (!failure) {
    return {
      title: 'Payment Incomplete',
      message: 'The payment attempt was not completed. No money was deducted from your account.',
      reasonCode: 'incomplete',
      suggestion: 'You can retry with UPI, Netbanking, or another card.',
    };
  }

  const desc = (failure.description || '').toLowerCase();
  const reason = (failure.reason || '').toLowerCase();
  const step = (failure.step || '').toLowerCase();

  // 1. Insufficient funds (Razorpay code: insufficient_funds)
  if (
    reason === 'insufficient_funds' ||
    desc.includes('insufficient') ||
    desc.includes('balance') ||
    desc.includes('funds')
  ) {
    return {
      title: 'Payment Declined: Insufficient Funds',
      message: 'Your bank declined this transaction due to insufficient balance in your card or bank account. Don’t worry — no money was deducted.',
      reasonCode: 'insufficient_funds',
      suggestion: 'Please try another card with sufficient funds, or pay directly via UPI / Netbanking.',
    };
  }

  // 2. Transaction limit exceeded (Razorpay code: transaction_limit_exceeded)
  if (
    reason === 'transaction_limit_exceeded' ||
    desc.includes('limit') ||
    desc.includes('exceeded')
  ) {
    return {
      title: 'Payment Declined: Limit Exceeded',
      message: 'Your bank declined this transaction because it exceeds your card or UPI daily/transaction limit. No money was deducted.',
      reasonCode: 'transaction_limit_exceeded',
      suggestion: 'Check your card limit settings in your bank app, or pay using Netbanking / UPI.',
    };
  }

  // 3. Card/Instrument blocked by bank (Razorpay code: debit_instrument_blocked)
  if (
    reason === 'debit_instrument_blocked' ||
    desc.includes('blocked') ||
    desc.includes('restricted')
  ) {
    return {
      title: 'Payment Instrument Blocked',
      message: 'Your card or bank account has been blocked for online transactions by your bank. No funds were debited.',
      reasonCode: 'debit_instrument_blocked',
      suggestion: 'Please enable online/e-commerce transactions in your bank app, or try paying via UPI.',
    };
  }

  // 4. Invalid or expired card details (Razorpay code: card_expired)
  if (
    reason === 'card_expired' ||
    desc.includes('expired') ||
    desc.includes('expiry') ||
    desc.includes('cvv') ||
    desc.includes('invalid card')
  ) {
    return {
      title: 'Card Details Invalid or Expired',
      message: 'Your card number, expiry date, or CVV was reported as invalid or expired by the card network.',
      reasonCode: 'card_expired',
      suggestion: 'Double-check your card details, or try an alternate active card or UPI.',
    };
  }

  // 5. UPI VPA Invalid or resolution failed (Razorpay codes: invalid_vpa, vpa_resolution_failed)
  if (
    reason === 'invalid_vpa' ||
    reason === 'vpa_resolution_failed' ||
    desc.includes('vpa') ||
    desc.includes('upi id')
  ) {
    return {
      title: 'Invalid UPI ID',
      message: 'The UPI ID (VPA) could not be verified or is not active on your UPI app. No money was charged.',
      reasonCode: 'invalid_vpa',
      suggestion: 'Double-check your UPI ID (e.g. yourname@oksbi), or select Google Pay / PhonePe directly from the UPI options.',
    };
  }

  // 6. Bank / Gateway technical downtime (Razorpay codes: bank_technical_error, gateway_technical_error, credit_failed)
  if (
    reason === 'bank_technical_error' ||
    reason === 'gateway_technical_error' ||
    reason === 'credit_failed' ||
    desc.includes('technical') ||
    desc.includes('downtime') ||
    desc.includes('declined by gateway')
  ) {
    return {
      title: 'Bank Technical Downtime',
      message: 'The customer’s bank or payment network is experiencing a temporary technical glitch or downtime. No money was deducted.',
      reasonCode: 'bank_technical_error',
      suggestion: 'Please wait a moment and retry, or use a different bank account or payment method.',
    };
  }

  // 7. OTP / 3DS authentication failure (Razorpay code: invalid_otp)
  if (
    reason === 'invalid_otp' ||
    step === 'payment_authentication' ||
    desc.includes('otp') ||
    desc.includes('authentication') ||
    desc.includes('verification')
  ) {
    return {
      title: 'Authentication Incomplete',
      message: 'The OTP or 3D Secure verification was entered incorrectly or could not be completed. No funds were debited.',
      reasonCode: 'invalid_otp',
      suggestion: 'Click Retry Payment to receive a fresh OTP, or choose UPI for quick one-tap verification.',
    };
  }

  // 8. Session / Payment Timed Out (Razorpay code: payment_timed_out)
  if (
    reason === 'payment_timed_out' ||
    desc.includes('timed out') ||
    desc.includes('timeout')
  ) {
    return {
      title: 'Payment Timed Out',
      message: 'The payment session timed out before approval was completed. If money was debited, use "Check payment status".',
      reasonCode: 'payment_timed_out',
      suggestion: 'Retry the payment and approve the notification promptly on your phone/bank page.',
    };
  }

  // 9. Payment risk check failed (Razorpay code: payment_risk_check_failed)
  if (
    reason === 'payment_risk_check_failed' ||
    desc.includes('risk') ||
    desc.includes('flagged')
  ) {
    return {
      title: 'Payment Flagged by Bank',
      message: 'The transaction was stopped by the card-issuing bank’s risk or security filter. No funds were debited.',
      reasonCode: 'payment_risk_check_failed',
      suggestion: 'Please authorize this transaction with your bank or retry with UPI.',
    };
  }

  // 10. User cancelled in popup (Razorpay code: payment_cancelled)
  if (
    reason === 'payment_cancelled' ||
    reason.includes('cancel') ||
    desc.includes('cancelled') ||
    desc.includes('canceled')
  ) {
    return {
      title: 'Payment Cancelled',
      message: 'The checkout window was closed before completing payment. No charges were made.',
      reasonCode: 'payment_cancelled',
      suggestion: 'Your order is saved. Click Retry Payment whenever you are ready.',
    };
  }

  // 11. Generic bank decline (Razorpay codes: card_declined, payment_declined)
  return {
    title: 'Payment Declined by Bank',
    message: failure.description || 'Your card-issuing bank or payment provider declined this transaction. No money was deducted.',
    reasonCode: failure.reason || failure.code || 'bank_declined',
    suggestion: 'Try paying with UPI (Google Pay, PhonePe, Paytm), another card, or Netbanking.',
  };
}

export type OpenRazorpayOptions = Record<string, unknown> & {
  onFailure?: (failure: CheckoutFailure) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, cb: (res: any) => void): void;
    };
  }
}

let script: Promise<void> | undefined;

export async function openRazorpay(options: OpenRazorpayOptions): Promise<CheckoutResult | null> {
  if (!window.Razorpay) {
    script ??= new Promise<void>((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = 'https://checkout.razorpay.com/v1/checkout.js';
      const timer = window.setTimeout(() => {
        tag.remove();
        script = undefined;
        reject(new Error('Secure checkout timed out. Please retry.'));
      }, 15000);
      tag.onload = () => {
        window.clearTimeout(timer);
        resolve();
      };
      tag.onerror = () => {
        window.clearTimeout(timer);
        tag.remove();
        script = undefined;
        reject(new Error('Could not load secure checkout. Please retry.'));
      };
      document.head.appendChild(tag);
    });
    await script;
  }
  if (!window.Razorpay) throw new Error('Secure checkout is unavailable.');

  return new Promise((resolve) => {
    let lastFailure: CheckoutFailure | null = null;
    const { onFailure, modal: modalOverrides, ...rest } = options as any;

    const checkout = new window.Razorpay!({
      ...rest,
      modal: {
        confirm_close: true,
        ...(modalOverrides || {}),
        ondismiss: () => {
          if (lastFailure && onFailure) {
            onFailure(lastFailure);
          }
          if (modalOverrides?.ondismiss) modalOverrides.ondismiss();
          resolve(null);
        },
      },
      handler: (result: CheckoutResult) => resolve(result),
    });

    if (typeof (checkout as any)?.on === 'function') {
      (checkout as any).on('payment.failed', (response: { error?: any }) => {
        const err = response?.error;
        if (err) {
          lastFailure = {
            code: err.code,
            description: err.description || 'Payment was declined by your bank or provider.',
            reason: err.reason,
            step: err.step,
            source: err.source,
          };
          if (onFailure) {
            onFailure(lastFailure);
          }
        }
      });
    }

    checkout.open();
  });
}
