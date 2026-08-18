import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { scanDeviceForTiffs } from '../services/tiffScannerService';

/**
 * AllFilesScreen Component
 * Scans and displays strictly .tif and .tiff files found on device storage.
 */
const AllFilesScreen = ({ navigation }) => {
  const [tiffFiles, setTiffFiles] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  useEffect(() => {
    startTiffScan();
  }, []);

  const startTiffScan = async () => {
    setIsScanning(true);
    setTiffFiles([]);
    setScannedCount(0);

    const discovered = await scanDeviceForTiffs((newFile) => {
      setTiffFiles((prev) => [...prev, newFile]);
      setScannedCount((prev) => prev + 1);
    });

    setTiffFiles(discovered);
    setIsScanning(false);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(1)} MB`;
    }
    return `${kb.toFixed(1)} KB`;
  };

  const handleFileSelect = (file) => {
    navigation.navigate('PickFilesScreen', { file });
  };

  const renderFileItem = ({ item }) => (
    <TouchableOpacity
      style={styles.fileCard}
      onPress={() => handleFileSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>🖼️</Text>
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
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>TIFF Files ({tiffFiles.length})</Text>
      </View>

      {/* Scan Control / Status Header */}
      <View style={styles.statusBox}>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            {isScanning ? `Scanning storage for .tif & .tiff files... (${scannedCount} found)` : `Scan Complete. Found ${tiffFiles.length} TIFF files.`}
          </Text>
          {isScanning && <ActivityIndicator size="small" color="#000000" />}
        </View>

        <TouchableOpacity
          style={[styles.rescanButton, isScanning && styles.disabledButton]}
          disabled={isScanning}
          onPress={startTiffScan}
        >
          <Text style={styles.rescanText}>{isScanning ? 'Scanning...' : 'Re-Scan Storage'}</Text>
        </TouchableOpacity>
      </View>

      {/* TIFF Files List */}
      <View style={styles.listContainer}>
        <FlatList
          data={tiffFiles}
          keyExtractor={(item) => item.id}
          renderItem={renderFileItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !isScanning ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No .tif or .tiff files found on device storage.</Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    fontSize: 16,
    marginRight: 16,
    color: '#000000',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  statusBox: {
    padding: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 13,
    color: '#333333',
    flex: 1,
  },
  rescanButton: {
    backgroundColor: '#000000',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#888888',
  },
  rescanText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  iconContainer: {
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  filePath: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  fileMeta: {
    fontSize: 11,
    color: '#888888',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
});

export default AllFilesScreen;
