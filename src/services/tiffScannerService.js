import RNFS from 'react-native-fs';

/**
 * TIFF Scanner Service
 * High-performance, multi-target storage scanner for .tif and .tiff files.
 */

const IGNORED_FOLDERS = [
  '.git',
  '.cache',
  '.thumbnails',
  'node_modules',
];

/**
 * Checks if a file has a TIFF extension (.tif or .tiff).
 */
export const isTiffFile = (filename) => {
  if (!filename) return false;
  const lower = filename.toLowerCase().trim();
  return (
    lower.endsWith('.tif') ||
    lower.endsWith('.tiff') ||
    lower.includes('.tif') ||
    lower.includes('.tiff')
  );
};

/**
 * Recursively scans a directory for TIFF files.
 */
export const scanDirectoryForTiffs = async (
  dirPath,
  foundFilesMap = new Map(),
  onFileFound = null
) => {
  try {
    const exists = await RNFS.exists(dirPath);
    if (!exists) return foundFilesMap;

    const items = await RNFS.readDir(dirPath);

    for (const item of items) {
      if (item.isDirectory()) {
        const folderName = item.name;
        if (!IGNORED_FOLDERS.includes(folderName) && !folderName.startsWith('.')) {
          await scanDirectoryForTiffs(item.path, foundFilesMap, onFileFound);
        }
      } else if (item.isFile()) {
        // FLEXIBLE TIFF EXTENSION CHECK
        if (isTiffFile(item.name)) {
          if (!foundFilesMap.has(item.path)) {
            const tiffItem = {
              id: item.path,
              name: item.name,
              path: item.path,
              uri: `file://${item.path}`,
              size: item.size || 0,
              mtime: item.mtime || new Date(),
            };

            foundFilesMap.set(item.path, tiffItem);
            console.log('--> DISCOVERED TIFF FILE:', item.path);

            if (onFileFound) {
              onFileFound(tiffItem);
            }
          }
        }
      }
    }
  } catch (error) {
    // Ignore protected folder errors
  }

  return foundFilesMap;
};

/**
 * Multi-target dynamic scanner for TIFF files.
 */
export const scanDeviceForTiffs = async (onProgress = null) => {
  const foundFilesMap = new Map();
  const rootPath = RNFS.ExternalStorageDirectoryPath || '/storage/emulated/0';

  const targetPaths = [
    rootPath,
    '/storage/emulated/0',
    '/sdcard',
    '/storage',
    RNFS.DownloadDirectoryPath,
    RNFS.PicturesDirectoryPath,
    RNFS.DocumentDirectoryPath,
    `${rootPath}/Download`,
    `${rootPath}/Downloads`,
    `${rootPath}/Pictures`,
    `${rootPath}/DCIM`,
    `${rootPath}/Documents`,
    `${rootPath}/WhatsApp/Media`,
    `${rootPath}/Telegram`,
  ].filter(Boolean);

  for (const path of targetPaths) {
    try {
      await scanDirectoryForTiffs(path, foundFilesMap, onProgress);
    } catch (err) {
      // Continue next path
    }
  }

  console.log(`Scan Complete. Total TIFFs found: ${foundFilesMap.size}`);
  return Array.from(foundFilesMap.values());
};
