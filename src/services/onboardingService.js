import RNFS from 'react-native-fs';

const ONBOARDING_FILE_PATH = `${RNFS.DocumentDirectoryPath}/onboarding_completed.json`;

/**
 * Checks if the user has already completed or skipped the onboarding flow.
 * Returns true if completed, false if first-time launch.
 */
export const hasCompletedOnboarding = async () => {
  try {
    const exists = await RNFS.exists(ONBOARDING_FILE_PATH);
    if (!exists) return false;

    const content = await RNFS.readFile(ONBOARDING_FILE_PATH, 'utf8');
    const data = JSON.parse(content);
    return !!data.completed;
  } catch (error) {
    console.warn('[onboardingService] Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Marks onboarding as completed persistently on disk.
 */
export const setOnboardingCompleted = async () => {
  try {
    const data = JSON.stringify({ completed: true, timestamp: Date.now() });
    await RNFS.writeFile(ONBOARDING_FILE_PATH, data, 'utf8');
    return true;
  } catch (error) {
    console.warn('[onboardingService] Error saving onboarding status:', error);
    return false;
  }
};

/**
 * Resets onboarding status (useful for testing or debug reset)
 */
export const resetOnboardingStatus = async () => {
  try {
    const exists = await RNFS.exists(ONBOARDING_FILE_PATH);
    if (exists) {
      await RNFS.unlink(ONBOARDING_FILE_PATH);
    }
    return true;
  } catch (error) {
    console.warn('[onboardingService] Error resetting onboarding status:', error);
    return false;
  }
};
