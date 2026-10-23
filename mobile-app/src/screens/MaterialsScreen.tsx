// Materials Screen
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { useMaterials } from '@/hooks/useMaterials';
import { MaterialItem } from '@/components/MaterialItem';
import { Material } from '@/types/material';
import { api } from '@/services/api';
import { colors, spacing } from '@/theme/colors';

interface MaterialsScreenProps {
  eventId: string;
  onBack: () => void;
}

export function MaterialsScreen({ eventId, onBack }: MaterialsScreenProps) {
  const { data: materialsData, isLoading, refetch, isRefetching } = useMaterials(eventId);
  const [downloading, setDownloading] = React.useState<string | null>(null);

  const materials = Array.isArray(materialsData)
    ? materialsData
    : (materialsData?.materials ?? []);

  const handleDownload = async (material: Material) => {
    setDownloading(material.id);
    try {
      const result = await api.getDownloadUrl(material.id);
      if (result.download_url) {
        Linking.openURL(result.download_url);
      }
    } catch (error: any) {
      if (error.response?.data?.message?.includes('already downloaded')) {
        // Allow viewing even if already tracked
        if (material.file_url) {
          Linking.openURL(material.file_url);
        }
      } else {
        Alert.alert('Error', 'Failed to download material');
      }
    }
    setDownloading(null);
  };

  const renderMaterial = ({ item }: { item: Material }) => (
    <MaterialItem 
      material={item} 
      onDownload={handleDownload}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>📚 Materials</Text>
        <Text style={styles.subtitle}>
          {materials.length} resource{materials.length !== 1 ? 's' : ''} available
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading materials...</Text>
        </View>
      ) : (
        <FlatList
          data={materials}
          renderItem={renderMaterial}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>No materials available</Text>
              <Text style={styles.emptySubtext}>
                The instructor hasn't uploaded any materials yet
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
    padding: spacing.xl,
    paddingBottom: spacing.sm,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
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
    textAlign: 'center',
  },
});
