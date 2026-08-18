import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  AppState,
  Platform,
  StyleSheet,
} from 'react-native';
import {
  isAndroid11OrHigher,
  checkAllFilesAccessPermission,
  checkLegacyStoragePermission,
  requestLegacyStoragePermission,
  openManageAllFilesAccessSettings,
} from '../services/permissionService';

/**
 * PermissionScreen Component
 * Handles real-time Android storage permissions, version branching, AppState lifecycle tracking,
 * Google Play Prominent Disclosure, and dynamic button enablement.
 */
const PermissionScreen = ({ navigation }) => {
  // 1. State Management for permissions
  const [isStorageGranted, setIsStorageGranted] = useState(false);
  const [isAllFilesAccessGranted, setIsAllFilesAccessGranted] = useState(false);
  const [isTestingBypassed, setIsTestingBypassed] = useState(false);

  const isAndroid11 = isAndroid11OrHigher();

  // Evaluates whether required permissions are satisfied based on Android version or test bypass
  const hasRequiredPermissions = isTestingBypassed || (
    isAndroid11 ? isAllFilesAccessGranted : isStorageGranted
  );

  // 2. Real-time Permission Verification Function
  const verifyPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setIsStorageGranted(true);
      setIsAllFilesAccessGranted(true);
      return;
    }

    if (isAndroid11) {
      const allFilesGranted = await checkAllFilesAccessPermission();
      setIsAllFilesAccessGranted(allFilesGranted);
    } else {
      const legacyGranted = await checkLegacyStoragePermission();
      setIsStorageGranted(legacyGranted);
    }
  }, [isAndroid11]);

  // 3. AppState Listener for Real-Time Lifecycle Verification (Android 11+ return from settings)
  useEffect(() => {
    // Initial verification on screen mount
    verifyPermissions();

    // Subscribe to AppState changes (detect when user returns from Settings page back to active app)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        verifyPermissions();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [verifyPermissions]);

  // 4. Permission Trigger Handlers
  const handleGrantPermissionPress = async () => {
    if (isAndroid11) {
      // Android 11+ (API 30+): Send user to native Settings page via Intent
      await openManageAllFilesAccessSettings();
    } else {
      // Android 10 & below: Request READ_EXTERNAL_STORAGE and WRITE_EXTERNAL_STORAGE OS popup
      const granted = await requestLegacyStoragePermission();
      setIsStorageGranted(granted);
    }
  };

  const handleContinue = () => {
    if (hasRequiredPermissions) {
      navigation.replace('Onboarding1');
    }
  };

  const handleBypassForTesting = () => {
    setIsTestingBypassed(true);
    setIsStorageGranted(true);
    setIsAllFilesAccessGranted(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storage Access Permission</Text>

      {/* Prominent Disclosure (Google Play Compliance) */}
      <View style={styles.disclosureBox}>
        <Text style={styles.disclosureTitle}>Prominent Disclosure</Text>
        <Text style={styles.disclosureText}>
          This app requires All Files Access to automatically scan, list, and manage all TIFF files across your device storage.
        </Text>
      </View>

      {/* Android Version & Status Information */}
      <View style={styles.statusBox}>
        <Text>Android Version: {Platform.OS === 'android' ? `API ${Platform.Version}` : 'Non-Android'}</Text>
        <Text>
          Target Permission: {isAndroid11 ? 'MANAGE_EXTERNAL_STORAGE (All Files Access)' : 'READ & WRITE Storage Permissions'}
        </Text>
        <Text>
          Permission Status: {hasRequiredPermissions ? 'GRANTED' : 'NOT GRANTED'}
        </Text>
      </View>

      {/* Grant Permission Trigger Button */}
      {!hasRequiredPermissions && (
        <TouchableOpacity
          style={styles.grantButton}
          onPress={handleGrantPermissionPress}
        >
          <Text style={styles.buttonText}>
            {isAndroid11 ? 'Grant All Files Access' : 'Grant Storage Permission'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Dynamic Continue Button (Disabled until permissions evaluate to true) */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          !hasRequiredPermissions && styles.disabledButton,
        ]}
        disabled={!hasRequiredPermissions}
        onPress={handleContinue}
      >
        <Text style={styles.buttonText}>Acknowledge & Continue</Text>
      </TouchableOpacity>

      {/* Test Environment Bypass Button */}
      <View style={styles.bypassSection}>
        <Button
          title="Bypass Permission (Testing Environment)"
          onPress={handleBypassForTesting}
          color="#666666"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  disclosureBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#cccccc',
    marginBottom: 16,
  },
  disclosureTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  disclosureText: {
    fontSize: 14,
  },
  statusBox: {
    marginBottom: 16,
  },
  grantButton: {
    padding: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginBottom: 12,
  },
  continueButton: {
    padding: 12,
    backgroundColor: '#28A745',
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#AAAAAA',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  bypassSection: {
    marginTop: 12,
  },
});

export default PermissionScreen;
