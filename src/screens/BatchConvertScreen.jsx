import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { convertTiffBatch } from '../services/tiffConverterService';
import { decodeTiffToBase64Uri, decodeTiffThumbnailFast } from '../services/tiffDecoderService';
import BackIcon from '../assets/Back Press.svg';

const FORMAT_OPTIONS = [
  { label: 'JPG', value: 'jpg', color: '#1976D2' },
  { label: 'PNG', value: 'png', color: '#388E3C' },
  { label: 'WEBP', value: 'webp', color: '#7B1FA2' },
  { label: 'PDF', value: 'pdf', color: '#D32F2F' },
];

const TiffThumbnail = ({ path, style }) => {
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    let isActive = true;
    decodeTiffThumbnailFast(path, 120)
      .then((result) => {
        if (isActive && result && result.uri) {
          setImageUri(result.uri);
        }
      })
      .catch(() => { });

    return () => {
      isActive = false;
    };
  }, [path]);

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[style, { borderWidth: 0 }]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="small" color="#D1D5DB" />
    </View>
  );
};

/**
 * BatchConvertScreen Component
 * Converts multiple TIFF files to JPG, PNG, WEBP, or PDF in real-time.
 */
const BatchConvertScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const initialFiles = route.params?.files || [];
  const resumeQueue = route.params?.resumeQueue || null;
  const [files, setFiles] = useState(initialFiles);
  const [selectedFormat, setSelectedFormat] = useState(resumeQueue?.targetFormat || 'jpg');
  const [isConverting, setIsConverting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    currentIndex: resumeQueue?.currentIndex || 0,
    totalFiles: initialFiles.length,
    currentFileName: '',
    progress: resumeQueue ? Math.round(((resumeQueue.currentIndex) / initialFiles.length) * 100) : 0,
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

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [batchSuccessInfo, setBatchSuccessInfo] = useState({ count: 0, total: 0, format: 'JPG' });

  // Auto resume batch if requested via resumeQueue param
  useEffect(() => {
    if (resumeQueue && resumeQueue.files && resumeQueue.files.length > 0) {
      const startIndex = resumeQueue.currentIndex || 0;
      const targetFmt = resumeQueue.targetFormat || 'jpg';
      handleStartBatchConversion(startIndex, targetFmt);
    }
  }, []);

  const handleStartBatchConversion = async (startIndex = 0, formatToUse = null) => {
    if (files.length === 0) {
      Alert.alert('No Files', 'Please select at least one TIFF file.');
      return;
    }

    const safeStartIndex = typeof startIndex === 'number' ? startIndex : 0;
    const fmt = typeof formatToUse === 'string' && formatToUse ? formatToUse : selectedFormat;
    setIsConverting(true);
    setBatchProgress({
      currentIndex: safeStartIndex,
      totalFiles: files.length,
      currentFileName: safeStartIndex > 0 ? 'Resuming batch...' : 'Starting batch...',
      progress: Math.round((safeStartIndex / files.length) * 100),
    });

    try {
      const results = await convertTiffBatch(
        files,
        fmt,
        (progressInfo) => {
          setBatchProgress(progressInfo);
        },
        safeStartIndex
      );

      const successCount = results.filter((r) => r.success).length;

      setBatchSuccessInfo({
        count: successCount + safeStartIndex,
        total: files.length,
        format: fmt.toUpperCase(),
      });
      setSuccessModalVisible(true);
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
    const fmt = (selectedFormat || 'JPG').toUpperCase();
    const formatColor =
      fmt === 'PDF' ? '#D63230' :
      fmt === 'JPG' || fmt === 'JPEG' ? '#0E8131' :
      fmt === 'WEBP' ? '#867AE3' :
      fmt === 'PNG' ? '#2676D9' :
      fmt === 'TIFF' || fmt === 'TIF' ? '#EAB308' : '#0E8131';

    return (
      <TouchableOpacity
        style={[styles.fileCard, !isLast && styles.fileCardBorder]}
        onPress={() => handleOpenPreview(item)}
        activeOpacity={0.7}
      >
        <View style={styles.thumbnailWrapper}>
          <TiffThumbnail path={item.path || item.uri} style={styles.thumbnailPlaceholder} />
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
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <BackIcon width={20} height={20} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{t('Batch Conversion')}</Text>
            <Text style={styles.headerSubtitle}>{files.length} {t('TIFF files selected')}</Text>
          </View>
        </View>
      </View>

      {/* Scrollable Body */}
      <ScrollView
        style={styles.scrollViewBody}
        contentContainerStyle={styles.scrollContentBody}
        showsVerticalScrollIndicator={false}
      >
        {/* Global Output Format Selector */}
        <View style={styles.formatSelectorWrapper}>
          <Text style={styles.cardLabel}>{t('Choose Output Format')}</Text>
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
                  {isSelected && (
                    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 1 1" preserveAspectRatio="none">
                      <Defs>
                        <LinearGradient id={`batchChipGrad_${fmt.value}`} x1="0" y1="0" x2="1" y2="0">
                          <Stop offset="0%" stopColor="#1A6CFA" />
                          <Stop offset="100%" stopColor="#3FA5FC" />
                        </LinearGradient>
                      </Defs>
                      <Rect x="0" y="0" width="1" height="1" fill={`url(#batchChipGrad_${fmt.value})`} />
                    </Svg>
                  )}
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
                {t('Converting')} {batchProgress.currentIndex} {t('of')} {batchProgress.totalFiles}...
              </Text>
            </View>
            <Text style={styles.currentFileText} numberOfLines={1}>
              {batchProgress.currentFileName}
            </Text>
          </View>
        )}

        {/* Files List Card (Wraps dynamically up to last item) */}
        {files.length > 0 ? (
          <View style={styles.listCardContainer}>
            {files.map((item, index) => (
              <React.Fragment key={item.uri || item.path || index.toString()}>
                {renderFileItem({ item, index })}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t('No TIFF files selected for batch conversion.')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Start Batch Trigger Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.convertButton, (isConverting || files.length === 0) && styles.disabledButton]}
          onPress={() => handleStartBatchConversion(0, selectedFormat)}
          disabled={isConverting || files.length === 0}
        >
          {!(isConverting || files.length === 0) && (
            <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 1 1" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="batchConvertBtnGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#1A6CFA" />
                  <Stop offset="100%" stopColor="#3FA5FC" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="1" height="1" fill="url(#batchConvertBtnGrad)" />
            </Svg>
          )}
          <Text style={styles.convertBtnText}>
            {isConverting
              ? `${t('Processing')} (${batchProgress.progress}%)...`
              : `${t('Convert')} ${files.length} ${t('Files to')} ${selectedFormat.toUpperCase()}`}
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
                  <Text style={styles.modalLoadingText}>{t('Decoding TIFF image...')}</Text>
                </View>
              ) : previewImageUri ? (
                <Image
                  source={{ uri: previewImageUri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.modalLoadingBox}>
                  <Text style={styles.modalLoadingText}>{t('Unable to preview TIFF file')}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Matching UI Success Modal for Batch Conversion */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.successModalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setSuccessModalVisible(false)}
          />

          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successCheckmark}>✓</Text>
            </View>

            <Text style={styles.successModalTitle}>{t('Success!')}</Text>
            <Text style={styles.successModalSubtitle}>
              {t('Successfully converted')} <Text style={styles.highlightText}>{batchSuccessInfo.count} {t('of')} {batchSuccessInfo.total} {t('files')}</Text> {t('into')} <Text style={styles.highlightText}>{batchSuccessInfo.format}</Text> {t('format and saved to storage.')}
            </Text>

            <View style={styles.successActionsRow}>
              <TouchableOpacity
                style={styles.successCloseBtn}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'HomeScreen' }],
                  });
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.successCloseBtnText}>{t('Done')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.successViewBtn}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.reset({
                    index: 1,
                    routes: [
                      { name: 'HomeScreen' },
                      { name: 'ConvertedFilesScreen' },
                    ],
                  });
                }}
                activeOpacity={0.8}
              >
                <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 1 1" preserveAspectRatio="none">
                  <Defs>
                    <LinearGradient id="batchSuccessViewBtnGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#1A6CFA" />
                      <Stop offset="100%" stopColor="#3FA5FC" />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width="1" height="1" fill="url(#batchSuccessViewBtnGrad)" />
                </Svg>
                <Text style={styles.successViewBtnText}>{t('View All')}</Text>
              </TouchableOpacity>
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 0,
    fontFamily: 'Poppins-Medium',
  },
  formatSelectorWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
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
    height: 36,
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatChipActive: {
    overflow: 'hidden',
    shadowColor: '#1A6CFA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  formatChipText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#4B5563',
  },
  formatChipTextActive: {
    fontFamily: 'Poppins-Medium',
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
    fontFamily: 'Poppins-Medium',
    color: '#1D4ED8',
  },
  currentFileText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#2563EB',
  },
  scrollViewBody: {
    flex: 1,
  },
  scrollContentBody: {
    paddingBottom: 24,
  },
  listCardContainer: {
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
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },
  fileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 12.5,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
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
    fontFamily: 'Poppins-Medium',
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: 'transparent',
  },
  convertButton: {
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1A6CFA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A6CFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  convertBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
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
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
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
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins-Medium',
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
    color: '#6B7280',
    fontFamily: 'Poppins-Regular',
  },

  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  successIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  successCheckmark: {
    fontSize: 28,
    color: '#10B981',
    fontFamily: 'Poppins-Medium',
  },
  successModalTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Regular',
    color: '#1E1E1E',
    marginBottom: 2,
    textAlign: 'center',
  },
  successModalSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  highlightText: {
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
  },
  successActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  successCloseBtn: {
    flex: 1,
    paddingVertical: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCloseBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#64748B',
  },
  successViewBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1A6CFA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A6CFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  successViewBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },
});

export default BatchConvertScreen;
