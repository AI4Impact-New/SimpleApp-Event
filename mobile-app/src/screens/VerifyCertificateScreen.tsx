// Verify Certificate Screen – public check (no login); shows valid/revoked without email or PDF access
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ensureCameraPermission } from '@/utils/cameraPermission';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/services/api';
import { apiErrorMessage } from '@/services/apiErrors';
import type { CertificateVerification } from '@/types/learning';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { formatLocalDate } from '@/utils/datetime';

interface VerifyCertificateScreenProps {
  onBack: () => void;
  initialId?: string;
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function VerifyCertificateScreen({ onBack, initialId }: VerifyCertificateScreenProps) {
  const [input, setInput] = useState(initialId ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertificateVerification | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const verify = async (raw: string = input) => {
    // Accept a bare ID, a pasted verification link or a scanned QR payload containing one
    const id = raw.match(UUID_RE)?.[0];
    setResult(null);
    setMessage(null);
    if (!id) {
      setMessage('Enter a valid certificate ID.');
      return;
    }
    setLoading(true);
    try {
      setResult(await api.verifyCertificate(id));
    } catch (err: any) {
      setMessage(err?.response?.status === 404 ? 'No certificate found with this ID.' : apiErrorMessage(err, 'Could not verify the certificate.'));
    } finally {
      setLoading(false);
    }
  };

  // Opened from "My certificates" with an ID: verify straight away.
  useEffect(() => {
    if (initialId) verify(initialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startScan = async () => {
    if (await ensureCameraPermission(permission, requestPermission)) setScanning(true);
  };

  const handleScanned = ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);
    if (!UUID_RE.test(data)) {
      setResult(null);
      setMessage('This QR code is not an AI4Impact certificate.');
      return;
    }
    setInput(data.match(UUID_RE)![0]);
    verify(data);
  };

  if (scanning) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <ScreenHeader title="Scan certificate QR" onBack={() => setScanning(false)} />
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScanned}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Verify a certificate" onBack={onBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Certificate ID or verification link</Text>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="e.g. 3f2b…-…"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => verify()}
            returnKeyType="search"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={() => verify()} disabled={loading} activeOpacity={0.75}>
            {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.btnText}>Verify</Text>}
          </TouchableOpacity>
          {Platform.OS !== 'web' ? (
            <TouchableOpacity style={styles.scanBtn} onPress={startScan} disabled={loading} activeOpacity={0.75}>
              <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
              <Text style={styles.scanBtnText}>Scan certificate QR code</Text>
            </TouchableOpacity>
          ) : null}

          {message ? <Text style={styles.error}>{message}</Text> : null}

          {result ? (
            result.valid ? (
              <View style={[styles.card, styles.validCard]}>
                <View style={styles.cardHead}>
                  <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                  <Text style={[styles.cardTitle, { color: colors.success }]}>Valid certificate</Text>
                </View>
                {result.recipient_name ? <Field label="Awarded to" value={result.recipient_name} /> : null}
                {result.course_title ? <Field label="Course" value={result.course_title} /> : null}
                {result.provider ? <Field label="Provider" value={result.provider} /> : null}
                {result.issued_at ? <Field label="Issued" value={formatLocalDate(result.issued_at)} /> : null}
                <Field label="Certificate ID" value={result.id} />
              </View>
            ) : (
              <View style={[styles.card, styles.revokedCard]}>
                <View style={styles.cardHead}>
                  <Ionicons name="close-circle" size={28} color={colors.error} />
                  <Text style={[styles.cardTitle, { color: colors.error }]}>
                    {result.reason === 'revoked' ? 'Certificate revoked' : 'Not valid'}
                  </Text>
                </View>
                <Field label="Certificate ID" value={result.id} />
              </View>
            )
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} selectable>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.backgroundCard,
  },
  btn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
  },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  scanBtnText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  error: { fontSize: 14, color: colors.error },
  card: { borderRadius: borderRadius.xl, borderWidth: 1, padding: spacing.lg },
  validCard: { backgroundColor: colors.successBg, borderColor: colors.successMuted },
  revokedCard: { backgroundColor: colors.errorBg, borderColor: colors.error },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  fieldLabel: { fontSize: 12, color: colors.textSecondary },
  fieldValue: { fontSize: 15, color: colors.text },
});
