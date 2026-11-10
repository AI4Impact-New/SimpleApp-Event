// Verified Razorpay checkout and historical demo quotes.
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/services/api';
import { useDemoOrder, useFinishDemoCheckout } from '@/hooks/useBilling';
import { apiErrorMessage } from '@/services/apiErrors';
import type { DemoCheckoutAction } from '@/types/billing';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { formatLocalDateTime } from '@/utils/datetime';
import { formatPaise } from '@/utils/money';
import { isOrderLinkExpired, orderStatusDisplay } from '@/utils/billing';
import { openRazorpay } from '@/utils/razorpay';
import { useQueryClient } from '@tanstack/react-query';
import { downloadAndSharePdf } from '@/utils/sharePdf';

interface CheckoutScreenProps {
  orderId: string;
  onBack: () => void;
  onOpenLearning?: (courseId: string) => void;
}

export function CheckoutScreen({ orderId, onBack, onOpenLearning }: CheckoutScreenProps) {
  const { data: order, isLoading, error, refetch, isRefetching } = useDemoOrder(orderId);
  const finish = useFinishDemoCheckout();
  const [downloading, setDownloading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const queryClient = useQueryClient();
  const refreshPayment = async () => {
    const updated = await api.reconcilePayment(orderId);
    if (updated?.status === 'paid') setPaymentError('');
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    await queryClient.invalidateQueries({ queryKey: ['learning'] });
    await queryClient.invalidateQueries({ queryKey: ['courses'] });
  };
  const pay = async () => {
    if (!order || paying) return;
    setPaying(true);
    setPaymentError('');
    try {
      if (Platform.OS !== 'web') { await Linking.openURL(order.checkout_url); return; }
      const prepared = await api.preparePayment(orderId);
      if (prepared.checkout) {
        let failureDesc = '';
        const result = await openRazorpay({
          ...prepared.checkout,
          onFailure: (failure) => {
            failureDesc = failure.description || 'Payment was declined by your bank or provider.';
          },
        });
        if (result) {
          const verifiedOrder = await api.verifyPayment(orderId, result);
          if (verifiedOrder?.status === 'paid') setPaymentError('');
        } else if (failureDesc) {
          setPaymentError(failureDesc);
          notify('Payment declined', failureDesc);
        }
      }
      await refreshPayment();
    } catch (error) {
      const msg = apiErrorMessage(error, 'Could not confirm payment. Use Check payment status before retrying.');
      setPaymentError(msg);
      notify('Payment status', msg);
      await refetch();
    } finally { setPaying(false); }
  };


  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const runAction = async (action: DemoCheckoutAction) => {
    try {
      await finish.mutateAsync({ orderId, action });
    } catch (err: any) {
      const status = err?.response?.status;
      if (!err?.response) {
        // The request may or may not have reached the server: check the order before trying again.
        const retry = async () => {
          const latest = (await refetch()).data;
          if (latest && latest.status === 'pending') await runAction(action);
        };
        if (Platform.OS === 'web') {
          if (window.confirm('Connection problem. We could not confirm the order status. Check it and retry?')) void retry();
        } else {
          Alert.alert('Connection problem', 'We could not confirm the order status. Retry checks the current order first.', [
            { text: 'Retry', onPress: () => void retry() },
            { text: 'Not now', style: 'cancel' },
          ]);
        }
        return;
      }
      if (status === 410) notify('Link expired', 'This checkout link has expired. Start a new order from the course page.');
      else if (status === 409) notify('Order finalised', apiErrorMessage(err, 'This order is already finalised.'));
      else notify('Checkout failed', apiErrorMessage(err, 'Could not update this order.'));
      refetch();
    }
  };

  const confirmCancel = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Cancel this demo order?')) void runAction('cancel');
      return;
    }
    Alert.alert('Cancel order?', 'This demo order will be cancelled.', [
      { text: 'Keep order', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: () => runAction('cancel') },
    ]);
  };

  const downloadInvoice = async () => {
    setDownloading(true);
    try {
      const { url, headers } = await api.getInvoiceRequest(orderId);
      await downloadAndSharePdf({
        url,
        headers,
        fileName: `AI4Impact-order-${orderId}.pdf`,
        dialogTitle: 'Order receipt',
      });
    } catch (err: any) {
      const status = err?.response?.status;
      notify(
        'Download failed',
        status === 403 || status === 404
          ? 'This invoice is not available.'
          : status === 409
            ? 'An invoice is only available for a completed demo order.'
            : apiErrorMessage(err, 'The invoice could not be downloaded. Please retry.')
      );
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Checkout" onBack={onBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    const status = (error as any)?.response?.status;
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Checkout" onBack={onBack} />
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {status === 404 || status === 403 ? 'This order is unavailable.' : apiErrorMessage(error, 'Failed to load order.')}
          </Text>
          {status !== 404 && status !== 403 ? (
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={styles.link}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const linkExpired = isOrderLinkExpired(order);
  const pending = order.status === 'pending' && !linkExpired;
  const statusDisplay = orderStatusDisplay(order);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Checkout" onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.demoBanner}>
          <Ionicons name="information-circle" size={20} color="#92400e" />
          <Text style={styles.demoText}>
            {order.demo ? 'Historical demo order. No money collected; no course access granted.' : order.notice}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.courseTitle}>{order.course_title}</Text>
          <Text style={styles.muted}>Order {order.id.slice(0, 8)} · {formatLocalDateTime(order.created_at)}</Text>

          <View style={styles.divider} />
          <Row label="Marked price" value={formatPaise(order.marked_price_paise)} />
          {order.discount_paise > 0 ? (
            <Row label={`Discount (${order.discount_bps / 100}%)`} value={`− ${formatPaise(order.discount_paise)}`} />
          ) : null}
          <View style={styles.divider} />
          <Row label="Total" value={formatPaise(order.total_paise)} bold />
          <Text style={styles.muted}>{order.demo ? 'No tax is calculated on demo orders.' : 'Displayed total is the amount payable. Receipt is not a GST tax invoice.'}</Text>
        </View>

        <View style={[styles.card, order.status === 'paid' && { borderColor: colors.success, borderWidth: 1 }]}>
          <Ionicons name={order.status === 'paid' ? 'checkmark-circle' : 'shield-checkmark-outline'} size={26} color={order.status === 'paid' ? colors.success : colors.primary} />
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.status, { color: statusDisplay.color }]}>{statusDisplay.label}</Text>
          {!order.demo && order.status === 'paid' ? <Text style={styles.muted}>Your payment has been verified. Your course is available in My learning.</Text> : null}
          {!order.demo && order.status === 'pending' ? <Text style={styles.muted}>Click "Pay with Razorpay" below to complete your enrollment. If you were already charged, use Check payment status.</Text> : null}
          {order.status === 'pending' ? (
            <Text style={styles.muted}>
              {linkExpired ? 'Expired' : 'Link expires'} {formatLocalDateTime(order.expires_at)}
            </Text>
          ) : null}
        </View>

        {paymentError && order.status !== 'paid' ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorBannerTitle}>Payment not completed</Text>
              <Text style={styles.errorBannerText}>{paymentError}</Text>
            </View>
          </View>
        ) : null}

        {order.status === 'paid' && !order.demo && onOpenLearning ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.success }]}
            onPress={() => onOpenLearning(order.course_id)}
            activeOpacity={0.8}
          >
            <Ionicons name="school-outline" size={20} color={colors.white} />
            <Text style={styles.primaryText}>Start Learning Now</Text>
          </TouchableOpacity>
        ) : null}

        {pending && order.demo ? (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, finish.isPending && styles.disabled]}
              onPress={() => runAction('complete_demo')}
              disabled={finish.isPending}
              activeOpacity={0.75}
            >
              {finish.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="card-outline" size={20} color={colors.white} />
                  <Text style={styles.primaryText}>Complete demo payment</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={confirmCancel} disabled={finish.isPending} activeOpacity={0.75}>
              <Text style={styles.secondaryText}>Cancel order</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {!order.demo && pending ? <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} disabled={paying} onPress={() => void pay()}>
          <Text style={styles.primaryText}>{paying ? 'Opening secure checkout…' : order.mode === 'test' ? 'Pay with Razorpay · TEST' : 'Pay with Razorpay'}</Text>
        </TouchableOpacity> : null}
        {!order.demo && order.status === 'pending' ? <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} disabled={paying} onPress={() => void refreshPayment().catch(e => notify('Payment status', apiErrorMessage(e, 'Please retry checking payment.')))}>
          <Text style={styles.secondaryText}>Check payment status</Text>
        </TouchableOpacity> : null}
        <TouchableOpacity style={styles.secondaryBtn} onPress={downloadInvoice} disabled={downloading} activeOpacity={0.75}>
          {downloading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={styles.secondaryText}>{order.demo ? 'Download demo invoice (PDF)' : 'Download order receipt (PDF)'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  errorText: { fontSize: 15, color: colors.error, textAlign: 'center' },
  link: { fontSize: 15, fontWeight: '600', color: colors.primary },
  content: { padding: spacing.lg, gap: spacing.md },
  demoBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: '#fef3c7',
  },
  demoText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18 },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  courseTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 15, color: colors.textSecondary },
  rowValue: { fontSize: 15, color: colors.text },
  bold: { fontWeight: '700', color: colors.text },
  label: { fontSize: 13, color: colors.textSecondary },
  status: { fontSize: 16, fontWeight: '600', color: colors.text },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
  },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundCard,
  },
  secondaryText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  errorBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#991b1b',
    marginTop: 2,
    lineHeight: 18,
  },
});
