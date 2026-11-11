// QR Scanner Screen using expo-camera
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useQueryClient } from '@tanstack/react-query';
import { ensureCameraPermission } from '@/utils/cameraPermission';
import { api } from '@/services/api';
import { colors, spacing } from '@/theme/colors';

interface QRScannerScreenProps {
  onScanSuccess: (eventId: string) => void;
  onBack: () => void;
}

export function QRScannerScreen({ onScanSuccess, onBack }: QRScannerScreenProps) {
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleBarCodeScanned = async (result: { type: string; data: string }) => {
    if (scanned || processing) return;
    
    const { data } = result;

    // Vibrate on scan
    Vibration.vibrate(100);
    
    setScanned(true);
    setProcessing(true);
    let eventId = data;
    
    try {
      // Extract event_id from QR data
      if (data.includes('/join/')) {
        eventId = data.split('/join/').pop() || data;
      } else if (data.includes('/event/')) {
        eventId = data.split('/event/').pop() || data;
      } else if (data.includes('/events/')) {
        eventId = data.split('/events/').pop() || data;
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(eventId)) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not a valid event QR code',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
        setProcessing(false);
        return;
      }
      
      // Try to join the event
      await api.joinEvent(eventId);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      
      Alert.alert(
        'Success',
        'You have joined the event.',
        [{ text: 'OK', onPress: () => onScanSuccess(eventId) }]
      );
      
    } catch (error: any) {
      const msg = error.response?.data?.message ?? error.response?.data?.error ?? '';
      if (msg.includes('already joined') || msg.includes('already checked into')) {
        Alert.alert(
          'Already Joined',
          'You are already attending this event',
          [{ text: 'OK', onPress: () => onScanSuccess(eventId) }]
        );
      } else {
        Alert.alert(
          'Error',
          'Could not join this event. Please try again.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      }
    }
    
    setProcessing(false);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.message}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.message}>
            Camera access is required to scan QR codes.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={() => ensureCameraPermission(permission, requestPermission)}
          >
            <Text style={styles.permissionButtonText}>
              {permission.canAskAgain ? 'Grant Permission' : 'Open Settings'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.backLink}
            onPress={onBack}
          >
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Scan QR Code</Text>
        <Text style={styles.subtitle}>
          Point your camera at the event QR code
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
        {scanned && (
          <TouchableOpacity 
            style={styles.rescanButton}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.rescanText}>Tap to Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.helpText}>
          The QR code is usually displayed on the instructor's screen
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#000',
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  message: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: spacing.lg,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    padding: 10,
  },
  backLinkText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  rescanButton: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  rescanText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(14, 165, 233, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  footer: {
    padding: 24,
    backgroundColor: '#000',
  },
  helpText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
