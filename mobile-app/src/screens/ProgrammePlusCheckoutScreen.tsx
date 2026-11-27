// Programme+ registration checkout connected to Razorpay add-on orders.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Linking, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from '@/components/SafeAreaView';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LearnerIdCard } from '@/components/LearnerIdCard';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useMyLearning } from '@/hooks/useLearning';
import { useMyPurchases, useCreateProgrammePlusOrder } from '@/hooks/useBilling';
import { api } from '@/services/api';
import { apiErrorMessage } from '@/services/apiErrors';
import type { DemoOrder } from '@/types/billing';
import { isOrderLinkExpired } from '@/utils/billing';
import { formatPaise } from '@/utils/money';
import { openRazorpay, formatPaymentFailure, type PaymentFailureDiagnosis } from '@/utils/razorpay';
import { downloadAndSharePdf } from '@/utils/sharePdf';
import { uuidv4 } from '@/utils/uuid';
import { colors, fonts, palette } from '@/theme/colors';
import { useWebButtons } from '@/theme/webButtons';
import { PROGRAMME_PLUS_MODULES, openProgrammePlusSite } from '@/screens/ProgrammePlusScreen';

export const PROGRAMME_PLUS_PRICE = '₹24,999';

type PressState = { pressed: boolean; hovered?: boolean };

export function ProgrammePlusCheckoutScreen({
  onBack,
  onOpenCourses,
}: {
  onBack: () => void;
  onOpenCourses?: () => void;
}) {
  const { fitButton, wide } = useWebButtons();
  const profile = useMyProfile();
  const learning = useMyLearning();
  const purchases = useMyPurchases();
  const createOrder = useCreateProgrammePlusOrder();
  const queryClient = useQueryClient();

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeOrder, setActiveOrder] = useState<DemoOrder | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentFailure, setPaymentFailure] = useState<PaymentFailureDiagnosis | null>(null);
  const requestIdRef = useRef<string | null>(null);

  const enrolledCourses = learning.data ?? [];
  const defaultCourse = enrolledCourses.find((c) => c.registration_status !== 'completed') ?? enrolledCourses[0];
  const course = (selectedCourseId ? enrolledCourses.find((c) => c.id === selectedCourseId) : undefined) ?? defaultCourse;

  const existingOrder = useMemo(() => {
    if (!course) return undefined;
    const matches = (purchases.data ?? []).filter(
      (o) => !o.demo && o.product_type === 'programme_plus' && o.course_id === course.id
    );
    return (
      matches.find((o) => o.status === 'paid' || o.status === 'partially_refunded') ??
      matches.find((o) => o.status === 'pending' && !isOrderLinkExpired(o))
    );
  }, [course, purchases.data]);

  const order = activeOrder ?? existingOrder ?? null;
  const isPaid = order?.status === 'paid' || order?.status === 'partially_refunded';
  const displayPrice = order ? formatPaise(order.total_paise) : PROGRAMME_PLUS_PRICE;

  const clearUrlFailureState = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('payment_status')) {
        url.searchParams.delete('payment_status');
        url.searchParams.delete('reason');
        url.searchParams.delete('error_desc');
        url.searchParams.delete('order');
        window.history.replaceState({}, '', url.toString());
      }
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment_status') === 'failed') {
        const reason = params.get('reason') || '';
        const desc = params.get('error_desc') || '';
        setPaymentFailure(
          formatPaymentFailure({
            description: desc || (reason === 'insufficient_funds' ? 'Insufficient balance in bank account' : ''),
            reason: reason || undefined,
          })
        );
      }
    }
  }, []);

  const syncOrder = async (oid: string) => {
    const updated = await api.reconcilePayment(oid);
    setActiveOrder(updated);
    if (updated?.status === 'paid' || updated?.status === 'partially_refunded') {
      setPaymentError('');
      setPaymentFailure(null);
      clearUrlFailureState();
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['me', 'purchases'] }),
      queryClient.invalidateQueries({ queryKey: ['programme'] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
      queryClient.invalidateQueries({ queryKey: ['learning'] }),
    ]);
    return updated;
  };

  const handlePay = async () => {
    if (!agreed || !course || paying || isPaid) return;
    setPaying(true);
    setPaymentError('');
    if (!requestIdRef.current) requestIdRef.current = uuidv4();
    try {
      const created = await createOrder.mutateAsync({
        courseId: course.id,
        requestId: requestIdRef.current,
      });
      requestIdRef.current = null;
      setActiveOrder(created);

      if (Platform.OS !== 'web') {
        await Linking.openURL(created.checkout_url);
        return;
      }

      if (created.checkout) {
        let failureInfo: PaymentFailureDiagnosis | null = null;
        const result = await openRazorpay({
          ...created.checkout,
          onFailure: (failure) => {
            failureInfo = formatPaymentFailure(failure);
          },
        });
        const failedInfo = failureInfo as PaymentFailureDiagnosis | null;
        if (result) {
          const verified = await api.verifyPayment(created.id, result);
          setActiveOrder(verified);
          if (verified?.status === 'paid') {
            setPaymentError('');
            setPaymentFailure(null);
            clearUrlFailureState();
          }
        } else if (failedInfo) {
          setPaymentFailure(failedInfo);
          setPaymentError(failedInfo.message);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('payment_status', 'failed');
            url.searchParams.set('reason', failedInfo.reasonCode);
            if (failedInfo.message) url.searchParams.set('error_desc', failedInfo.message);
            url.searchParams.set('order', created.id);
            window.history.replaceState({}, '', url.toString());
          }
        }
      }
      await syncOrder(created.id);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status && status < 500 && status !== 429) requestIdRef.current = null;
      const msg = apiErrorMessage(err, 'Could not start Programme+ checkout. Please retry.');
      setPaymentError(msg);
      if (Platform.OS !== 'web') Alert.alert('Checkout failed', msg);
    } finally {
      setPaying(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!order || checkingStatus) return;
    setCheckingStatus(true);
    setPaymentError('');
    try {
      await syncOrder(order.id);
    } catch (err: any) {
      setPaymentError(apiErrorMessage(err, 'Could not confirm payment status. Please retry.'));
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!order || downloading) return;
    setDownloading(true);
    try {
      const { url, headers } = await api.getInvoiceRequest(order.id);
      await downloadAndSharePdf({
        url,
        headers,
        fileName: `AI4Impact-programme-plus-${order.id}.pdf`,
        dialogTitle: 'Order receipt',
      });
    } catch (err: any) {
      Alert.alert('Download failed', apiErrorMessage(err, 'Could not download receipt. Please retry.'));
    } finally {
      setDownloading(false);
    }
  };

  const canPay = agreed && !!course && !learning.isLoading && !paying && !isPaid;
  const web = Platform.OS === 'web';

  const content = (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Register for Programme+" onBack={onBack} />

      <View style={styles.card}>
        <Text style={styles.label}>Learner</Text>
        <LearnerIdCard name={profile.data?.name} courseTitle={course?.title} />
        {enrolledCourses.length > 1 ? (
          <View style={styles.coursePicker}>
            <Text style={styles.muted}>Select course to attach Programme+:</Text>
            <View style={styles.courseChips}>
              {enrolledCourses.map((c) => {
                const selected = c.id === course?.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      if (selected) return;
                      setSelectedCourseId(c.id);
                      setActiveOrder(null);
                      setPaymentError('');
                      setPaymentFailure(null);
                      requestIdRef.current = null;
                      clearUrlFailureState();
                    }}
                    accessibilityRole="button"
                    style={[styles.courseChip, selected && styles.courseChipActive]}
                  >
                    <Text style={[styles.courseChipText, selected && styles.courseChipTextActive]}>{c.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        {!learning.isLoading && !course ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeBoxText}>
              Programme+ is an add-on to an active course. Enrol in a course first before registering for Programme+.
            </Text>
            {onOpenCourses ? (
              <Pressable onPress={onOpenCourses} accessibilityRole="button" style={styles.link}>
                <Text style={styles.linkText}>Browse courses</Text>
                <Ionicons name="arrow-forward" size={14} color={palette.teal700} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {profile.data?.email ? <Text style={styles.muted}>Receipts and updates go to {profile.data.email}</Text> : null}
      </View>

      <View style={styles.card}>
        <View style={styles.spread}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>Programme+</Text>
            <Text style={styles.muted}>Optional career layer · add-on to your course</Text>
          </View>
          <Text style={styles.price}>{displayPrice}</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.label}>What's included</Text>
        <View style={styles.list}>
          {PROGRAMME_PLUS_MODULES.map((m) => (
            <View key={m.title} style={styles.listRow}>
              <Ionicons name="checkmark-circle" size={18} color={palette.teal600} />
              <Text style={styles.listText}>{m.title}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={openProgrammePlusSite} accessibilityRole="link" style={styles.link}>
          <Text style={styles.linkText}>Full details on ai4impact.in</Text>
          <Ionicons name="open-outline" size={14} color={palette.teal700} />
        </Pressable>
      </View>

      {isPaid ? (
        <View style={[styles.card, styles.successCard]}>
          <View style={styles.statusHeader}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Programme+ is active</Text>
              <Text style={styles.muted}>Your payment has been verified and Programme+ career services are unlocked for {course?.title ?? 'your course'}.</Text>
            </View>
          </View>
          <View style={[styles.actionsRow, wide && { justifyContent: 'flex-start' }]}>
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              style={(s: PressState) => [styles.payBtn, styles.payBtnActive, (s.hovered || s.pressed) && styles.payBtnHover, fitButton]}
            >
              <Text style={[styles.payText, styles.payTextActive]}>Back to Programme+</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </Pressable>
            <Pressable
              onPress={() => void handleDownloadReceipt()}
              disabled={downloading}
              accessibilityRole="button"
              style={[styles.secondaryBtn, fitButton]}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={palette.teal700} />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={16} color={palette.teal700} />
                  <Text style={styles.secondaryBtnText}>Download receipt (PDF)</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.spread}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.total}>{displayPrice}</Text>
          </View>

          {paymentFailure ? (
            <View style={styles.failureCard} accessibilityRole="alert">
              <View style={styles.failureHeader}>
                <Ionicons name="alert-circle" size={20} color="#b4321f" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.failureTitle}>{paymentFailure.title}</Text>
                  <Text style={styles.failureMessage}>{paymentFailure.message}</Text>
                </View>
              </View>
              <View style={styles.failureTipsBox}>
                <Text style={styles.failureTipsTitle}>What to try</Text>
                <Text style={styles.failureTipsItem}>• {paymentFailure.suggestion}</Text>
                <Text style={styles.failureTipsItem}>• UPI (Google Pay, PhonePe, Paytm) usually has the highest success rate.</Text>
                <Text style={styles.failureTipsItem}>• If money was debited by your bank, click "Check payment status" below.</Text>
              </View>
            </View>
          ) : paymentError ? (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={18} color="#b4321f" />
              <Text style={styles.errorBannerText}>{paymentError}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => setAgreed((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            style={styles.checkRow}
          >
            <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={20} color={agreed ? palette.teal600 : palette.slate400} />
            <Text style={styles.checkText}>I understand Programme+ is an optional add-on and agree to the programme terms.</Text>
          </Pressable>

          <Pressable
            onPress={() => void handlePay()}
            disabled={!canPay}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPay, busy: paying }}
            style={(s: PressState) => [
              styles.payBtn,
              canPay && styles.payBtnActive,
              canPay && (s.hovered || s.pressed) && styles.payBtnHover,
              fitButton,
            ]}
          >
            {paying ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="lock-closed" size={16} color={canPay ? colors.white : palette.slate500} />
            )}
            <Text style={[styles.payText, canPay && styles.payTextActive]}>
              {paying
                ? 'Opening secure checkout…'
                : order?.mode === 'test'
                  ? `Pay ${displayPrice} · TEST`
                  : `Pay ${displayPrice}`}
            </Text>
          </Pressable>

          {order && order.status === 'pending' ? (
            <Pressable
              onPress={() => void handleCheckStatus()}
              disabled={checkingStatus || paying}
              accessibilityRole="button"
              style={[styles.link, wide ? { alignSelf: 'flex-start' } : { alignSelf: 'center' }]}
            >
              <Ionicons name="refresh" size={14} color={palette.teal700} />
              <Text style={styles.linkText}>
                {checkingStatus ? 'Checking payment status…' : 'Check payment status'}
              </Text>
            </Pressable>
          ) : null}

          <Text style={[styles.note, wide && { textAlign: 'left' }]}>
            {!learning.isLoading && !course
              ? 'An active course enrolment is required before adding Programme+.'
              : !agreed
                ? 'Confirm the agreement above to proceed to Razorpay checkout.'
                : order?.notice ?? 'Secure payment via Razorpay. Programme+ career services unlock once payment capture is verified.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );

  return web ? content : <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
}

const web = Platform.OS === 'web';
const display = web ? { fontFamily: fonts.display } : {};
const text = web ? { fontFamily: fonts.body } : {};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 72, gap: 16 },
  card: { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: palette.slate200, borderRadius: 16, padding: 20, gap: 12 },
  successCard: { borderColor: colors.success, backgroundColor: '#f0fdf4' },
  statusHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  successTitle: { ...display, fontSize: 18, fontWeight: '700', color: palette.navy850, marginBottom: 4 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  label: { fontFamily: web ? fonts.mono : undefined, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: palette.slate500 },
  muted: { ...text, fontSize: 13, color: palette.slate500, lineHeight: 19 },
  coursePicker: { gap: 8, marginTop: 4 },
  courseChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  courseChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.slate200,
    backgroundColor: colors.background,
  },
  courseChipActive: { borderColor: palette.teal600, backgroundColor: '#f0fdfa' },
  courseChipText: { ...text, fontSize: 13, fontWeight: '500', color: palette.slate600 },
  courseChipTextActive: { color: palette.teal700, fontWeight: '600' },
  noticeBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  noticeBoxText: { ...text, fontSize: 13, color: '#92400e', lineHeight: 19 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  planTitle: { ...display, fontSize: 20, fontWeight: '700', color: palette.navy850 },
  price: { ...display, fontSize: 20, fontWeight: '700', color: palette.navy850 },
  divider: { height: 1, backgroundColor: palette.slate150 },
  list: { gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listText: { ...text, fontSize: 14, color: palette.navy850 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  linkText: { ...text, fontSize: 13, fontWeight: '500', color: palette.teal700 },
  totalLabel: { ...text, fontSize: 15, fontWeight: '600', color: palette.navy850 },
  total: { ...display, fontSize: 26, fontWeight: '700', color: palette.navy850 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkText: { ...text, flex: 1, fontSize: 13, lineHeight: 19, color: palette.slate600 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: palette.slate150,
  },
  payBtnActive: {
    backgroundColor: palette.teal600,
  },
  payBtnHover: {
    backgroundColor: palette.teal700,
  },
  payText: { ...text, fontSize: 15, fontWeight: '600', color: palette.slate500 },
  payTextActive: { color: colors.white },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.teal600,
    backgroundColor: colors.backgroundCard,
  },
  secondaryBtnText: { ...text, fontSize: 14, fontWeight: '600', color: palette.teal700 },
  note: { ...text, fontSize: 12, lineHeight: 18, color: palette.slate500, textAlign: 'center' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorBannerText: { ...text, flex: 1, fontSize: 13, color: '#991b1b', lineHeight: 18 },
  failureCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#feb2b2',
    padding: 14,
    gap: 10,
  },
  failureHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  failureTitle: { ...text, fontSize: 14, fontWeight: '700', color: '#9b1c1c' },
  failureMessage: { ...text, fontSize: 13, color: '#7f1d1d', marginTop: 2, lineHeight: 18 },
  failureTipsBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    gap: 3,
  },
  failureTipsTitle: { ...text, fontSize: 11, fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.5 },
  failureTipsItem: { ...text, fontSize: 12, color: '#7f1d1d', lineHeight: 17 },
});
