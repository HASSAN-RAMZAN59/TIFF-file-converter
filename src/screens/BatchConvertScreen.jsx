import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import { convertTiffBatch } from '../services/tiffConverterService';
import { decodeTiffToBase64Uri } from '../services/tiffDecoderService';

const FORMAT_OPTIONS = [
  { label: 'JPG', value: 'jpg', color: '#1976D2' },
  { label: 'PNG', value: 'png', color: '#388E3C' },
  { label: 'WEBP', value: 'webp', color: '#7B1FA2' },
  { label: 'PDF', value: 'pdf', color: '#D32F2F' },
];

/**
 * BatchConvertScreen Component
 * Converts multiple TIFF files to JPG, PNG, WEBP, or PDF in real-time.
 */
const BatchConvertScreen = ({ route, navigation }) => {
  const initialFiles = route.params?.files || [];
  const [files, setFiles] = useState(initialFiles);
  const [selectedFormat, setSelectedFormat] = useState('jpg');
  const [isConverting, setIsConverting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    currentIndex: 0,
    totalFiles: initialFiles.length,
    currentFileName: '',
    progress: 0,
  });

  const formatFileSize = (bytes) => {
    const b = Number(bytes) || 0;
    if (b <= 0) return '0 KB';
    const kb = b / 1024;
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(1)} MB`;
    }
    return `${kb.toFixed(1)} KB`;
  };

  const handleRemoveFile = (indexToRemove) => {
    if (isConverting) return;
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // REAL-TIME BATCH CONVERSION TRIGGER
  const handleStartBatchConversion = async () => {
    if (!files || files.length === 0) {
      Alert.alert('No Files', 'No TIFF files selected for batch conversion.');
      return;
    }

    setIsConverting(true);

    try {
      const results = await convertTiffBatch(files, selectedFormat, (progressInfo) => {
        setBatchProgress(progressInfo);
      });

      const successCount = results.filter((r) => r.success).length;

      Alert.alert(
        'Batch Conversion Finished! 🎉',
        `Successfully converted ${successCount} of ${files.length} TIFF files to ${selectedFormat.toUpperCase()}.\n\nFiles saved to Device Storage (Download/TIFF_Converted).`,
        [
          {
            text: 'View Converted Files',
            onPress: () => navigation.navigate('ConvertedFilesScreen'),
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.warn('Batch Conversion error:', error);
      Alert.alert('Batch Conversion Error', 'An error occurred during batch conversion.');
    } finally {
      setIsConverting(false);
    }
  };

  const [previewFile, setPreviewFile] = useState(null);
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const handleOpenPreview = async (file) => {
    setPreviewFile(file);
    setPreviewImageUri(null);
    setIsLoadingPreview(true);
    try {
      const filePath = file.path || file.uri;
      const result = await decodeTiffToBase64Uri(filePath, 0);
      if (result && result.uri) {
        setPreviewImageUri(result.uri);
      }
    } catch (err) {
      console.warn('Failed to load TIFF preview in modal:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
    setPreviewImageUri(null);
    setIsLoadingPreview(false);
  };

  const renderFileItem = ({ item, index }) => {
    const isLast = index === files.length - 1;
    const formatColor = selectedFormat === 'pdf' ? '#EF4444' : selectedFormat === 'png' ? '#3B82F6' : '#10B981';

    return (
      <TouchableOpacity 
        style={[styles.fileCard, !isLast && styles.fileCardBorder]}
        onPress={() => handleOpenPreview(item)}
        activeOpacity={0.7}
      >
        <View style={styles.thumbnailWrapper}>
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.docIconPlaceholder}>🖼️</Text>
          </View>
          <View style={[styles.formatBadgeBadge, { backgroundColor: formatColor }]}>
            <Text style={styles.formatBadgeText}>{selectedFormat.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.name || 'TIFF File'}
          </Text>
          <Text style={styles.fileSize}>Size: {formatFileSize(item.size)}</Text>
        </View>

        {!isConverting && (
          <TouchableOpacity 
            style={styles.removeBtn} 
            onPress={() => handleRemoveFile(index)}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.removeIconCircle}>
              <Text style={styles.removeIconText}>✕</Text>
            </View>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Batch Conversion</Text>
        <Text style={styles.headerSubtitle}>{files.length} TIFF files selected</Text>
      </View>

      {/* Global Output Format Selector */}
      <View style={styles.formatSelectorWrapper}>
        <Text style={styles.cardLabel}>Choose Output Format</Text>
        <View style={styles.formatRow}>
          {FORMAT_OPTIONS.map((fmt) => {
            const isSelected = selectedFormat === fmt.value;
            return (
              <TouchableOpacity
                key={fmt.value}
                style={[styles.formatChip, isSelected && styles.formatChipActive]}
                onPress={() => !isConverting && setSelectedFormat(fmt.value)}
                disabled={isConverting}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.formatChipText,
                    isSelected && styles.formatChipTextActive,
                  ]}
                >
                  {fmt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Progress Status Banner when converting */}
      {isConverting && (
        <View style={styles.progressBox}>
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.progressTitle}>
              Converting {batchProgress.currentIndex} of {batchProgress.totalFiles}...
            </Text>
          </View>
          <Text style={styles.currentFileText} numberOfLines={1}>
            {batchProgress.currentFileName}
          </Text>
        </View>
      )}

      {/* Files List Card */}
      <View style={styles.listCardContainer}>
        <FlatList
          data={files}
          keyExtractor={(item, idx) => item.uri || item.path || idx.toString()}
          renderItem={renderFileItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No TIFF files selected for batch conversion.</Text>
            </View>
          }
        />
      </View>

      {/* Start Batch Trigger Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.convertButton, (isConverting || files.length === 0) && styles.disabledButton]}
          onPress={handleStartBatchConversion}
          disabled={isConverting || files.length === 0}
        >
          <Text style={styles.convertBtnText}>
            {isConverting
              ? `Processing (${batchProgress.progress}%)...`
              : `Convert ${files.length} Files to ${selectedFormat.toUpperCase()}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview Modal with Glassy Dark Backdrop */}
      <Modal
        visible={!!previewFile}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClosePreview}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdropTap} 
            activeOpacity={1} 
            onPress={handleClosePreview} 
          />
          
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalFileName} numberOfLines={1}>
                  {previewFile?.name || 'TIFF Preview'}
                </Text>
                <Text style={styles.modalFileSize}>
                  Size: {formatFileSize(previewFile?.size)}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseBtn} 
                onPress={handleClosePreview}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalImageContainer}>
              {isLoadingPreview ? (
                <View style={styles.modalLoadingBox}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={styles.modalLoadingText}>Decoding TIFF image...</Text>
                </View>
              ) : previewImageUri ? (
                <Image 
                  source={{ uri: previewImageUri }} 
                  style={styles.modalImage} 
                  resizeMode="contain" 
                />
              ) : (
                <View style={styles.modalLoadingBox}>
                  <Text style={styles.modalLoadingText}>Unable to preview TIFF file</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Poppins-Medium',
  },
  formatSelectorWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: '#374151',
    marginBottom: 10,
  },
  formatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  formatChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatChipActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  formatChipText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#4B5563',
  },
  formatChipTextActive: {
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  progressBox: {
    backgroundColor: '#EFF6FF',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  progressTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    color: '#1D4ED8',
  },
  currentFileText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#2563EB',
  },
  listCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  listContent: {
    paddingVertical: 8,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  fileCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  thumbnailPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docIconPlaceholder: {
    fontSize: 18,
  },
  formatBadgeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#10B981',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  formatBadgeText: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  fileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
  },
  removeBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIconText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontFamily: 'Poppins-Bold',
    lineHeight: 12,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  convertButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  convertBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
  },
  // Modal Preview Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalFileName: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  modalFileSize: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalCloseBtnText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Poppins-Bold',
  },
  modalImageContainer: {
    height: 320,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Poppins-Medium',
  },
});

export default BatchConvertScreen;
