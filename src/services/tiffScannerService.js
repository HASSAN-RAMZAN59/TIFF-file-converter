import RNFS from 'react-native-fs';

/**
 * TIFF Scanner Service
 * Fast, single-pass storage scanner for .tif and .tiff files (> 0 KB valid files).
 */

const IGNORED_FOLDERS = [
  '.git',
  '.cache',
  '.thumbnails',
  'node_modules',
  'data',
  'obb',
  'Android/data',
  'Android/obb',
  '.apps',
  '.system',
  '.temp',
];

/**
 * Checks if a file has a TIFF extension (.tif or .tiff).
 */
export const isTiffFile = (filename) => {
  if (!filename) return false;
  const lower = filename.toLowerCase().trim();
  return lower.endsWith('.tif') || lower.endsWith('.tiff');
};

/**
 * Recursively scans a directory for valid TIFF files (size > 100 bytes).
 * Supports realtime cancellation via isCancelled check.
 */
export const scanDirectoryForTiffs = async (
  dirPath,
  foundFilesMap = new Map(),
  onFileFound = null,
  depth = 0,
  maxDepth = 4,
  isCancelled = null
) => {
  if (isCancelled && isCancelled()) return foundFilesMap;
  if (depth > maxDepth) return foundFilesMap;

  try {
    const exists = await RNFS.exists(dirPath);
    if (!exists || (isCancelled && isCancelled())) return foundFilesMap;

    const items = await RNFS.readDir(dirPath);

    for (const item of items) {
      if (isCancelled && isCancelled()) return foundFilesMap;

      if (item.isDirectory()) {
        const folderName = item.name;
        if (!IGNORED_FOLDERS.includes(folderName) && !folderName.startsWith('.')) {
          if (folderName === 'Android' && !item.path.endsWith('Android/media')) {
            const mediaPath = `${item.path}/media`;
            const mediaExists = await RNFS.exists(mediaPath);
            if (mediaExists) {
              await scanDirectoryForTiffs(mediaPath, foundFilesMap, onFileFound, depth + 1, maxDepth, isCancelled);
            }
            continue;
          }

          await scanDirectoryForTiffs(item.path, foundFilesMap, onFileFound, depth + 1, maxDepth, isCancelled);
        }
      } else if (item.isFile()) {
        if (isTiffFile(item.name)) {
          let fileSize = Number(item.size) || 0;

          // If size is reported as 0 by readDir, perform exact stat check
          if (fileSize <= 0) {
            try {
              const fileStat = await RNFS.stat(item.path);
              fileSize = Number(fileStat.size) || 0;
            } catch (statErr) {
              fileSize = 0;
            }
          }

          // STRICT NON-ZERO FILTER: Only accept valid files (> 100 bytes)
          if (fileSize > 100) {
            if (!foundFilesMap.has(item.path)) {
              const tiffItem = {
                id: item.path,
                name: item.name,
                path: item.path,
                uri: `file://${item.path}`,
                size: fileSize,
                mtime: item.mtime ? new Date(item.mtime).toISOString() : new Date().toISOString(),
              };

              foundFilesMap.set(item.path, tiffItem);
              console.log(`--> DISCOVERED VALID TIFF FILE (${fileSize} bytes):`, item.path);

              if (onFileFound) {
                onFileFound(tiffItem);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Catch folder permission errors silently
  }

  return foundFilesMap;
};

/**
 * Fast single-pass scanner for valid TIFF files (> 0 KB).
 * Supports isCancelled callback to terminate scanning in realtime.
 */
export const scanDeviceForTiffs = async (onProgress = null, isCancelled = null) => {
  const foundFilesMap = new Map();
  const rootPath = RNFS.ExternalStorageDirectoryPath || '/storage/emulated/0';

  const targetPaths = [
    `${rootPath}/Download`,
    `${rootPath}/Downloads`,
    `${rootPath}/Pictures`,
    `${rootPath}/DCIM`,
    `${rootPath}/Documents`,
    `${rootPath}/TIFF`,
    `${rootPath}/Tiff`,
    `${rootPath}/tiff`,
    `${rootPath}/Bluetooth`,
    `${rootPath}/Telegram`,
    `${rootPath}/Android/media`,
    rootPath,
  ];

  const uniquePaths = Array.from(new Set(targetPaths)).filter(Boolean);

  for (const path of uniquePaths) {
    if (isCancelled && isCancelled()) {
      console.log('--> TIFF scan aborted in realtime.');
      break;
    }
    try {
      await scanDirectoryForTiffs(path, foundFilesMap, onProgress, 0, 4, isCancelled);
    } catch (err) {
      // Continue next path
    }
  }

  console.log(`Scan finished. Total valid TIFFs found: ${foundFilesMap.size}`);
  return Array.from(foundFilesMap.values());
};
