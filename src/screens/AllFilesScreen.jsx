import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { scanDeviceForTiffs } from '../services/tiffScannerService';
import { decodeTiffToBase64Uri } from '../services/tiffDecoderService';
import {
  checkOsStoragePermission,
  requestOsStoragePermissionDialog,
} from '../services/permissionService';
import SearchIcon from '../assets/search.svg';
import LottieView from 'lottie-react-native';
import searchingFilesAnimation from '../assets/searching_files.json';
import noFilesFoundAnimation from '../assets/no_files_found.json';

/**
 * AllFilesScreen Component
 * Fast single-pass scanner for .tif and .tiff files (> 0 KB) with Favorite bookmarks.
 */

const TiffThumbnail = ({ path, style }) => {
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    let isActive = true;
    
    // Defer thumbnail decoding after frame renders so UI/Back gestures never lag
    const frameId = requestAnimationFrame(() => {
      decodeTiffToBase64Uri(path, 0)
        .then((result) => {
          if (isActive && result && result.uri) {
            setImageUri(result.uri);
          }
        })
        .catch(() => {});
    });

    return () => {
      isActive = false;
      cancelAnimationFrame(frameId);
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

const AllFilesScreen = ({ navigation }) => {
  const [tiffFiles, setTiffFiles] = useState([]);
  const [isScanning, setIsScanning] = useState(true);
  const [hasPermission, setHasPermission] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const runScan = async () => {
      const permitted = await checkOsStoragePermission();
      if (isCancelled) return;

      setHasPermission(permitted);
      if (permitted) {
        setIsScanning(true);
        setTiffFiles([]);
        const discovered = await scanDeviceForTiffs(null, () => isCancelled);
        if (!isCancelled) {
          const validFiles = discovered.filter((f) => (Number(f.size) || 0) > 100);
          setTiffFiles(validFiles);
          setIsScanning(false);
        }
      } else {
        const granted = await requestOsStoragePermissionDialog();
        if (isCancelled) return;
        setHasPermission(granted);
        if (granted) {
          setIsScanning(true);
          setTiffFiles([]);
          const discovered = await scanDeviceForTiffs(null, () => isCancelled);
          if (!isCancelled) {
            const validFiles = discovered.filter((f) => (Number(f.size) || 0) > 100);
            setTiffFiles(validFiles);
            setIsScanning(false);
          }
        } else {
          setIsScanning(false);
        }
      }
    };

    runScan();

    return () => {
      isCancelled = true;
      console.log('--> User navigated back: Terminating TIFF scan.');
    };
  }, []);

  const handleGrantPermission = async () => {
    const granted = await requestOsStoragePermissionDialog();
    setHasPermission(granted);
    if (granted) {
      setIsScanning(true);
      setTiffFiles([]);
      const discovered = await scanDeviceForTiffs();
      const validFiles = discovered.filter((f) => (Number(f.size) || 0) > 100);
      setTiffFiles(validFiles);
      setIsScanning(false);
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
    navigation.navigate('PreviewScreen', { file });
  };

  const renderFileItem = ({ item, index, total }) => {
    const isLast = index === total - 1;
    return (
      <TouchableOpacity
        style={[styles.fileCardItem, !isLast && styles.fileCardBorder]}
        onPress={() => handleFileSelect(item)}
        activeOpacity={0.7}
      >
        <TiffThumbnail path={item.path} style={styles.thumbnailPlaceholder} />

        <View style={styles.fileInfoColumn}>
          <Text style={styles.fileNameText} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.filePathText} numberOfLines={1}>
            {item.path}
          </Text>
          <Text style={styles.fileSizeText}>Size: {formatFileSize(item.size)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isScanning) {
    return (
      <SafeAreaView style={styles.scanContainer}>
        <View style={styles.scanHeaderTop}>
          <Text style={styles.scanTitle}>Scanning Files</Text>
        </View>

        <View style={styles.scanCenterContent}>
          <View style={styles.lottieContainer}>
            <LottieView
              source={searchingFilesAnimation}
              autoPlay
              loop
              style={styles.lottieView}
            />
          </View>

          <Text style={styles.scanMainText}>Scanning Storage for TIFF Files...</Text>
          <Text style={styles.scanSubText}>Please wait while we search your device storage</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isScanning && tiffFiles.length === 0) {
    return (
      <SafeAreaView style={styles.scanContainer}>
        <View style={styles.scanHeaderTop}>
          <Text style={styles.scanTitle}>Scan Results</Text>
        </View>

        <View style={styles.scanCenterContent}>
          <View style={styles.lottieContainer}>
            <LottieView
              source={noFilesFoundAnimation}
              autoPlay
              loop
              style={styles.lottieView}
            />
          </View>

          <Text style={styles.scanMainText}>No valid .TIF or .TIFF files found</Text>
          <Text style={styles.scanSubText}>Make sure your TIFF files have a .TIF or .TIFF extension and are saved in your internal storage or download folder</Text>
        </View>

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={styles.rescanBlueButton}
            onPress={() => {
              if (!hasPermission) {
                handleGrantPermission();
              } else {
                startTiffScan();
              }
            }}
          >
            <View style={styles.buttonIconPlaceholder} />
            <Text style={styles.rescanBlueButtonText}>Rescan Storage Files</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.listScreenContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />

      {/* Header */}
      <View style={styles.listHeaderTop}>
        <View>
          <Text style={styles.listHeaderTitle}>Scan Complete</Text>
          <Text style={styles.listHeaderSubtitle}>
            {String(tiffFiles.length).padStart(2, '0')} valid TIFF files Found
          </Text>
        </View>
        <View style={styles.headerSearchIconWrapper}>
          <SearchIcon width={20} height={20} fill="#111827" />
        </View>
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

      {/* Main List Container */}
      <View style={styles.mainListCard}>
        <FlatList
          data={tiffFiles}
          keyExtractor={(item, index) => item.path || item.id || index.toString()}
          renderItem={({ item, index }) => renderFileItem({ item, index, total: tiffFiles.length })}
          contentContainerStyle={styles.flatListContent}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scanContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scanHeaderTop: {
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  scanTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  scanCenterContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -30,
  },
  lottieContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lottieView: {
    width: '100%',
    height: '100%',
  },
  scanMainText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  scanSubText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomButtonContainer: {
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  rescanBlueButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIconPlaceholder: {
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    marginRight: 10,
  },
  rescanBlueButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // New Styles for List View
  listScreenContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    padding: 16,
  },
  listHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Poppins-Medium',
  },
  headerSearchIconWrapper: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionBanner: {
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEEBA',
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 13,
    color: '#856404',
    fontFamily: 'Poppins-Regular',
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
    fontFamily: 'Poppins-Bold',
    fontSize: 12,
  },
  mainListCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  flatListContent: {
    paddingVertical: 8,
  },
  fileCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  fileCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  thumbnailPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    marginRight: 16,
  },
  fileInfoColumn: {
    flex: 1,
    marginRight: 12,
  },
  fileNameText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  filePathText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'Poppins-Regular',
    marginBottom: 4,
  },
  fileSizeText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Poppins-Medium',
  },
  starBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AllFilesScreen;
