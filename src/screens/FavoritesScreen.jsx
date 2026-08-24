import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getFavorites, removeFavorite } from '../services/favoritesService';

/**
 * FavoritesScreen Component
 * Displays and manages bookmarked favorite TIFF files.
 */
const FavoritesScreen = ({ navigation }) => {
  const [favoriteFiles, setFavoriteFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reload favorites every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFavoritesList();
    }, [])
  );

  const loadFavoritesList = async () => {
    setIsLoading(true);
    try {
      const list = await getFavorites();
      setFavoriteFiles(list);
    } catch (error) {
      console.warn('Error loading favorites list:', error);
      setFavoriteFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavoritesList();
    setRefreshing(false);
  };

  const handleRemoveFavorite = (fileItem) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${fileItem.name}" from your Favorites list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = await removeFavorite(fileItem.path);
            setFavoriteFiles(updated);
          },
        },
      ]
    );
  };

  const handleFileSelect = (fileItem) => {
    navigation.navigate('PreviewScreen', { file: fileItem });
  };

  const formatFileSize = (bytes) => {
    const b = Number(bytes) || 0;
    if (b <= 0) return '0 KB';
    const kb = b / 1024;
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(2)} MB`;
    }
    return `${kb.toFixed(1)} KB`;
  };

  const renderFileItem = ({ item }) => (
    <TouchableOpacity
      style={styles.fileCard}
      onPress={() => handleFileSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>❤️</Text>
      </View>

      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.filePath} numberOfLines={1}>
          {item.path}
        </Text>
        <Text style={styles.fileMeta}>Size: {formatFileSize(item.size)}</Text>
      </View>

      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => handleRemoveFavorite(item)}
      >
        <Text style={styles.removeBtnText}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Favorite TIFFs ({favoriteFiles.length})</Text>
      </View>

      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loadingText}>Loading Favorites...</Text>
          </View>
        ) : (
          <FlatList
            data={favoriteFiles}
            keyExtractor={(item) => item.id || item.path}
            renderItem={renderFileItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>⭐</Text>
                <Text style={styles.emptyTitle}>No Favorite TIFF Files Yet</Text>
                <Text style={styles.emptyText}>
                  Tap the ❤️ heart icon on any TIFF file in Auto-Scan or File Viewer to add it to your Favorites list.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    fontSize: 16,
    marginRight: 16,
    color: '#000000',
    fontFamily: 'Poppins-SemiBold',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  iconContainer: {
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 2,
  },
  filePath: {
    fontSize: 11,
    color: '#777777',
    fontFamily: 'Poppins-Regular',
    marginBottom: 2,
  },
  fileMeta: {
    fontSize: 11,
    color: '#555555',
    fontFamily: 'Poppins-Medium',
  },
  removeBtn: {
    padding: 8,
  },
  removeBtnText: {
    fontSize: 18,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Poppins-Regular',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#333333',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#777777',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default FavoritesScreen;
