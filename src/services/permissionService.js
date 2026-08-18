import { Platform, PermissionsAndroid, Linking } from 'react-native';

/**
 * Storage Permission Service
 * Handles Android Version Branching & State Verification:
 * - Android 11+ (API 30+): MANAGE_EXTERNAL_STORAGE (All Files Access)
 * - Android 10 & below (< API 30): READ_EXTERNAL_STORAGE & WRITE_EXTERNAL_STORAGE
 */

export const isAndroid11OrHigher = () => {
  return Platform.OS === 'android' && Platform.Version >= 30;
};

/**
 * Checks if MANAGE_EXTERNAL_STORAGE (All Files Access) is granted (Android 11+).
 * @returns {Promise<boolean>}
 */
export const checkAllFilesAccessPermission = async () => {
  if (Platform.OS !== 'android') return true;
  if (!isAndroid11OrHigher()) return true;

  try {
    if (PermissionsAndroid.PERMISSIONS.MANAGE_EXTERNAL_STORAGE) {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.MANAGE_EXTERNAL_STORAGE
      );
    }
    return false;
  } catch (error) {
    console.warn('Error checking All Files Access permission:', error);
    return false;
  }
};

/**
 * Checks if READ & WRITE storage permissions are granted (Android 10 & below).
 * @returns {Promise<boolean>}
 */
export const checkLegacyStoragePermission = async () => {
  if (Platform.OS !== 'android') return true;
  if (isAndroid11OrHigher()) return true;

  try {
    const readGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    const writeGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
    return readGranted && writeGranted;
  } catch (error) {
    console.warn('Error checking legacy storage permission:', error);
    return false;
  }
};

/**
 * Requests legacy storage permissions for Android 10 and below.
 * @returns {Promise<boolean>}
 */
export const requestLegacyStoragePermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    ]);

    const isReadGranted =
      granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const isWriteGranted =
      granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
      PermissionsAndroid.RESULTS.GRANTED;

    return isReadGranted && isWriteGranted;
  } catch (error) {
    console.warn('Error requesting legacy storage permission:', error);
    return false;
  }
};

/**
 * Launches native settings page for All Files Access on Android 11+ (API 30+).
 * Uses Linking.sendIntent("android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION").
 */
export const openManageAllFilesAccessSettings = async () => {
  if (Platform.OS !== 'android') return;

  try {
    // Attempt sendIntent for MANAGE_APP_ALL_FILES_ACCESS_PERMISSION
    await Linking.sendIntent(
      'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION'
    );
  } catch (error) {
    console.warn(
      'sendIntent for MANAGE_APP_ALL_FILES_ACCESS_PERMISSION failed, falling back to openSettings:',
      error
    );
    try {
      await Linking.openSettings();
    } catch (fallbackError) {
      console.warn('openSettings failed:', fallbackError);
    }
  }
};
