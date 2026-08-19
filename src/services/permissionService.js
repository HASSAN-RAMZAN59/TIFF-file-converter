import { Platform, PermissionsAndroid } from 'react-native';

/**
 * Storage Permission Service
 * Minimal permissions compliant with Google Play Console policies.
 * Requests standard native OS popup for READ_MEDIA_IMAGES (Android 13+) and READ_EXTERNAL_STORAGE (Android 12 & below).
 */

export const isAndroid13OrHigher = () => {
  return Platform.OS === 'android' && Platform.Version >= 33;
};

/**
 * Checks OS storage permissions for image access.
 */
export const checkOsStoragePermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    if (isAndroid13OrHigher()) {
      return await PermissionsAndroid.check('android.permission.READ_MEDIA_IMAGES');
    } else {
      return await PermissionsAndroid.check('android.permission.READ_EXTERNAL_STORAGE');
    }
  } catch (error) {
    console.warn('Error checking OS storage permission:', error);
    return false;
  }
};

export const checkAllFilesAccessPermission = async () => {
  return checkOsStoragePermission();
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
 * Triggers native OS permission request popup dialog.
 * Play Store compliant - No dangerous MANAGE_EXTERNAL_STORAGE required.
 */
export const requestOsStoragePermissionDialog = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    if (isAndroid13OrHigher()) {
      const granted = await PermissionsAndroid.request(
        'android.permission.READ_MEDIA_IMAGES',
        {
          title: 'Storage Permission Required',
          message: 'This app needs access to your images to view and convert TIFF files.',
          buttonPositive: 'Allow',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const granted = await PermissionsAndroid.requestMultiple([
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ]);

      return (
        granted['android.permission.READ_EXTERNAL_STORAGE'] ===
        PermissionsAndroid.RESULTS.GRANTED
      );
    }
  } catch (error) {
    console.warn('Error in requestOsStoragePermissionDialog:', error);
    return false;
  }
};
