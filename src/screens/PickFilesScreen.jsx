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
  Alert,
  Dimensions,
} from 'react-native';
import { decodeTiffToBase64Uri } from '../services/tiffDecoderService';
import { convertTiffFile } from '../services/tiffConverterService';
import { isFavoriteFile, toggleFavorite } from '../services/favoritesService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FORMAT_OPTIONS = [
  { label: 'JPG', value: 'jpg', color: '#1976D2' },
  { label: 'PNG', value: 'png', color: '#388E3C' },
  { label: 'WEBP', value: 'webp', color: '#7B1FA2' },
  { label: 'PDF', value: 'pdf', color: '#D32F2F' },
];

/**
 * PickFilesScreen Component
 * Decodes and previews real TIFF images with page navigation, conversion, and Favorite bookmarking.
 */
const PickFilesScreen = ({ route, navigation }) => {
  const file = route.params?.file || null;
  const [decodedUri, setDecodedUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFormat, setSelectedFormat] = useState('jpg');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (file) {
      loadTiffImage(0);
      checkFavoriteStatus();
    } else {
      setIsLoading(false);
    }
  }, [file]);

  const checkFavoriteStatus = async () => {
    if (!file) return;
    const path = file.path || file.uri;
    const favStatus = await isFavoriteFile(path);
    setIsFav(favStatus);
  };

  const handleToggleFav = async () => {
    if (!file) return;
    const newStatus = await toggleFavorite(file);
    setIsFav(newStatus);
  };

  const loadTiffImage = async (pageIdx = 0) => {
    if (!file) return;
    setIsLoading(true);

    const filePath = file.path || file.uri;

    try {
      const result = await decodeTiffToBase64Uri(filePath, pageIdx);
      if (result && result.uri) {
        setDecodedUri(result.uri);
        setTotalPages(result.totalPages || 1);
        setCurrentPage(result.pageIndex || 0);
      }
    } catch (err) {
      console.warn('TIFF Decode Error, fallback to raw uri:', err);
      let rawUri = filePath;
      if (!rawUri.startsWith('content://') && !rawUri.startsWith('file://')) {
        rawUri = `file://${rawUri}`;
      }
      setDecodedUri(rawUri);
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

  // REAL-TIME CONVERSION TRIGGER
  const handleStartConversion = async () => {
    if (!file) return;
    setIsConverting(true);
    setConversionProgress(10);

    const sourcePath = file.path || file.uri;

    try {
      const result = await convertTiffFile(sourcePath, selectedFormat, (progress) => {
        setConversionProgress(progress);
      });

      if (result && result.success) {
        Alert.alert(
          'Conversion Complete! 🎉',
          `File successfully saved to Device Storage:\n\n📁 ${result.outputFileName}\n\nLocation:\n${result.outputPath}`,
          [
            {
              text: 'View Converted Files',
              onPress: () => navigation.navigate('ConvertedFilesScreen'),
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.warn('Real conversion error:', error);
      Alert.alert('Conversion Failed', error?.message || 'Failed to convert TIFF file.');
    } finally {
      setIsConverting(false);
      setConversionProgress(0);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>TIFF File Viewer & Converter</Text>
        <TouchableOpacity style={styles.headerFavBtn} onPress={handleToggleFav}>
          <Text style={styles.headerFavIcon}>{isFav ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {file ? (
          <View style={styles.cardContainer}>
            {/* Real TIFF Image Preview Section */}
            <View style={styles.previewContainer}>
              {isLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#000000" />
                  <Text style={styles.loadingText}>Loading TIFF Preview...</Text>
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

              {/* Multi-Page Controls */}
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

            {/* Target Conversion Format Selector */}
            <View style={styles.conversionBox}>
              <Text style={styles.boxTitle}>Select Output Format:</Text>
              <View style={styles.formatsRow}>
                {FORMAT_OPTIONS.map((fmt) => {
                  const isSelected = selectedFormat === fmt.value;
                  return (
                    <TouchableOpacity
                      key={fmt.value}
                      style={[
                        styles.formatChip,
                        isSelected && { backgroundColor: fmt.color, borderColor: fmt.color },
                      ]}
                      onPress={() => setSelectedFormat(fmt.value)}
                    >
                      <Text
                        style={[
                          styles.formatChipText,
                          isSelected && styles.formatChipTextSelected,
                        ]}
                      >
                        {fmt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Convert Trigger Button */}
              <TouchableOpacity
                style={[styles.convertButton, isConverting && styles.convertButtonDisabled]}
                onPress={handleStartConversion}
                disabled={isConverting}
              >
                {isConverting ? (
                  <View style={styles.progressRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.convertBtnText}>Converting... ({conversionProgress}%)</Text>
                  </View>
                ) : (
                  <Text style={styles.convertBtnText}>
                    Convert to {selectedFormat.toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* File Info Details */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>File Information</Text>

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
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  headerFavBtn: {
    padding: 4,
  },
  headerFavIcon: {
    fontSize: 22,
  },
  scrollContent: {
    padding: 16,
  },
  cardContainer: {
    gap: 16,
  },
  previewContainer: {
    minHeight: 300,
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
    height: 280,
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
  conversionBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 12,
  },
  boxTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
  },
  formatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formatChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  formatChipText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#444444',
  },
  formatChipTextSelected: {
    color: '#FFFFFF',
  },
  convertButton: {
    backgroundColor: '#000000',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  convertButtonDisabled: {
    backgroundColor: '#888888',
  },
  convertBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
