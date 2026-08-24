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
  StatusBar,
  Modal,
} from 'react-native';
import { decodeTiffToBase64Uri } from '../services/tiffDecoderService';
import { convertTiffFile } from '../services/tiffConverterService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FORMAT_OPTIONS = [
  { label: 'PNG', value: 'png' },
  { label: 'JPG', value: 'jpg' },
  { label: 'PDF', value: 'pdf' },
  { label: 'WEBP', value: 'webp' },
];

const PickFilesScreen = ({ route, navigation }) => {
  const initialFile = route.params?.file || null;
  const [currentFile, setCurrentFile] = useState(initialFile);
  const [decodedUri, setDecodedUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState('png');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [convertedResult, setConvertedResult] = useState(null);

  useEffect(() => {
    if (route.params?.editedFile) {
      const ed = route.params.editedFile;
      setCurrentFile({
        ...currentFile,
        name: ed.name,
        path: ed.path,
        uri: ed.uri,
      });
      if (ed.previewUri) {
        setDecodedUri(ed.previewUri);
      }
    } else if (initialFile) {
      setCurrentFile(initialFile);
      loadTiffImage(initialFile, 0);
    } else {
      setIsLoading(false);
    }
  }, [route.params?.editedFile, initialFile]);

  const loadTiffImage = async (targetFile, pageIdx = 0) => {
    const f = targetFile || currentFile;
    if (!f) return;
    setIsLoading(true);
    const filePath = f.path || f.uri;
    try {
      const result = await decodeTiffToBase64Uri(filePath, pageIdx);
      if (result && result.uri) {
        setDecodedUri(result.uri);
      }
    } catch (err) {
      let rawUri = filePath;
      if (!rawUri.startsWith('content://') && !rawUri.startsWith('file://')) {
        rawUri = `file://${rawUri}`;
      }
      setDecodedUri(rawUri);
    } finally {
      setIsLoading(false);
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

  const estimateConvertedSize = (bytes, format) => {
    const b = Number(bytes) || 0;
    if (b <= 0) return 'Unknown';
    let multiplier = 0.9;
    if (format === 'jpg') multiplier = 0.5;
    if (format === 'webp') multiplier = 0.4;
    if (format === 'pdf') multiplier = 0.8;
    return formatFileSize(b * multiplier);
  };

  const getReadablePath = (pathString) => {
    if (!pathString) return 'N/A';
    let p = pathString;
    
    if (p.startsWith('content://')) {
      if (p.includes('downloads')) return 'Internal Storage / Downloads';
      if (p.includes('media')) return 'Internal Storage / Media';
      return 'Internal Storage / Documents';
    }
    
    p = p.replace('/storage/emulated/0', 'Internal Storage');
    p = p.replace('file://', '');
    return p;
  };

  const handleStartConversion = async () => {
    if (!currentFile) return;
    setIsConverting(true);
    setConversionProgress(10);
    const sourcePath = currentFile.path || currentFile.uri;
    try {
      const result = await convertTiffFile(sourcePath, selectedFormat, (progress) => {
        setConversionProgress(progress);
      });
      if (result && result.success) {
        setConvertedResult(result);
        setSuccessModalVisible(true);
      }
    } catch (error) {
      Alert.alert('Conversion Failed', error?.message || 'Failed to convert TIFF file.');
    } finally {
      setIsConverting(false);
      setConversionProgress(0);
    }
  };

  if (!currentFile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>No TIFF file selected.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TIFF File Viewer & Converter</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Image Placeholder / Preview with Tap to Preview / Edit */}
        <TouchableOpacity
          style={styles.imageWrapper}
          activeOpacity={0.8}
          onPress={() => {
            if (currentFile) {
              navigation.navigate('PreviewScreen', {
                file: currentFile,
                fromScreen: 'PickFilesScreen',
              });
            }
          }}
        >
          {isLoading ? (
            <View style={styles.placeholderBox}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : decodedUri ? (
            <Image source={{ uri: decodedUri }} style={styles.mainImage} resizeMode="contain" />
          ) : (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderText}>Image Preview</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Format Selector */}
        <View style={styles.formatRow}>
          {FORMAT_OPTIONS.map((fmt) => {
            const isSelected = selectedFormat === fmt.value;
            return (
              <TouchableOpacity
                key={fmt.value}
                style={[styles.formatChip, isSelected && styles.formatChipActive]}
                onPress={() => setSelectedFormat(fmt.value)}
              >
                <Text style={[styles.formatChipText, isSelected && styles.formatChipTextActive]}>
                  {fmt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* File Information Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>File Information</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>File Name:</Text>
            <Text style={styles.infoValue}>{currentFile?.name || currentFile?.fileName || 'Unknown'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>File Size:</Text>
            <Text style={styles.infoValue}>{formatFileSize(currentFile?.size)}</Text>
          </View>

          <View style={styles.infoItemExtra}>
            <Text style={styles.infoTextAfterConvert}>
              After Converting this file in <Text style={styles.boldText}>{selectedFormat.toUpperCase()}</Text> size will be
            </Text>
            <Text style={styles.infoValueSmall}>{estimateConvertedSize(currentFile?.size, selectedFormat)}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>File Path:</Text>
            <Text style={styles.infoValueLight}>{getReadablePath(currentFile?.path || currentFile?.uri)}</Text>
          </View>
        </View>

        {/* Convert Button */}
        <TouchableOpacity 
          style={[styles.convertBtnPrimary, isConverting && styles.convertBtnDisabled]} 
          onPress={handleStartConversion}
          disabled={isConverting}
        >
          {isConverting ? (
            <Text style={styles.convertBtnTextPrimary}>Converting... {conversionProgress}%</Text>
          ) : (
            <Text style={styles.convertBtnTextPrimary}>Convert to {selectedFormat.toUpperCase()}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Matching UI Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setSuccessModalVisible(false)}
          />

          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successCheckmark}>✓</Text>
            </View>

            <Text style={styles.successModalTitle}>Conversion Complete</Text>
            <Text style={styles.successModalSubtitle}>
              Your file has been converted and saved to storage.
            </Text>

            <View style={styles.successDetailsBox}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>File Name</Text>
                <Text style={styles.successDetailValue} numberOfLines={1}>
                  {convertedResult?.outputFileName || 'Converted File'}
                </Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Format</Text>
                <View style={styles.successFormatBadge}>
                  <Text style={styles.successFormatBadgeText}>
                    {convertedResult?.format || selectedFormat.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.successActionsRow}>
              <TouchableOpacity
                style={styles.successCloseBtn}
                onPress={() => setSuccessModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.successCloseBtnText}>Done</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.successViewBtn}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.navigate('ConvertedFilesScreen');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.successViewBtnText}>View Files</Text>
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
  emptyText: {
    padding: 32,
    textAlign: 'center',
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  imageWrapper: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontFamily: 'Poppins-Medium',
  },
  formatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoCardTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoItem: {
    marginBottom: 8,
  },
  infoItemExtra: {
    marginBottom: 10,
    marginTop: 0,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    color: '#374151',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
  },
  infoTextAfterConvert: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#374151',
    marginBottom: 2,
  },
  boldText: {
    fontFamily: 'Poppins-Bold',
  },
  infoValueSmall: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    color: '#6B7280',
  },
  infoValueLight: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    lineHeight: 16,
  },
  convertBtnPrimary: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    marginHorizontal: 16,
  },
  convertBtnDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0.1,
  },
  convertBtnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBackdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 340,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successCheckmark: {
    fontSize: 28,
    color: '#10B981',
    fontFamily: 'Poppins-Bold',
  },
  successModalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  successModalSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  successDetailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  successDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successDetailLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#64748B',
  },
  successDetailValue: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#1E293B',
    maxWidth: '65%',
  },
  successFormatBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  successFormatBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  successActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  successCloseBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCloseBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#64748B',
  },
  successViewBtn: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  successViewBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
});

export default PickFilesScreen;
