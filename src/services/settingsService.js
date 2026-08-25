import RNFS from 'react-native-fs';

/**
 * Settings Service
 * Persists app settings (such as Auto Resume, Language, etc.) in sandbox storage.
 */

const SETTINGS_FILE_PATH = `${RNFS.DocumentDirectoryPath}/app_settings.json`;

const DEFAULT_SETTINGS = {
  autoResume: true,
  language: 'en',
};

export const getAppSettings = async () => {
  try {
    const exists = await RNFS.exists(SETTINGS_FILE_PATH);
    if (!exists) {
      return DEFAULT_SETTINGS;
    }
    const content = await RNFS.readFile(SETTINGS_FILE_PATH, 'utf8');
    const parsed = JSON.parse(content);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.warn('[settingsService] Error reading settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveAppSettings = async (newSettings) => {
  try {
    const current = await getAppSettings();
    const merged = { ...current, ...newSettings };
    await RNFS.writeFile(SETTINGS_FILE_PATH, JSON.stringify(merged, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.warn('[settingsService] Error saving settings:', error);
    return false;
  }
};

export const getAutoResumeEnabled = async () => {
  const settings = await getAppSettings();
  return settings.autoResume !== false;
};

export const setAutoResumeEnabled = async (enabled) => {
  return await saveAppSettings({ autoResume: !!enabled });
};

export const getAppLanguage = async () => {
  const settings = await getAppSettings();
  return settings.language || 'fr';
};

export const setAppLanguage = async (languageCode) => {
  return await saveAppSettings({ language: languageCode });
};
