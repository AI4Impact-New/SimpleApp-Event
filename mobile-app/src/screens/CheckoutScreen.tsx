// Checkout Screen – demo / pro forma order: saved quote, demo completion or cancellation, invoice PDF
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
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
import { downloadAndSharePdf } from '@/utils/sharePdf';

interface CheckoutScreenProps {
  orderId: string;
  onBack: () => void;
}

export function CheckoutScreen({ orderId, onBack }: CheckoutScreenProps) {
  const { data: order, isLoading, error, refetch, isRefetching } = useDemoOrder(orderId);
  const finish = useFinishDemoCheckout();
  const [downloading, setDownloading] = useState(false);


  const runAction = async (action: DemoCheckoutAction) => {
    try {
      await finish.mutateAsync({ orderId, action });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 410) Alert.alert('Link expired', 'This checkout link has expired. Start a new order from the course page.');
      else if (status === 409) Alert.alert('Order finalised', apiErrorMessage(err, 'This order is already finalised.'));
      else Alert.alert('Checkout failed', apiErrorMessage(err, 'Could not update this order.'));
      refetch();
    }
  };

  const confirmCancel = () =>
    Alert.alert('Cancel order?', 'This demo order will be cancelled.', [
      { text: 'Keep order', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: () => runAction('cancel') },
    ]);

  const downloadInvoice = async () => {
    setDownloading(true);
    try {
      const { url, headers } = await api.getInvoiceRequest(orderId);
      await downloadAndSharePdf({
        url,
        headers,
        fileName: `AI4Impact-demo-invoice-${orderId}.pdf`,
        dialogTitle: 'Demo invoice',
      });
    } catch {
      Alert.alert('Download failed', 'The invoice could not be downloaded. Please retry.');
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
            DEMO / PRO FORMA. No money is collected and this does not grant course access. Use Register on the course page to enrol.
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
          <Text style={styles.muted}>No tax is calculated on demo orders.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.status, { color: statusDisplay.color }]}>{statusDisplay.label}</Text>
          {order.status === 'pending' ? (
            <Text style={styles.muted}>
              {linkExpired ? 'Expired' : 'Link expires'} {formatLocalDateTime(order.expires_at)}
            </Text>
          ) : null}
        </View>

        {pending ? (
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

        <TouchableOpacity style={styles.secondaryBtn} onPress={downloadInvoice} disabled={downloading} activeOpacity={0.75}>
          {downloading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={styles.secondaryText}>Download demo invoice (PDF)</Text>
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
});
