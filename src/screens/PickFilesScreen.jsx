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
  const file = route.params?.file || null;
  const [decodedUri, setDecodedUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState('png');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);

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
    const filePath = file.path || file.uri;
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
          `File successfully saved to Device Storage:\n\n📁 ${result.outputFileName}`,
          [
            { text: 'View Converted Files', onPress: () => navigation.navigate('ConvertedFilesScreen') },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Conversion Failed', error?.message || 'Failed to convert TIFF file.');
    } finally {
      setIsConverting(false);
      setConversionProgress(0);
    }
  };

  if (!file) {
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
        
        {/* Image Placeholder / Preview */}
        <View style={styles.imageWrapper}>
          {isLoading ? (
            <View style={styles.placeholderBox}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : decodedUri ? (
            <Image source={{ uri: decodedUri }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderText}>Image Preview</Text>
            </View>
          )}
        </View>

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
            <Text style={styles.infoValue}>{file.name || file.fileName || 'Unknown'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>File Size:</Text>
            <Text style={styles.infoValue}>{formatFileSize(file.size)}</Text>
          </View>

          <View style={styles.infoItemExtra}>
            <Text style={styles.infoTextAfterConvert}>
              After Converting this file in <Text style={styles.boldText}>{selectedFormat.toUpperCase()}</Text> size will be
            </Text>
            <Text style={styles.infoValueSmall}>{estimateConvertedSize(file.size, selectedFormat)}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>File Path:</Text>
            <Text style={styles.infoValueLight}>{getReadablePath(file.path || file.uri)}</Text>
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
    borderRadius: 12,
    alignItems: 'center',
  },
  formatChipActive: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  formatChipText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#4B5563',
  },
  formatChipTextActive: {
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
});

export default PickFilesScreen;
