// Shared display rules for demo orders
import type { DemoOrder } from '@/types/billing';
import { colors } from '@/theme/colors';

/** Pending order whose seven-day checkout link has lapsed (server answers 410). */
export function isOrderLinkExpired(order: DemoOrder): boolean {
  return order.status === 'pending' && new Date(order.expires_at).getTime() <= Date.now();
}

/** Label and colour for an order, including the expired-link state. */
export function orderStatusDisplay(order: DemoOrder): { label: string; color: string } {
  if (isOrderLinkExpired(order)) return { label: 'Checkout link expired', color: colors.error };
  return {
    paid: { label: 'Payment verified · enrolled', color: colors.success },
    partially_refunded: { label: 'Partially refunded', color: '#b45309' },
    refunded: { label: 'Refunded', color: colors.error },
    pending: { label: order.demo ? 'Awaiting demo payment' : 'Ready for payment', color: colors.primary },
    demo_completed: { label: 'Demo payment completed', color: colors.success },
    cancelled: { label: 'Cancelled', color: colors.error },
  }[order.status];
}
