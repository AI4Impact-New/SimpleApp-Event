// Browser checkout: the portal's two-column page over CheckoutScreen's data and actions.
// Wide: status, payment problem and order details on the left; a sticky summary with the total and
// the pay action on the right. Narrow browsers stack it with the summary straight after the status.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWebLayout } from '@/hooks/useWebLayout';
import { Spinner } from '@/components/web/Spinner';
import { apiErrorMessage } from '@/services/apiErrors';
import type { DemoOrder } from '@/types/billing';
import type { PaymentFailureDiagnosis } from '@/utils/razorpay';
import { colors, fonts, palette } from '@/theme/colors';
import { formatLocalDateTime } from '@/utils/datetime';
import { formatPaise } from '@/utils/money';

type PressState = { pressed: boolean; hovered?: boolean };
type IconName = keyof typeof Ionicons.glyphMap;

const ink = palette.navy850;
const muted = palette.slate500;
const body = palette.slate600;
const line = palette.slate200;
const lineSoft = palette.slate150;
const danger = '#b4321f';

export interface WebCheckoutProps {
  order: DemoOrder | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onBack: () => void;
  linkExpired: boolean;
  pending: boolean;
  statusLabel: string;
  statusColor: string;
  paying: boolean;
  downloading: boolean;
  demoBusy: boolean;
  paymentFailure: PaymentFailureDiagnosis | null;
  paymentError: string;
  onPay: () => void;
  onCheckStatus: () => void;
  onDownload: () => void;
  onCompleteDemo: () => void;
  onCancelDemo: () => void;
  onOpenLearning?: () => void;
}

export function WebCheckout(props: WebCheckoutProps) {
  const { order, isLoading, error } = props;
  const { wide } = useWebLayout();

  if (isLoading) {
    return (
      <Page onBack={props.onBack}>
        <View style={[styles.card, styles.blank]}>
          <Spinner size={22} track={palette.slate200} head={palette.teal600} label="Loading order" />
        </View>
      </Page>
    );
  }

  if (error || !order) {
    const status = (error as any)?.response?.status;
    const gone = status === 404 || status === 403;
    return (
      <Page onBack={props.onBack}>
        <View style={[styles.card, styles.blank]}>
          <View style={styles.blankIcon}>
            <Ionicons name={gone ? 'alert-circle-outline' : 'cloud-offline-outline'} size={18} color={gone ? body : danger} />
          </View>
          <Text style={styles.blankTitle}>{gone ? 'This order is unavailable' : 'Could not load this order'}</Text>
          <Text style={styles.bodyText}>{gone ? 'It may belong to another account or have been removed.' : apiErrorMessage(error, 'Check your connection and try again.')}</Text>
          <Button label={gone ? 'Go back' : 'Try again'} onPress={gone ? props.onBack : props.onRetry} />
        </View>
      </Page>
    );
  }

  const failed = order.status !== 'paid' && (props.paymentFailure || props.paymentError);
  const status = <StatusCard {...props} order={order} />;
  const problem = failed ? <PaymentProblem failure={props.paymentFailure} message={props.paymentError} /> : null;
  const summary = <SummaryCard {...props} order={order} wide={wide} />;
  const details = <DetailsCard order={order} linkExpired={props.linkExpired} />;

  return (
    <Page onBack={props.onBack} subtitle={`Order ${order.id.slice(0, 8)} · placed ${formatLocalDateTime(order.created_at)}`}>
      {wide ? (
        <View style={styles.columns}>
          <View style={styles.main}>{status}{problem}{details}</View>
          {summary}
        </View>
      ) : (
        <View style={styles.main}>{status}{problem}{summary}{details}</View>
      )}
    </Page>
  );
}

function Page({ onBack, subtitle, children }: { onBack: () => void; subtitle?: string; children: React.ReactNode }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.inner}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back" style={(s: PressState) => [styles.back, s.hovered && styles.backHover]}>
          <Ionicons name="arrow-back" size={16} color={body} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.head}>
          <Text style={styles.h1} accessibilityRole="header">Checkout</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

function StatusCard(props: WebCheckoutProps & { order: DemoOrder }) {
  const { order, linkExpired } = props;
  const copy = linkExpired
    ? { title: 'This checkout link has expired', text: 'Start a new order from the course page to enrol.' }
    : order.status === 'paid'
      ? { title: "You're enrolled", text: 'Your payment has been verified. The course is now in My learning.' }
      : order.status === 'pending'
        ? order.demo
          ? { title: 'Complete the demo payment', text: 'Historical demo order. No money is collected and no course access is granted.' }
          : { title: 'Complete your payment', text: 'Pay securely to unlock the course. Already charged? Check the payment status instead of paying again.' }
        : order.status === 'demo_completed'
          ? { title: 'Demo payment completed', text: 'No money was collected for this demo order.' }
          : order.status === 'cancelled'
            ? { title: 'This order was cancelled', text: 'Start a new order from the course page if you still want to enrol.' }
            : { title: 'This order was refunded', text: 'Refunds reach your account within 5–7 working days of being issued.' };

  return (
    <View style={[styles.card, styles.cardPad, { gap: 14 }]}>
      <View style={[styles.pill, { backgroundColor: `${props.statusColor}14` }]}>
        <View style={[styles.pillDot, { backgroundColor: props.statusColor }]} />
        <Text style={[styles.pillText, { color: props.statusColor }]}>{props.statusLabel}</Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={styles.h2}>{copy.title}</Text>
        <Text style={styles.bodyText}>{copy.text}</Text>
      </View>
      {props.pending ? (
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={15} color={muted} />
          <Text style={styles.metaText}>Link expires {formatLocalDateTime(order.expires_at)}</Text>
        </View>
      ) : null}
      {order.status === 'paid' && !order.demo && props.onOpenLearning ? (
        <Button label="Start learning" icon="arrow-forward" onPress={props.onOpenLearning} />
      ) : null}
    </View>
  );
}

function PaymentProblem({ failure, message }: { failure: PaymentFailureDiagnosis | null; message: string }) {
  const tips = failure
    ? [failure.suggestion, 'UPI (Google Pay, PhonePe, Paytm) usually has the highest success rate.', 'If your bank debited money, use Check payment status before paying again.']
    : ['If your bank debited money, use Check payment status before paying again.'];
  return (
    <View style={styles.problem} accessibilityRole="alert">
      <View style={styles.problemHead}>
        <Ionicons name="alert-circle" size={20} color={danger} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.problemTitle}>{failure ? failure.title : 'Payment not completed'}</Text>
          <Text style={styles.problemText}>{failure ? failure.message : message}</Text>
        </View>
      </View>
      <View style={styles.problemTips}>
        <Text style={styles.label}>What to try</Text>
        {tips.map((t) => (
          <View key={t} style={styles.tipRow}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryCard(props: WebCheckoutProps & { order: DemoOrder; wide: boolean }) {
  const { order, pending } = props;
  const payLabel = props.paying ? 'Opening secure checkout…' : order.mode === 'test' ? 'Pay securely · TEST' : 'Pay securely';
  return (
    <View style={[styles.card, props.wide && styles.aside]}>
      <View style={[styles.cardPad, { gap: 14 }]}>
        <Text style={styles.label}>Order summary</Text>
        <Text style={styles.summaryCourse}>{order.course_title}</Text>
        <View style={{ gap: 10 }}>
          <Line label="Course fee" value={formatPaise(order.marked_price_paise)} />
          {order.discount_paise > 0 ? <Line label={`Discount (${order.discount_bps / 100}%)`} value={`− ${formatPaise(order.discount_paise)}`} accent /> : null}
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{order.status === 'paid' ? 'Paid' : 'Total'}</Text>
          <Text style={styles.total}>{formatPaise(order.total_paise)}</Text>
        </View>
        <Text style={styles.footnote}>{order.demo ? 'No tax is calculated on demo orders.' : 'Displayed total is the amount payable. Receipt is not a GST tax invoice.'}</Text>

        {pending && !order.demo ? (
          <Button label={payLabel} leadingIcon="lock-closed" onPress={props.onPay} busy={props.paying} block />
        ) : null}
        {pending && order.demo ? (
          <View style={{ gap: 10 }}>
            <Button label="Complete demo payment" icon="card-outline" onPress={props.onCompleteDemo} busy={props.demoBusy} block />
            <Button label="Cancel order" onPress={props.onCancelDemo} disabled={props.demoBusy} variant="outline" block />
          </View>
        ) : null}
      </View>

      <View style={styles.links}>
        {!order.demo && order.status === 'pending' ? (
          <LinkAction icon="refresh" label="Check payment status" onPress={props.onCheckStatus} disabled={props.paying} />
        ) : null}
        <LinkAction
          icon="document-text-outline"
          label={order.demo ? 'Download demo invoice (PDF)' : 'Download order receipt (PDF)'}
          onPress={props.onDownload}
          busy={props.downloading}
        />
      </View>

      {order.demo || order.notice ? (
        <View style={styles.notice}>
          <Ionicons name={order.demo ? 'information-circle-outline' : 'shield-checkmark-outline'} size={15} color={muted} style={{ marginTop: 1 }} />
          <Text style={styles.noticeText}>{order.demo ? 'Historical demo order. No money collected; no course access granted.' : order.notice}</Text>
        </View>
      ) : null}
    </View>
  );
}

function DetailsCard({ order, linkExpired }: { order: DemoOrder; linkExpired: boolean }) {
  const cells: [string, string][] = [
    ['Order ID', order.id.slice(0, 8)],
    ['Placed', formatLocalDateTime(order.created_at)],
    ...(order.status === 'pending' ? [[linkExpired ? 'Link expired' : 'Link expires', formatLocalDateTime(order.expires_at)] as [string, string]] : []),
    ...(order.buyer_email ? [['Receipt sent to', order.buyer_email] as [string, string]] : []),
  ];
  return (
    <View style={styles.card}>
      <View style={[styles.cardPad, { paddingBottom: 0 }]}>
        <Text style={styles.label}>Order details</Text>
      </View>
      <View style={styles.grid}>
        {cells.map(([k, v]) => (
          <View key={k} style={styles.cell}>
            <Text style={styles.cellLabel}>{k}</Text>
            <Text style={styles.cellValue} numberOfLines={1}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, accent && { color: palette.teal700 }]}>{value}</Text>
    </View>
  );
}

function Button({ label, icon, leadingIcon, onPress, busy, disabled, variant = 'primary', block }: {
  label: string; icon?: IconName; leadingIcon?: IconName; onPress: () => void; busy?: boolean; disabled?: boolean; variant?: 'primary' | 'outline'; block?: boolean;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(busy || disabled), busy: !!busy }}
      style={(s: PressState) => [
        styles.btn,
        primary ? styles.btnPrimary : styles.btnOutline,
        !block && { alignSelf: 'flex-start' },
        s.hovered && !(busy || disabled) && (primary ? styles.btnPrimaryHover : styles.btnOutlineHover),
        (busy || disabled) && { opacity: 0.7 },
      ]}
    >
      {busy ? <Spinner size={16} track={primary ? '#2a3654' : palette.slate200} head={primary ? palette.teal400 : palette.teal600} />
        : leadingIcon ? <Ionicons name={leadingIcon} size={14} color={primary ? '#ffffff' : ink} /> : null}
      <Text style={primary ? styles.btnPrimaryText : styles.btnOutlineText}>{label}</Text>
      {!busy && icon ? <Ionicons name={icon} size={16} color={primary ? '#ffffff' : ink} /> : null}
    </Pressable>
  );
}

function LinkAction({ icon, label, onPress, busy, disabled }: { icon: IconName; label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(s: PressState) => [styles.linkAction, s.hovered && styles.linkActionHover, (busy || disabled) && { opacity: 0.6 }]}
    >
      {busy ? <Spinner size={15} track={palette.slate200} head={palette.teal600} /> : <Ionicons name={icon} size={16} color={palette.teal700} />}
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const text = { fontFamily: fonts.body };
const display = { fontFamily: fonts.display };
const mono = { fontFamily: fonts.mono };

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 96 },
  inner: { width: '100%', maxWidth: 1040, alignSelf: 'center', gap: 24 },

  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 6, marginLeft: -6, borderRadius: 6 },
  backHover: { backgroundColor: palette.slate100 },
  backText: { ...text, fontSize: 14, color: body },
  head: { gap: 6, marginTop: -8 },
  h1: { ...display, fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -1, color: ink },
  subtitle: { ...text, fontSize: 14, color: muted },

  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
  main: { flex: 1, minWidth: 0, gap: 16 },
  aside: { width: 360, flexShrink: 0, position: 'sticky' as any, top: 24 },

  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 16, overflow: 'hidden' },
  cardPad: { padding: 24 },
  blank: { paddingVertical: 40, paddingHorizontal: 28, alignItems: 'flex-start', gap: 12 },
  blankIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  blankTitle: { ...display, fontSize: 17, fontWeight: '600', color: ink },

  label: { ...mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: muted },
  h2: { ...display, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4, color: ink },
  bodyText: { ...text, fontSize: 14, lineHeight: 22, color: body, maxWidth: 560 },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', height: 28, paddingHorizontal: 12, borderRadius: 999 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { ...text, fontSize: 13, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...text, fontSize: 13, color: muted },

  problem: { backgroundColor: '#fdf4f2', borderWidth: 1, borderColor: '#f3d3cc', borderRadius: 16, padding: 20, gap: 14 },
  problemHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  problemTitle: { ...display, fontSize: 16, fontWeight: '600', color: '#7a1f12' },
  problemText: { ...text, fontSize: 14, lineHeight: 21, color: '#8a3324' },
  problemTips: { gap: 8, paddingTop: 14, marginLeft: 32, borderTopWidth: 1, borderTopColor: '#f3d3cc' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#c2634f', marginTop: 9 },
  tipText: { ...text, flex: 1, fontSize: 13, lineHeight: 21, color: '#6b2a1e' },

  summaryCourse: { ...display, fontSize: 17, lineHeight: 23, fontWeight: '600', color: ink, marginTop: -4 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lineLabel: { ...text, fontSize: 14, color: body },
  lineValue: { ...text, fontSize: 14, color: ink, fontVariant: ['tabular-nums'] },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14, borderTopWidth: 1, borderTopColor: lineSoft },
  totalLabel: { ...text, fontSize: 15, fontWeight: '600', color: ink },
  total: { ...display, fontSize: 28, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6, color: ink, fontVariant: ['tabular-nums'] },
  footnote: { ...text, fontSize: 12, lineHeight: 18, color: muted, marginTop: -6 },

  links: { borderTopWidth: 1, borderTopColor: lineSoft, paddingVertical: 8, paddingHorizontal: 12 },
  linkAction: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingHorizontal: 12, borderRadius: 8 },
  linkActionHover: { backgroundColor: palette.slate100 },
  linkText: { ...text, fontSize: 14, fontWeight: '500', color: palette.teal700 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 14, paddingHorizontal: 24, backgroundColor: palette.slate50, borderTopWidth: 1, borderTopColor: lineSoft },
  noticeText: { ...text, flex: 1, fontSize: 12, lineHeight: 18, color: body },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 12 },
  cell: { flexGrow: 1, flexBasis: 200, paddingVertical: 12, paddingHorizontal: 12, gap: 4 },
  cellLabel: { ...text, fontSize: 12, color: muted },
  cellValue: { ...text, fontSize: 14, color: ink },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, paddingHorizontal: 20, borderRadius: 10 },
  btnPrimary: { backgroundColor: palette.navy800 },
  btnPrimaryHover: { backgroundColor: palette.navy700 },
  btnPrimaryText: { ...text, fontSize: 15, fontWeight: '600', color: '#ffffff' },
  btnOutline: { borderWidth: 1, borderColor: line, backgroundColor: '#ffffff' },
  btnOutlineHover: { borderColor: palette.slate300, backgroundColor: palette.slate50 },
  btnOutlineText: { ...text, fontSize: 15, fontWeight: '600', color: ink },
});
