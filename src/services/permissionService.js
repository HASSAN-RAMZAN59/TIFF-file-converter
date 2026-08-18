import { Platform, PermissionsAndroid, Linking } from 'react-native';

/**
 * Storage Permission Service
 * Launches direct All Files Access settings with package URI
 */

export const isAndroid11OrHigher = () => {
  return Platform.OS === 'android' && Platform.Version >= 30;
};

/**
 * Opens direct All Files Access toggle screen for this app package.
 */
export const openManageAllFilesAccessSettings = async () => {
  if (Platform.OS !== 'android') return;

  const pkgName = 'com.tiffviewerconverter';
  try {
    if (Linking.sendIntent) {
      await Linking.sendIntent('android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION', [
        { key: 'data', value: `package:${pkgName}` }
      ]);
    } else {
      await Linking.openURL(`package:${pkgName}`);
    }
  } catch (error) {
    try {
      await Linking.openSettings();
    } catch (fallbackError) {
      console.warn('openSettings fallback failed:', fallbackError);
    }
  }
};

/**
 * Checks MANAGE_EXTERNAL_STORAGE (All Files Access) on Android 11+ (API 30+).
 */
export const checkAllFilesAccessPermission = async () => {
  if (Platform.OS !== 'android') return true;
  if (!isAndroid11OrHigher()) return true;

  try {
    return await PermissionsAndroid.check('android.permission.MANAGE_EXTERNAL_STORAGE');
  } catch (error) {
    return false;
  }
};

/**
 * Checks general storage permissions.
 */
export const checkOsStoragePermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    if (isAndroid11OrHigher()) {
      const allFiles = await checkAllFilesAccessPermission();
      if (allFiles) return true;
    }

    if (Platform.Version >= 33) {
      const readImages = await PermissionsAndroid.check('android.permission.READ_MEDIA_IMAGES');
      return readImages;
    } else {
      const readStorage = await PermissionsAndroid.check('android.permission.READ_EXTERNAL_STORAGE');
      return readStorage;
    }
  } catch (error) {
    console.warn('Error checking OS storage permission:', error);
    return false;
  }
};

export const checkLegacyStoragePermission = async () => {
  return checkOsStoragePermission();
};

export const checkStorageReadWritePermission = async () => {
  return checkOsStoragePermission();
};

export const requestLegacyStoragePermission = async () => {
  return requestOsStoragePermissionDialog();
};

export const requestStorageReadWritePermission = async () => {
  return requestOsStoragePermissionDialog();
};

/**
 * Triggers permission request for Android.
 * On Android 11+ (API 30+), launches All Files Access settings with package URI.
 * On Android 10 & below, triggers native OS permission popup dialog.
 */
export const requestOsStoragePermissionDialog = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    if (isAndroid11OrHigher()) {
      await openManageAllFilesAccessSettings();
      return await checkAllFilesAccessPermission();
    } else {
      const granted = await PermissionsAndroid.requestMultiple([
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ]);

      return (
        granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
  } catch (error) {
    console.warn('Error in requestOsStoragePermissionDialog:', error);
    await openManageAllFilesAccessSettings();
    return false;
  }
};
