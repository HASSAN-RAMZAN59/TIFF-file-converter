import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  AppState,
  Platform,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  checkOsStoragePermission,
  requestOsStoragePermissionDialog,
} from '../services/permissionService';
import { hasCompletedOnboarding } from '../services/onboardingService';

/**
 * PermissionScreen Component
 * Clean Black & White Aesthetic with Bypass Option for Testing
 */
const PermissionScreen = ({ navigation }) => {
  const [isGranted, setIsGranted] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);

  const verifyPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setIsGranted(true);
      return;
    }
    const granted = await checkOsStoragePermission();
    setIsGranted(granted);
  }, []);

  useEffect(() => {
    verifyPermission();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        verifyPermission();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [verifyPermission]);

  const handleGrantPermission = async () => {
    const granted = await requestOsStoragePermissionDialog();
    setIsGranted(granted);
  };

  const navigateNext = async () => {
    const onboardingDone = await hasCompletedOnboarding();
    if (onboardingDone) {
      navigation.replace('MainApp');
    } else {
      navigation.replace('Onboarding');
    }
  };

  const handleBypassPermission = async () => {
    setIsBypassed(true);
    await navigateNext();
  };

  const handleContinue = async () => {
    if (isGranted || isBypassed) {
      await navigateNext();
    }
  };

  const isAllowed = isGranted || isBypassed;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>📁</Text>
          </View>
          <Text style={styles.title}>Storage Permission</Text>
          <Text style={styles.description}>
            Allow storage access to scan, view, and convert TIFF image files on your phone.
          </Text>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Permission Status</Text>
          <View style={[styles.statusBadge, isAllowed ? styles.grantedBadge : styles.pendingBadge]}>
            <Text style={[styles.statusBadgeText, isAllowed ? styles.grantedBadgeText : styles.pendingBadgeText]}>
              {isAllowed ? '✓ Allowed' : '● Required'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!isAllowed ? (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleGrantPermission}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Grant Storage Permission</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bypassButton}
                onPress={handleBypassPermission}
                activeOpacity={0.85}
              >
                <Text style={styles.bypassButtonText}>Bypass Permission (Testing)</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleContinue}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 34,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#999999',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  statusCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222222',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  grantedBadge: {
    backgroundColor: '#FFFFFF',
  },
  pendingBadge: {
    backgroundColor: '#222222',
  },
  statusBadgeText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  grantedBadgeText: {
    color: '#000000',
  },
  pendingBadgeText: {
    color: '#888888',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  bypassButton: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bypassButtonText: {
    color: '#888888',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
  },
});

export default PermissionScreen;
