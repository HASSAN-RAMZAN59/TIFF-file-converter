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
import {
  checkOsStoragePermission,
  requestOsStoragePermissionDialog,
} from '../services/permissionService';

/**
 * AllFilesScreen Component
 * Fast single-pass scanner for .tif and .tiff files (> 0 KB).
 */
const AllFilesScreen = ({ navigation }) => {
  const [tiffFiles, setTiffFiles] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);

  useEffect(() => {
    initAndScan();
  }, []);

  const initAndScan = async () => {
    const permitted = await checkOsStoragePermission();
    setHasPermission(permitted);
    if (permitted) {
      startTiffScan();
    } else {
      const granted = await requestOsStoragePermissionDialog();
      setHasPermission(granted);
      if (granted) {
        startTiffScan();
      }
    }
  };

  const startTiffScan = async () => {
    setIsScanning(true);
    setTiffFiles([]);

    // Execute fast single-pass scan
    const discovered = await scanDeviceForTiffs();
    // Filter out 0-byte or empty files (< 100 bytes)
    const validFiles = discovered.filter((f) => (Number(f.size) || 0) > 100);
    console.log('Single-pass Scan Discovered Valid Files Count:', validFiles.length);
    
    setTiffFiles(validFiles);
    setIsScanning(false);
  };

  const handleGrantPermission = async () => {
    const granted = await requestOsStoragePermissionDialog();
    setHasPermission(granted);
    if (granted) {
      startTiffScan();
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

      {/* Permission Warning Banner */}
      {!hasPermission && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            Storage access permission is required to scan device files.
          </Text>
          <TouchableOpacity style={styles.grantButton} onPress={handleGrantPermission}>
            <Text style={styles.grantButtonText}>Grant Storage Access</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scan Control / Status Header */}
      <View style={styles.statusBox}>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            {isScanning
              ? 'Scanning storage for TIFF files...'
              : `Scan Complete. Found ${tiffFiles.length} valid TIFF files.`}
          </Text>
          {isScanning && <ActivityIndicator size="small" color="#000000" />}
        </View>

        <TouchableOpacity
          style={[styles.rescanButton, isScanning && styles.disabledButton]}
          disabled={isScanning}
          onPress={() => {
            if (!hasPermission) {
              handleGrantPermission();
            } else {
              startTiffScan();
            }
          }}
        >
          <Text style={styles.rescanText}>{isScanning ? 'Scanning...' : 'Re-Scan Storage'}</Text>
        </TouchableOpacity>
      </View>

      {/* TIFF Files List */}
      <View style={styles.listContainer}>
        <FlatList
          data={tiffFiles}
          extraData={tiffFiles}
          keyExtractor={(item, index) => item.path || item.id || index.toString()}
          renderItem={renderFileItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !isScanning ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No valid .tif or .tiff files found on device storage.</Text>
                <Text style={styles.emptySubtext}>
                  Make sure your TIFF files have a .tif or .tiff extension and are saved in your internal storage or Download folder.
                </Text>
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
  permissionBanner: {
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEEBA',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 13,
    color: '#856404',
    marginBottom: 8,
  },
  grantButton: {
    backgroundColor: '#856404',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
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
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default AllFilesScreen;
