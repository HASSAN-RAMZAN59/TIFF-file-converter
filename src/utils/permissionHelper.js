import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';

/**
 * Checks if device is Android 13 or higher (API 33+)
 */
export const isAndroid13OrHigher = () => {
  return Platform.OS === 'android' && Platform.Version >= 33;
};

/**
 * 1. Silent / Background Check Function
 * Returns true if permission is already granted, false otherwise.
 */
export const checkMyPermission = async () => {
  if (Platform.OS !== 'android') {
    return true; // Non-Android platforms assumed granted for standard storage/media
  }

  try {
    if (isAndroid13OrHigher()) {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      );
    } else {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
    }
  } catch (error) {
    console.warn('[permissionHelper] Error checking permission:', error);
    return false;
  }
};

/**
 * 2. System Permission Dialogue Request Function
 * Prompts user with native OS dialogue or opens OS Settings if denied/never ask again.
 */
export const requestMyPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    if (isAndroid13OrHigher()) {
      const grantedStatus = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        {
          title: 'Permission Required',
          message: 'This application requires access to media files to function properly.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        }
      );

      if (grantedStatus === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      if (grantedStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        promptOpenSettings();
      }
      return false;
    } else {
      const grantedStatuses = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);

      const readGranted =
        grantedStatuses[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
        PermissionsAndroid.RESULTS.GRANTED;

      if (readGranted) {
        return true;
      }

      if (
        grantedStatuses[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
        PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
      ) {
        promptOpenSettings();
      }

      return false;
    }
  } catch (error) {
    console.warn('[permissionHelper] Error requesting permission:', error);
    return false;
  }
};

/**
 * Helper to prompt user to open OS App Settings if permission is permanently blocked.
 */
export const promptOpenSettings = () => {
  Alert.alert(
    'Permission Blocked',
    'Permission has been permanently denied. Please enable it manually in application settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
};
