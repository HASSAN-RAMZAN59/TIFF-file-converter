import RNFS from 'react-native-fs';

/**
 * Favorites Service
 * Manages persistent bookmarked favorite TIFF files stored in app sandbox JSON.
 */

const FAVORITES_FILE_PATH = `${RNFS.DocumentDirectoryPath}/favorites.json`;

/**
 * Reads bookmarked favorite files list from storage.
 */
export const getFavorites = async () => {
  try {
    const exists = await RNFS.exists(FAVORITES_FILE_PATH);
    if (!exists) {
      return [];
    }
    const jsonContent = await RNFS.readFile(FAVORITES_FILE_PATH, 'utf8');
    const parsed = JSON.parse(jsonContent);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Error reading favorites:', error);
    return [];
  }
};

/**
 * Saves bookmarked favorite files list to storage.
 */
export const saveFavorites = async (favoritesList) => {
  try {
    const jsonContent = JSON.stringify(favoritesList, null, 2);
    await RNFS.writeFile(FAVORITES_FILE_PATH, jsonContent, 'utf8');
    return true;
  } catch (error) {
    console.warn('Error saving favorites:', error);
    return false;
  }
};

/**
 * Checks if a file path is in Favorites.
 */
export const isFavoriteFile = async (filePath) => {
  if (!filePath) return false;
  const list = await getFavorites();
  return list.some((item) => item.path === filePath || item.id === filePath);
};

/**
 * Toggles a file in Favorites (adds if missing, removes if present).
 * Returns updated boolean status.
 */
export const toggleFavorite = async (fileItem) => {
  if (!fileItem || (!fileItem.path && !fileItem.uri)) return false;

  const path = fileItem.path || fileItem.uri;
  const list = await getFavorites();
  const index = list.findIndex((item) => item.path === path || item.id === path);

  let updatedList = [];
  let isNowFav = false;

  if (index >= 0) {
    // Remove from favorites
    updatedList = list.filter((_, idx) => idx !== index);
    isNowFav = false;
  } else {
    // Add to favorites
    const newFavItem = {
      id: path,
      name: fileItem.name || path.split('/').pop(),
      path: path,
      uri: fileItem.uri || `file://${path}`,
      size: fileItem.size || 0,
      addedAt: new Date().toISOString(),
    };
    updatedList = [newFavItem, ...list];
    isNowFav = true;
  }

  await saveFavorites(updatedList);
  return isNowFav;
};

/**
 * Removes a file from Favorites by path.
 */
export const removeFavorite = async (filePath) => {
  const list = await getFavorites();
  const updatedList = list.filter((item) => item.path !== filePath && item.id !== filePath);
  await saveFavorites(updatedList);
  return updatedList;
};
