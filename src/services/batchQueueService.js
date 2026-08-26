import RNFS from 'react-native-fs';

/**
 * Batch Queue State Service
 * Tracks active batch conversion queue in storage so it can be resumed on next app open.
 * Persists content:// URIs to local app storage so permissions are preserved across app restarts.
 */

const BATCH_QUEUE_FILE = `${RNFS.DocumentDirectoryPath}/active_batch_queue.json`;
const BATCH_CACHE_DIR = `${RNFS.CachesDirectoryPath}/batch_sources`;

export const saveActiveBatchQueue = async (batchState) => {
  try {
    if (!batchState || !batchState.files || batchState.files.length === 0) {
      await clearActiveBatchQueue();
      return;
    }

    // Ensure cache directory exists
    const dirExists = await RNFS.exists(BATCH_CACHE_DIR);
    if (!dirExists) {
      await RNFS.mkdir(BATCH_CACHE_DIR);
    }

    // Copy any content:// URIs to persistent app storage so they survive app restarts
    const persistedFiles = await Promise.all(
      batchState.files.map(async (file, idx) => {
        const source = file.path || file.uri || '';
        if (source.startsWith('content://')) {
          const cleanName = (file.name || `file_${idx}.tiff`).replace(/[^a-zA-Z0-9._-]/g, '_');
          const localCachePath = `${BATCH_CACHE_DIR}/batch_${idx}_${cleanName}`;
          
          try {
            const alreadyCopied = await RNFS.exists(localCachePath);
            if (!alreadyCopied) {
              await RNFS.copyFile(source, localCachePath);
            }
            return {
              ...file,
              path: localCachePath,
              uri: `file://${localCachePath}`,
              originalUri: source,
            };
          } catch (copyErr) {
            console.warn('[batchQueueService] Could not cache content:// URI:', copyErr);
            return file;
          }
        }
        return file;
      })
    );

    const persistentState = {
      ...batchState,
      files: persistedFiles,
    };

    await RNFS.writeFile(BATCH_QUEUE_FILE, JSON.stringify(persistentState, null, 2), 'utf8');
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

    const dirExists = await RNFS.exists(BATCH_CACHE_DIR);
    if (dirExists) {
      await RNFS.unlink(BATCH_CACHE_DIR);
    }
  } catch (err) {
    console.warn('[batchQueueService] Error clearing batch queue:', err);
  }
};
