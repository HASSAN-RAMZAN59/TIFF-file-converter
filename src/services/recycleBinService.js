import RNFS from 'react-native-fs';
import { getOutputDir } from './tiffConverterService';

/**
 * Recycle Bin Service
 * Manages soft-deleted files in sandbox storage.
 * Allows restoring files or deleting them permanently.
 */

const RECYCLE_BIN_METADATA_FILE = `${RNFS.DocumentDirectoryPath}/recycle_bin.json`;
const RECYCLE_BIN_DIR = `${RNFS.DocumentDirectoryPath}/RecycleBinFiles`;

const ensureRecycleBinDir = async () => {
  const exists = await RNFS.exists(RECYCLE_BIN_DIR);
  if (!exists) {
    await RNFS.mkdir(RECYCLE_BIN_DIR);
  }
};

export const getRecycleBinFiles = async () => {
  try {
    const exists = await RNFS.exists(RECYCLE_BIN_METADATA_FILE);
    if (!exists) return [];
    const content = await RNFS.readFile(RECYCLE_BIN_METADATA_FILE, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[recycleBinService] Error reading recycle bin:', error);
    return [];
  }
};

const saveRecycleBinMetadata = async (filesList) => {
  try {
    await RNFS.writeFile(RECYCLE_BIN_METADATA_FILE, JSON.stringify(filesList, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.warn('[recycleBinService] Error saving recycle bin:', error);
    return false;
  }
};

/**
 * Moves a deleted file to the Recycle Bin instead of deleting permanently.
 */
export const moveToRecycleBin = async (fileItem) => {
  try {
    if (!fileItem) return false;
    await ensureRecycleBinDir();

    let originalPath = fileItem.path || (fileItem.uri ? fileItem.uri.replace('file://', '') : null);
    const fileName = fileItem.name || (originalPath ? originalPath.split('/').pop() : `file_${Date.now()}`);
    const binFileName = `${Date.now()}_${fileName}`;
    const binFilePath = `${RECYCLE_BIN_DIR}/${binFileName}`;

    // Safely copy to sandbox recycle bin and remove original
    if (originalPath && (await RNFS.exists(originalPath))) {
      try {
        await RNFS.copyFile(originalPath, binFilePath);
        await RNFS.unlink(originalPath);
      } catch (copyErr) {
        // Fallback: read base64 and write
        const base64 = await RNFS.readFile(originalPath, 'base64');
        await RNFS.writeFile(binFilePath, base64, 'base64');
        try {
          await RNFS.unlink(originalPath);
        } catch (_) {}
      }
    } else if (fileItem.uri && fileItem.uri.startsWith('data:image')) {
      const base64 = fileItem.uri.split(',')[1];
      await RNFS.writeFile(binFilePath, base64, 'base64');
    }

    const currentBin = await getRecycleBinFiles();
    const newEntry = {
      id: binFileName,
      name: fileName,
      originalPath: originalPath,
      binPath: binFilePath,
      uri: `file://${binFilePath}`,
      size: fileItem.size || 0,
      format: (fileItem.format || fileName.split('.').pop() || 'TIFF').toUpperCase(),
      deletedAt: new Date().toISOString(),
    };

    const updatedList = [newEntry, ...currentBin];
    await saveRecycleBinMetadata(updatedList);
    return true;
  } catch (error) {
    console.warn('[recycleBinService] Error moving to recycle bin:', error);
    return false;
  }
};

/**
 * Restores a file from Recycle Bin back to its original location (or Downloads).
 */
export const restoreFromRecycleBin = async (item) => {
  try {
    if (!item) return false;
    const outputDir = await getOutputDir();
    const targetPath = item.originalPath || `${outputDir}/${item.name}`;

    // Ensure target folder exists
    const lastSlash = targetPath.lastIndexOf('/');
    if (lastSlash !== -1) {
      const parentDir = targetPath.substring(0, lastSlash);
      const exists = await RNFS.exists(parentDir);
      if (!exists) {
        await RNFS.mkdir(parentDir);
      }
    }

    if (item.binPath && (await RNFS.exists(item.binPath))) {
      // If target file already exists, remove it first
      if (await RNFS.exists(targetPath)) {
        try {
          await RNFS.unlink(targetPath);
        } catch (_) {}
      }

      try {
        await RNFS.copyFile(item.binPath, targetPath);
      } catch (cpErr) {
        // Fallback: binary base64 stream
        const base64Data = await RNFS.readFile(item.binPath, 'base64');
        await RNFS.writeFile(targetPath, base64Data, 'base64');
      }

      // Notify Media Scanner so it shows in gallery & file lists immediately
      try {
        if (RNFS.scanFile) {
          await RNFS.scanFile(targetPath);
        }
      } catch (_) {}

      // Remove from bin directory
      try {
        await RNFS.unlink(item.binPath);
      } catch (_) {}
    }

    const currentBin = await getRecycleBinFiles();
    const updatedList = currentBin.filter((f) => f.id !== item.id);
    await saveRecycleBinMetadata(updatedList);
    return true;
  } catch (error) {
    console.warn('[recycleBinService] Error restoring from recycle bin:', error);
    return false;
  }
};

/**
 * Deletes a file permanently from disk and metadata.
 */
export const deletePermanentlyFromRecycleBin = async (item) => {
  try {
    if (item.binPath && (await RNFS.exists(item.binPath))) {
      await RNFS.unlink(item.binPath);
    }
    const currentBin = await getRecycleBinFiles();
    const updatedList = currentBin.filter((f) => f.id !== item.id);
    await saveRecycleBinMetadata(updatedList);
    return true;
  } catch (error) {
    console.warn('[recycleBinService] Error deleting permanently:', error);
    return false;
  }
};

/**
 * Empties all files in the Recycle Bin permanently.
 */
export const emptyRecycleBin = async () => {
  try {
    const list = await getRecycleBinFiles();
    for (const item of list) {
      if (item.binPath && (await RNFS.exists(item.binPath))) {
        await RNFS.unlink(item.binPath);
      }
    }
    await saveRecycleBinMetadata([]);
    return true;
  } catch (error) {
    console.warn('[recycleBinService] Error emptying recycle bin:', error);
    return false;
  }
};
