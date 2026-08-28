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

    let originalPath = fileItem.path || (fileItem.uri ? fileItem.uri : null);
    if (originalPath && typeof originalPath === 'string') {
      originalPath = originalPath.replace(/^file:\/\//, '');
    }

    const fileName = fileItem.name || (originalPath ? originalPath.split('/').pop() : `file_${Date.now()}`);
    const binFileName = `${Date.now()}_${fileName}`;
    const binFilePath = `${RECYCLE_BIN_DIR}/${binFileName}`;

    const outputDir = await getOutputDir();
    const fallbackPath = `${outputDir}/${fileName}`;

    // Resolve working originalPath
    let pathToDelete = null;
    if (originalPath && (await RNFS.exists(originalPath))) {
      pathToDelete = originalPath;
    } else if (await RNFS.exists(fallbackPath)) {
      pathToDelete = fallbackPath;
    }

    // Safely move / copy to sandbox recycle bin and remove original
    if (pathToDelete) {
      try {
        await RNFS.copyFile(pathToDelete, binFilePath);
        await RNFS.unlink(pathToDelete);
      } catch (copyErr) {
        try {
          const base64 = await RNFS.readFile(pathToDelete, 'base64');
          await RNFS.writeFile(binFilePath, base64, 'base64');
          await RNFS.unlink(pathToDelete);
        } catch (readErr) {
          console.warn('[recycleBinService] Error backing up file to bin:', readErr);
        }
      }

      // Ensure original file is removed from disk
      if (await RNFS.exists(pathToDelete)) {
        try {
          await RNFS.unlink(pathToDelete);
        } catch (unlinkErr) {
          try {
            await RNFS.writeFile(pathToDelete, '', 'utf8');
          } catch (_) {}
        }
      }

      // Also check fallback path if different
      if (fallbackPath !== pathToDelete && (await RNFS.exists(fallbackPath))) {
        try {
          await RNFS.unlink(fallbackPath);
        } catch (_) {
          try {
            await RNFS.writeFile(fallbackPath, '', 'utf8');
          } catch (_) {}
        }
      }

      // Notify Media Scanner so it disappears from gallery / media store
      try {
        if (RNFS.scanFile) {
          await RNFS.scanFile(pathToDelete);
        }
      } catch (_) {}
    } else if (fileItem.uri && fileItem.uri.startsWith('data:image')) {
      const base64 = fileItem.uri.split(',')[1];
      await RNFS.writeFile(binFilePath, base64, 'base64');
    }

    const currentBin = await getRecycleBinFiles();
    const newEntry = {
      id: binFileName,
      name: fileName,
      originalPath: pathToDelete || originalPath || fallbackPath,
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
    let targetPath = item.originalPath || `${outputDir}/${item.name}`;
    if (targetPath && typeof targetPath === 'string') {
      targetPath = targetPath.replace(/^file:\/\//, '');
    }

    let binPath = item.binPath || (item.uri ? item.uri : null);
    if (binPath && typeof binPath === 'string') {
      binPath = binPath.replace(/^file:\/\//, '');
    }

    // Ensure target folder exists
    const lastSlash = targetPath.lastIndexOf('/');
    if (lastSlash !== -1) {
      const parentDir = targetPath.substring(0, lastSlash);
      const exists = await RNFS.exists(parentDir);
      if (!exists) {
        await RNFS.mkdir(parentDir);
      }
    }

    if (binPath && (await RNFS.exists(binPath))) {
      // If target file already exists, remove it first
      if (await RNFS.exists(targetPath)) {
        try {
          await RNFS.unlink(targetPath);
        } catch (_) {}
      }

      let restoreSuccess = false;

      try {
        await RNFS.copyFile(binPath, targetPath);
        restoreSuccess = true;
      } catch (cpErr) {
        try {
          // Fallback: binary base64 stream
          const base64Data = await RNFS.readFile(binPath, 'base64');
          await RNFS.writeFile(targetPath, base64Data, 'base64');
          restoreSuccess = true;
        } catch (writeErr) {
          // Fallback 2: The original path might have permission issues (e.g. PDF in Pictures).
          // Try restoring to the safe outputDir instead.
          const fallbackTargetPath = `${outputDir}/${item.name}`;
          if (targetPath !== fallbackTargetPath) {
            targetPath = fallbackTargetPath;
            try {
              await RNFS.copyFile(binPath, targetPath);
              restoreSuccess = true;
            } catch (fallbackCpErr) {
              try {
                const base64Data = await RNFS.readFile(binPath, 'base64');
                await RNFS.writeFile(targetPath, base64Data, 'base64');
                restoreSuccess = true;
              } catch (fallbackWriteErr) {
                restoreSuccess = false;
              }
            }
          } else {
             restoreSuccess = false;
          }
        }
      }

      if (!restoreSuccess) {
        return false;
      }

      // Notify Media Scanner so it shows in gallery & file lists immediately
      try {
        if (RNFS.scanFile) {
          await RNFS.scanFile(targetPath);
        }
      } catch (_) {}

      // Remove from bin directory
      try {
        await RNFS.unlink(binPath);
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
    let binPath = item?.binPath || (item?.uri ? item.uri : null);
    if (binPath && typeof binPath === 'string') {
      binPath = binPath.replace(/^file:\/\//, '');
    }
    if (binPath && (await RNFS.exists(binPath))) {
      try {
        await RNFS.unlink(binPath);
      } catch (_) {}
    }

    let origPath = item?.originalPath;
    if (origPath && typeof origPath === 'string') {
      origPath = origPath.replace(/^file:\/\//, '');
      if (await RNFS.exists(origPath)) {
        try {
          // Overwrite with empty string to corrupt it before delete
          await RNFS.writeFile(origPath, '', 'utf8');
          await RNFS.unlink(origPath);
        } catch (_) {
          try { await RNFS.unlink(origPath); } catch (_) {}
        }
      }

      // Try to find and delete any .trashed Android OS variants in the same folder
      try {
        const folder = origPath.substring(0, origPath.lastIndexOf('/'));
        const fileName = origPath.substring(origPath.lastIndexOf('/') + 1);
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        if (folder && (await RNFS.exists(folder))) {
          const files = await RNFS.readDir(folder);
          for (const f of files) {
            if (f.name.includes('.trashed') && f.name.includes(nameWithoutExt)) {
              try { await RNFS.unlink(f.path); } catch (_) {}
            }
          }
        }
      } catch (_) {}
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
        try {
          await RNFS.unlink(item.binPath);
        } catch (_) {}
      }
      let origPath = item?.originalPath;
      if (origPath && typeof origPath === 'string') {
        origPath = origPath.replace(/^file:\/\//, '');
        if (await RNFS.exists(origPath)) {
          try {
            // Overwrite first to destroy content
            await RNFS.writeFile(origPath, '', 'utf8');
            await RNFS.unlink(origPath);
          } catch (_) {
            try { await RNFS.unlink(origPath); } catch (_) {}
          }
        }

        // Try to find and delete any .trashed Android OS variants in the same folder
        try {
          const folder = origPath.substring(0, origPath.lastIndexOf('/'));
          const fileName = origPath.substring(origPath.lastIndexOf('/') + 1);
          const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
          if (folder && (await RNFS.exists(folder))) {
            const files = await RNFS.readDir(folder);
            for (const f of files) {
              if (f.name.includes('.trashed') && f.name.includes(nameWithoutExt)) {
                try { await RNFS.unlink(f.path); } catch (_) {}
              }
            }
          }
        } catch (_) {}
      }
    }
    await saveRecycleBinMetadata([]);
    return true;
  } catch (error) {
    console.warn('[recycleBinService] Error emptying recycle bin:', error);
    return false;
  }
};
