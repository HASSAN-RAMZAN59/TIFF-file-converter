import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scanDeviceForTiffs } from '../services/tiffScannerService';
import { decodeTiffThumbnailFast, preloadThumbnail } from '../services/tiffDecoderService';
import {
  checkOsStoragePermission,
  requestOsStoragePermissionDialog,
} from '../services/permissionService';
import SearchIcon from '../assets/search.svg';
import RescanBadgeIcon from '../assets/rescan_badge.svg';
import SourceNotesIcon from '../assets/source_notes.svg';
import LottieView from 'lottie-react-native';
import searchingFilesAnimation from '../assets/searching_files.json';
import noFilesFoundAnimation from '../assets/no_files_found.json';
import BackIcon from '../assets/Back Press.svg';
import { useTranslation } from 'react-i18next';

/**
 * AllFilesScreen Component
 * Fast single-pass scanner for .tif and .tiff files (> 0 KB) with Favorite bookmarks.
 */

const TiffThumbnail = ({ path, style }) => {
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    let isActive = true;
    
    // Fast step-downsampled decode (10x faster)
    decodeTiffThumbnailFast(path, 120)
      .then((result) => {
        if (isActive && result && result.uri) {
          setImageUri(result.uri);
        }
      })
      .catch(() => {});

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

const AllFilesScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isBatchPickerMode = route.params?.isBatchPicker || false;
  const [tiffFiles, setTiffFiles] = useState([]);
  const [isScanning, setIsScanning] = useState(true);
  const [hasPermission, setHasPermission] = useState(true);
  const [selectedFilePaths, setSelectedFilePaths] = useState(new Set());

  const startTiffScan = async (isCancelledCheck = null) => {
    const isCancelled = typeof isCancelledCheck === 'function' ? isCancelledCheck : null;
    setIsScanning(true);
    setTiffFiles([]);
    try {
      const discovered = await scanDeviceForTiffs((liveFoundItem) => {
        if (liveFoundItem && liveFoundItem.path) {
          // Preload thumbnail in parallel while scanning animation is playing
          preloadThumbnail(liveFoundItem.path, 0);
        }
      }, isCancelled);

      if (!isCancelled || !isCancelled()) {
        const validFiles = discovered.filter((f) => (Number(f.size) || 0) > 100);
        setTiffFiles(validFiles);
      }
    } catch (e) {
      console.warn('Scan error:', e);
    } finally {
      if (!isCancelled || !isCancelled()) {
        setIsScanning(false);
      }
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const runScan = async () => {
      const permitted = await checkOsStoragePermission();
      if (isCancelled) return;

      setHasPermission(permitted);
      if (permitted) {
        await startTiffScan(() => isCancelled);
      } else {
        const granted = await requestOsStoragePermissionDialog();
        if (isCancelled) return;
        setHasPermission(granted);
        if (granted) {
          await startTiffScan(() => isCancelled);
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

  const toggleFileSelection = (file) => {
    const key = file.path || file.id || file.uri;
    setSelectedFilePaths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleFileSelect = (file) => {
    navigation.navigate('PreviewScreen', { file });
  };

  const formatDisplayPath = (fullPath) => {
    if (!fullPath) return t('Storage');
    let p = fullPath.replace('/storage/emulated/0/', '').replace('/storage/emulated/0', '');
    if (p.startsWith('/')) p = p.substring(1);
    const lastSlash = p.lastIndexOf('/');
    let folderPart = lastSlash !== -1 ? p.substring(0, lastSlash) : p;
    if (!folderPart) return t('Storage');
    return `${t('Storage')} / ${t(folderPart)}`;
  };

  const renderFileItem = ({ item, index, total }) => {
    const isLast = index === total - 1;

    return (
      <TouchableOpacity
        style={[
          styles.fileCardItem,
          !isLast && styles.fileCardBorder,
        ]}
        onPress={() => handleFileSelect(item)}
        activeOpacity={0.7}
      >
        <TiffThumbnail path={item.path} style={styles.thumbnailPlaceholder} />

        <View style={styles.fileInfoColumn}>
          <Text style={styles.fileNameText} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.filePathText} numberOfLines={1}>
            {formatDisplayPath(item.path)}
          </Text>
          <Text style={styles.fileSizeText}>{t('Size:')} {formatFileSize(item.size)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isScanning) {
    return (
      <SafeAreaView style={styles.scanContainer}>
        <View style={styles.scanHeaderTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <BackIcon width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.scanTitle}>{t('Scanning Files')}</Text>
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

          <Text style={styles.scanMainText}>{t('Scanning Storage for TIFF Files...')}</Text>
          <Text style={styles.scanSubText}>{t('Please wait while we search your device storage')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isScanning && tiffFiles.length === 0) {
    return (
      <SafeAreaView style={styles.scanContainer}>
        <View style={styles.scanHeaderTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <BackIcon width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.scanTitle}>{t('Scan Results')}</Text>
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

          <Text style={styles.scanMainText}>{t('No valid .TIF or .TIFF files found')}</Text>
          <Text style={styles.scanSubText}>{t('Make sure your TIFF files have a .TIF or .TIFF extension and are saved in your internal storage or download folder')}</Text>
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
            <SourceNotesIcon width={20} height={20} fill="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.rescanBlueButtonText}>{t('Rescan Storage Files')}</Text>
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
        <View style={styles.listHeaderLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <BackIcon width={20} height={20} />
          </TouchableOpacity>
          <View>
            <Text style={styles.listHeaderTitle}>{t('Scan Complete')}</Text>
            <Text style={styles.listHeaderSubtitle}>
              {String(tiffFiles.length).padStart(2, '0')} {t('valid TIFF files Found')}
            </Text>
          </View>
        </View>
        <View style={styles.headerSearchIconWrapper}>
          <SearchIcon width={20} height={20} fill="#111827" />
        </View>
      </View>

      {/* Scrollable Container */}
      <ScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Warning Banner */}
        {!hasPermission && (
          <View style={styles.permissionBanner}>
            <Text style={styles.permissionText}>
              {t('Storage access permission is required to scan device files.')}
            </Text>
            <TouchableOpacity style={styles.grantButton} onPress={handleGrantPermission}>
              <Text style={styles.grantButtonText}>{t('Grant Storage Access')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main List Container that wraps to content */}
        <View style={styles.mainListCard}>
          {tiffFiles.map((item, index) => (
            <React.Fragment key={item.path || item.id || index.toString()}>
              {renderFileItem({ item, index, total: tiffFiles.length })}
            </React.Fragment>
          ))}
        </View>

        {/* Rescan Button below card */}
        <View style={[styles.rescanBottomWrapper, { marginBottom: Math.max(10, insets.bottom) }]}>
          <TouchableOpacity 
            style={styles.floatingRescanBtn} 
            activeOpacity={0.8}
            onPress={() => startTiffScan()}
          >
            <SourceNotesIcon width={18} height={18} fill="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.floatingRescanBtnText}>{t('Rescan Storage Files')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scanContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scanHeaderTop: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 12,
  },
  scanTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
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
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    marginBottom: 2,
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
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  // New Styles for List View
  listScreenContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  listHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    marginBottom: -4,
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -2,
    fontFamily: 'Poppins-Regular',
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
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  mainListCard: {
    backgroundColor: '#FFFFFF',
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
  rescanBottomWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  flatListContent: {
    paddingVertical: 8,
  },
  fileCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fileCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fileCardSelected: {
    backgroundColor: '#EFF6FF',
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkboxCircleSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  floatingBatchWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  floatingBatchBtn: {
    width: '100%',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingBatchBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
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
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    marginBottom: -2,
  },
  filePathText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'Poppins-Regular',
    marginBottom: -2,
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
  floatingRescanWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingRescanBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingRescanBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
});

export default AllFilesScreen;
