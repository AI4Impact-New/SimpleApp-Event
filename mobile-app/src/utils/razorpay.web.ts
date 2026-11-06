export type CheckoutResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type Options = Record<string, unknown>;
declare global { interface Window { Razorpay?: new (options: Options) => { open(): void; on(event: string, cb: () => void): void }; } }
let script: Promise<void> | undefined;
export async function openRazorpay(options: Options): Promise<CheckoutResult | null> {
  if (!window.Razorpay) {
    script ??= new Promise<void>((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = 'https://checkout.razorpay.com/v1/checkout.js';
      const timer = window.setTimeout(() => { tag.remove(); script = undefined; reject(new Error('Secure checkout timed out. Please retry.')); }, 15000);
      tag.onload = () => { window.clearTimeout(timer); resolve(); };
      tag.onerror = () => { window.clearTimeout(timer); tag.remove(); script = undefined; reject(new Error('Could not load secure checkout. Please retry.')); };
      document.head.appendChild(tag);
    });
    await script;
  }
  if (!window.Razorpay) throw new Error('Secure checkout is unavailable.');
  return new Promise((resolve) => {
    const checkout = new window.Razorpay!({ ...options, handler: (result: CheckoutResult) => resolve(result),
      modal: { ondismiss: () => resolve(null) } });
    // Razorpay permits retrying a failed attempt inside the same modal.
    checkout.open();
  });
}
