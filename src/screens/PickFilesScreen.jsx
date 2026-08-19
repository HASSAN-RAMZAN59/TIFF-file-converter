import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { decodeTiffToBase64Uri } from '../services/tiffDecoderService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * PickFilesScreen Component
 * Decodes and previews real TIFF images with page navigation.
 */
const PickFilesScreen = ({ route, navigation }) => {
  const file = route.params?.file || null;
  const [decodedUri, setDecodedUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [decodeError, setDecodeError] = useState(null);

  useEffect(() => {
    if (file) {
      loadTiffImage(0);
    } else {
      setIsLoading(false);
    }
  }, [file]);

  const loadTiffImage = async (pageIdx = 0) => {
    if (!file) return;
    setIsLoading(true);
    setDecodeError(null);

    const filePath = file.path || file.uri;

    try {
      const result = await decodeTiffToBase64Uri(filePath, pageIdx);
      if (result && result.uri) {
        setDecodedUri(result.uri);
        setTotalPages(result.totalPages || 1);
        setCurrentPage(result.pageIndex || 0);
      } else {
        throw new Error('Could not decode image data.');
      }
    } catch (err) {
      console.warn('TIFF Decode Error, attempting native fileUri fallback:', err);
      let rawUri = filePath;
      if (!rawUri.startsWith('content://') && !rawUri.startsWith('file://')) {
        rawUri = `file://${rawUri}`;
      }
      setDecodedUri(rawUri);
      setDecodeError(err?.message || 'Standard preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      loadTiffImage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      loadTiffImage(currentPage - 1);
    }
  };

  const formatFileSize = (bytes) => {
    const b = Number(bytes) || 0;
    if (b <= 0) return 'N/A';
    const kb = b / 1024;
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(2)} MB`;
    }
    return `${kb.toFixed(1)} KB`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>TIFF Image Preview</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {file ? (
          <View style={styles.cardContainer}>
            {/* Real TIFF Image Preview Section */}
            <View style={styles.previewContainer}>
              {isLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#000000" />
                  <Text style={styles.loadingText}>Decoding TIFF Image...</Text>
                </View>
              ) : decodedUri ? (
                <Image
                  source={{ uri: decodedUri }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.placeholderContainer}>
                  <Text style={styles.placeholderIcon}>🖼️</Text>
                  <Text style={styles.placeholderText}>TIFF Document Loaded</Text>
                  <Text style={styles.placeholderSubtext}>{file.name || 'File'}</Text>
                </View>
              )}

              {/* Multi-Page Navigation Overlay Controls */}
              {totalPages > 1 && !isLoading && (
                <View style={styles.pageBar}>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === 0 && styles.pageBtnDisabled]}
                    onPress={handlePrevPage}
                    disabled={currentPage === 0}
                  >
                    <Text style={styles.pageBtnText}>◀ Prev</Text>
                  </TouchableOpacity>

                  <Text style={styles.pageText}>
                    Page {currentPage + 1} of {totalPages}
                  </Text>

                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === totalPages - 1 && styles.pageBtnDisabled]}
                    onPress={handleNextPage}
                    disabled={currentPage === totalPages - 1}
                  >
                    <Text style={styles.pageBtnText}>Next ▶</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* File Info Card */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>File Details</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>File Name:</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {file.name || file.fileName || 'Unknown'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>File Size:</Text>
                <Text style={styles.infoValue}>{formatFileSize(file.size)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>File Path:</Text>
                <Text style={styles.infoValue} numberOfLines={3}>
                  {file.path || file.uri || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No TIFF file selected.</Text>
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    padding: 16,
  },
  cardContainer: {
    gap: 16,
  },
  previewContainer: {
    minHeight: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imagePreview: {
    width: SCREEN_WIDTH - 64,
    height: 300,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
  },
  pageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
  pageBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  pageText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'column',
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666666',
  },
  infoValue: {
    fontSize: 14,
    color: '#111111',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#888888',
  },
});

export default PickFilesScreen;
