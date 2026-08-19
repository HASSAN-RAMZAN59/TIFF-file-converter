import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import { getOutputDir } from '../services/tiffConverterService';

/**
 * ConvertedFilesScreen Component
 * Scans and manages exported converted files saved in device storage (Download/TIFF_Converted).
 * Uses useFocusEffect for real-time automatic list reloads when entering screen.
 */
const ConvertedFilesScreen = ({ navigation }) => {
  const [convertedFiles, setConvertedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Reload converted files every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConvertedFiles();
    }, [])
  );

  const loadConvertedFiles = async () => {
    setIsLoading(true);
    try {
      const outputDir = await getOutputDir();
      const exists = await RNFS.exists(outputDir);

      if (exists) {
        const items = await RNFS.readDir(outputDir);
        const files = items
          .filter((item) => item.isFile() && (item.size || 0) > 0)
          .map((item) => {
            const ext = item.name.split('.').pop().toLowerCase();
            return {
              id: item.path,
              name: item.name,
              path: item.path,
              uri: `file://${item.path}`,
              size: item.size || 0,
              format: ext.toUpperCase(),
              mtime: item.mtime || new Date(),
            };
          })
          .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));

        setConvertedFiles(files);
      } else {
        setConvertedFiles([]);
      }
    } catch (error) {
      console.warn('Error reading converted files:', error);
      setConvertedFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConvertedFiles();
    setRefreshing(false);
  };

  const handleDeleteFile = (fileItem) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete ${fileItem.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await RNFS.unlink(fileItem.path);
              setConvertedFiles((prev) => prev.filter((f) => f.path !== fileItem.path));
            } catch (err) {
              Alert.alert('Delete Error', 'Could not delete file.');
            }
          },
        },
      ]
    );
  };

  const handleFilePress = (item) => {
    if (['JPG', 'JPEG', 'PNG', 'WEBP', 'BMP'].includes(item.format)) {
      setPreviewFile(item);
    } else {
      Alert.alert(
        'Converted PDF Saved',
        `PDF File saved at:\n${item.path}\n\nYou can open this file using any PDF reader app on your phone.`
      );
    }
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

  const getFormatBadgeStyle = (format) => {
    switch (format) {
      case 'PDF':
        return { backgroundColor: '#FFEBEE', color: '#D32F2F' };
      case 'PNG':
        return { backgroundColor: '#E8F5E9', color: '#388E3C' };
      case 'WEBP':
        return { backgroundColor: '#F3E5F5', color: '#7B1FA2' };
      case 'JPG':
      case 'JPEG':
      default:
        return { backgroundColor: '#E3F2FD', color: '#1976D2' };
    }
  };

  const renderFileItem = ({ item }) => {
    const badgeStyle = getFormatBadgeStyle(item.format);
    return (
      <TouchableOpacity
        style={styles.fileCard}
        onPress={() => handleFilePress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.badgeContainer, { backgroundColor: badgeStyle.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{item.format}</Text>
        </View>

        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.filePath} numberOfLines={1}>
            {item.path}
          </Text>
          <Text style={styles.fileMeta}>Size: {formatFileSize(item.size)}</Text>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteFile(item)}>
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Converted Outputs ({convertedFiles.length})</Text>
      </View>

      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loadingText}>Loading Converted Files...</Text>
          </View>
        ) : (
          <FlatList
            data={convertedFiles}
            keyExtractor={(item) => item.id}
            renderItem={renderFileItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No Converted Files Found</Text>
                <Text style={styles.emptyText}>
                  Your exported JPG, PNG, WEBP, and PDF files will appear here once converted.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Image Preview Modal */}
      {previewFile && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {previewFile.name}
                </Text>
                <TouchableOpacity onPress={() => setPreviewFile(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Image
                  source={{ uri: previewFile.uri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
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
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  filePath: {
    fontSize: 11,
    color: '#777777',
    marginBottom: 2,
  },
  fileMeta: {
    fontSize: 11,
    color: '#555555',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
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
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  closeBtn: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
    paddingHorizontal: 8,
  },
  modalBody: {
    padding: 16,
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 320,
  },
});

export default ConvertedFilesScreen;
