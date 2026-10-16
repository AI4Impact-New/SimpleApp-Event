// Purchases Screen – own demo order history (latest 200)
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useMyPurchases } from '@/hooks/useBilling';
import { apiErrorMessage } from '@/services/apiErrors';
import type { DemoOrder } from '@/types/billing';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { formatLocalDate } from '@/utils/datetime';
import { formatPaise } from '@/utils/money';
import { orderStatusDisplay } from '@/utils/billing';

interface PurchasesScreenProps {
  onBack: () => void;
  onOpenOrder: (orderId: string) => void;
}

export function PurchasesScreen({ onBack, onOpenOrder }: PurchasesScreenProps) {
  const { data: orders = [], isLoading, error, refetch, isRefetching } = useMyPurchases();

  const renderItem = ({ item }: { item: DemoOrder }) => {
    const status = orderStatusDisplay(item);
    return (
      <TouchableOpacity style={styles.card} onPress={() => onOpenOrder(item.id)} activeOpacity={0.7}>
        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={2}>{item.course_title}</Text>
          <Text style={styles.muted}>{formatLocalDate(item.created_at)} · {formatPaise(item.total_paise)}</Text>
          <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Purchases (demo)" onBack={onBack} />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{apiErrorMessage(error, 'Failed to load purchases')}</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.link}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={orders.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListHeaderComponent={
            orders.length > 0 ? (
              <Text style={styles.notice}>Demo orders only. No money was collected.</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No purchases yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  errorText: { fontSize: 15, color: colors.error, textAlign: 'center' },
  link: { fontSize: 15, fontWeight: '600', color: colors.primary },
  list: { padding: spacing.lg },
  emptyList: { flexGrow: 1 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  notice: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
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
  cardBody: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  muted: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  status: { fontSize: 13, fontWeight: '600', marginTop: 4 },
});
