import RNFS from 'react-native-fs';

/**
 * Batch Queue State Service
 * Tracks active batch conversion queue in storage so it can be resumed on next app open.
 */

const BATCH_QUEUE_FILE = `${RNFS.DocumentDirectoryPath}/active_batch_queue.json`;

export const saveActiveBatchQueue = async (batchState) => {
  try {
    if (!batchState || !batchState.files || batchState.files.length === 0) {
      await clearActiveBatchQueue();
      return;
    }
    await RNFS.writeFile(BATCH_QUEUE_FILE, JSON.stringify(batchState, null, 2), 'utf8');
  } catch (err) {
    console.warn('[batchQueueService] Error saving batch queue:', err);
  }
};

export const getActiveBatchQueue = async () => {
  try {
    const exists = await RNFS.exists(BATCH_QUEUE_FILE);
    if (!exists) return null;
    const content = await RNFS.readFile(BATCH_QUEUE_FILE, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('[batchQueueService] Error getting batch queue:', err);
    return null;
  }
};

export const clearActiveBatchQueue = async () => {
  try {
    const exists = await RNFS.exists(BATCH_QUEUE_FILE);
    if (exists) {
      await RNFS.unlink(BATCH_QUEUE_FILE);
    }
  } catch (err) {
    console.warn('[batchQueueService] Error clearing batch queue:', err);
  }
};
