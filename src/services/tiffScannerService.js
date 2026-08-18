import RNFS from 'react-native-fs';

/**
 * TIFF Scanner Service
 * Recursively scans device storage strictly for .tif and .tiff files.
 */

// Directories/folders to skip during recursive scan to optimize performance and prevent permission errors
const IGNORED_FOLDERS = [
  'Android',
  '.android',
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
  const lower = filename.toLowerCase();
  return lower.endsWith('.tif') || lower.endsWith('.tiff');
};

/**
 * Recursively scans a directory for TIFF files.
 * @param {string} dirPath - Directory path to scan
 * @param {Array} foundFiles - Accumulated list of TIFF files
 * @param {Function} onFileFound - Optional callback when a file is discovered
 */
export const scanDirectoryForTiffs = async (dirPath, foundFiles = [], onFileFound = null) => {
  try {
    const items = await RNFS.readDir(dirPath);

    for (const item of items) {
      // Check if folder should be ignored
      if (item.isDirectory()) {
        const folderName = item.name;
        if (!IGNORED_FOLDERS.includes(folderName) && !folderName.startsWith('.')) {
          await scanDirectoryForTiffs(item.path, foundFiles, onFileFound);
        }
      } else if (item.isFile()) {
        // STRICT FILTER: Only accept .tif or .tiff files
        if (isTiffFile(item.name)) {
          const tiffItem = {
            id: item.path,
            name: item.name,
            path: item.path,
            uri: `file://${item.path}`,
            size: item.size || 0,
            mtime: item.mtime || new Date(),
          };

          foundFiles.push(tiffItem);

          if (onFileFound) {
            onFileFound(tiffItem);
          }
        }
      }
    }
  } catch (error) {
    // Ignore unreadable/permission-protected directories silently
  }

  return foundFiles;
};

/**
 * Scans the entire external device storage for TIFF files.
 */
export const scanDeviceForTiffs = async (onProgress = null) => {
  const tiffList = [];
  const rootPath = RNFS.ExternalStorageDirectoryPath || '/storage/emulated/0';

  try {
    await scanDirectoryForTiffs(rootPath, tiffList, (newFile) => {
      if (onProgress) {
        onProgress(newFile);
      }
    });
  } catch (error) {
    console.warn('Error during TIFF scan:', error);
  }

  return tiffList;
};
