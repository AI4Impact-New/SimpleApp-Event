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

    checkout.on('payment.failed', (response: { error?: any }) => {
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

    checkout.open();
  });
}
