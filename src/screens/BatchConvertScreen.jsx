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
} from 'react-native';
import { convertTiffBatch } from '../services/tiffConverterService';

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
  const files = route.params?.files || [];
  const [selectedFormat, setSelectedFormat] = useState('jpg');
  const [isConverting, setIsConverting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    currentIndex: 0,
    totalFiles: files.length,
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

  const renderFileItem = ({ item, index }) => (
    <View style={styles.fileCard}>
      <Text style={styles.fileIndex}>{index + 1}.</Text>
      <View style={styles.fileDetails}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name || 'TIFF File'}
        </Text>
        <Text style={styles.fileSize}>Size: {formatFileSize(item.size)}</Text>
      </View>
      <Text style={styles.formatBadge}>{selectedFormat.toUpperCase()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Batch Conversion ({files.length} Files)</Text>
      </View>

      {/* Global Output Format Selector */}
      <View style={styles.selectorCard}>
        <Text style={styles.cardLabel}>Select Conversion Format for All Files:</Text>
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
                onPress={() => !isConverting && setSelectedFormat(fmt.value)}
                disabled={isConverting}
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
      </View>

      {/* Progress Status Banner when converting */}
      {isConverting && (
        <View style={styles.progressBox}>
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color="#000000" />
            <Text style={styles.progressTitle}>
              Converting {batchProgress.currentIndex} of {batchProgress.totalFiles}...
            </Text>
          </View>
          <Text style={styles.currentFileText} numberOfLines={1}>
            {batchProgress.currentFileName}
          </Text>
        </View>
      )}

      {/* Files List */}
      <View style={styles.listContainer}>
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
  selectorCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#333333',
  },
  formatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  formatChipText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    color: '#444444',
  },
  formatChipTextSelected: {
    color: '#FFFFFF',
  },
  progressBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  progressTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#1565C0',
  },
  currentFileText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#1E88E5',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  listContent: {
    gap: 8,
    paddingBottom: 16,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  fileIndex: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#666666',
    marginRight: 10,
    width: 24,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
  },
  fileSize: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#777777',
    marginTop: 2,
  },
  formatBadge: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#1565C0',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888888',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  convertButton: {
    backgroundColor: '#000000',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#888888',
  },
  convertBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
  },
});

export default BatchConvertScreen;
