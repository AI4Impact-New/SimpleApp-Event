// Events Screen – QR check-in and the public event list
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
import { useEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/EventCard';
import { Event } from '@/types/event';
import { colors, spacing } from '@/theme/colors';

interface EventsScreenProps {
  onEventPress: (event: Event) => void;
  onScanPress: () => void;
  onLeaderboardPress?: () => void;
  onBack?: () => void;
}

export function EventsScreen({ onEventPress, onScanPress, onLeaderboardPress, onBack }: EventsScreenProps) {
  const {
    data: events,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useEvents('global');
  
  const renderEvent = ({ item }: { item: Event }) => (
    <EventCard 
      event={item} 
      onPress={onEventPress} 
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack ? (
            <TouchableOpacity style={styles.profileButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.title}>Events</Text>
        </View>
        {onLeaderboardPress ? (
          <TouchableOpacity style={styles.profileButton} onPress={onLeaderboardPress} activeOpacity={0.7}>
            <Ionicons name="podium-outline" size={26} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* QR-first: primary action */}
      <TouchableOpacity
        style={styles.qrCard}
        onPress={onScanPress}
        activeOpacity={0.85}
      >
        <View style={styles.qrIconWrap}>
          <Ionicons name="qr-code-outline" size={40} color={colors.primary} />
        </View>
        <View style={styles.qrContent}>
          <Text style={styles.qrTitle}>Scan event QR</Text>
          <Text style={styles.qrSubtext}>Scan a QR code at the venue to join an event</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.primary} />
      </TouchableOpacity>

      {/* View available events section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>View available events</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load events</Text>
        </View>
      ) : (
        <FlatList
          data={events || []}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No upcoming events</Text>
              <Text style={styles.emptySubtext}>
                Scan a QR code at an event to join, or check back later
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  profileButton: {
    padding: spacing.xs,
  },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  qrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  qrIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: `${colors.primary}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  qrContent: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  qrSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  list: {
    padding: spacing.xl,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
