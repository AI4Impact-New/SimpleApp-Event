// Certificates Screen – issued certificates; download the PDF locally and open the native share sheet
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/services/api';
import { useMyCertificates } from '@/hooks/useLearning';
import { apiErrorMessage } from '@/services/apiErrors';
import type { MyCertificate } from '@/types/learning';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { formatLocalDate } from '@/utils/datetime';
import { downloadAndSharePdf } from '@/utils/sharePdf';

interface CertificatesScreenProps {
  onBack: () => void;
  onVerify: (certificateId?: string) => void;
}

export function CertificatesScreen({ onBack, onVerify }: CertificatesScreenProps) {
  const queryClient = useQueryClient();
  const { data: certificates = [], isLoading, error, refetch, isRefetching } = useMyCertificates();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadAndShare = async (cert: MyCertificate) => {
    setDownloadingId(cert.id);
    try {
      // Five-minute signed URL; fetch it right before downloading
      const { url } = await api.getCertificateDownload(cert.id);
      await downloadAndSharePdf({
        url,
        fileName: `certificate-${cert.id}.pdf`,
        dialogTitle: cert.course_title ?? 'Certificate',
      });
    } catch (err: any) {
      if (err?.response?.status === 410) {
        Alert.alert('Certificate revoked', 'This certificate has been revoked and can no longer be downloaded.');
        queryClient.invalidateQueries({ queryKey: ['me', 'certificates'] });
      } else {
        Alert.alert('Download failed', apiErrorMessage(err, 'Could not download the certificate.'));
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const renderItem = ({ item }: { item: MyCertificate }) => {
    const revoked = !!item.revoked_at;
    const busy = downloadingId === item.id;
    return (
      <View style={styles.card}>
        <Ionicons name="ribbon" size={32} color={revoked ? colors.textMuted : colors.primary} />
        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={2}>{item.course_title ?? 'Course certificate'}</Text>
          <Text style={styles.muted}>Issued {formatLocalDate(item.issued_at)}</Text>
          {item.provider ? <Text style={styles.muted}>{item.provider}</Text> : null}
          <Text style={styles.certId} selectable>ID: {item.id}</Text>
          {revoked ? <Text style={styles.revoked}>Revoked</Text> : null}
          <TouchableOpacity onPress={() => onVerify(item.id)} accessibilityRole="button">
            <Text style={styles.link}>Verify</Text>
          </TouchableOpacity>
        </View>
        {!revoked ? (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => downloadAndShare(item)}
            disabled={busy}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Download and share ${item.course_title ?? 'certificate'} PDF`}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="share-outline" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="My certificates"
        onBack={onBack}
        right={
          <TouchableOpacity
            onPress={() => onVerify()}
            style={styles.headerBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Verify a certificate"
          >
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load certificates</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.link}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={certificates}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={certificates.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="ribbon-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No certificates yet</Text>
              <Text style={styles.muted}>Complete a course to earn its certificate.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  certId: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 15,
    color: colors.error,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  list: {
    padding: spacing.lg,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  revoked: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
    marginTop: 2,
  },
  headerBtn: {
    padding: spacing.sm,
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
