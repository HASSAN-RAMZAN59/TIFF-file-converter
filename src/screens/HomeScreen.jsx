import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  AppState,
  RefreshControl,
  Dimensions,
  TextInput,
  Modal,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import { checkOsStoragePermission, requestOsStoragePermissionDialog } from '../services/permissionService';
import Svg, { Circle, Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';
import ArrowForwardIcon from '../assets/arrow_forward.svg';
import StorageBannerIllustration from '../assets/storage_banner.svg';
import PieChartIcon from '../assets/pie_chart_icon.svg';
import AutoScanIcon from '../assets/auto_scan_icon.svg';
import PickConvertIcon from '../assets/pick_convert_icon.svg';
import BatchConvertIcon from '../assets/batch_convert_icon.svg';
import ConvertedOutputsIcon from '../assets/converted_outputs_icon.svg';
import FavoritesIcon from '../assets/favorites_icon.svg';
import SettingsIcon from '../assets/settings_icon.svg';
import HeartFilledIcon from '../assets/heart_filled.svg';
import HeartOutlineIcon from '../assets/heart_outline.svg';
import MoreVertIcon from '../assets/more_vert.svg';
import SearchIcon from '../assets/search.svg';
import DeleteIcon from '../assets/delete.svg';
import StoragePermissionFolderIcon from '../assets/storage_permission_icon.svg';
import { isTiffFile } from '../services/tiffScannerService';
import { getConvertedFilesList } from '../services/tiffConverterService';
import { getFavorites, toggleFavorite } from '../services/favoritesService';
import { moveToRecycleBin } from '../services/recycleBinService';
import { getAutoResumeEnabled } from '../services/settingsService';
import { getActiveBatchQueue, clearActiveBatchQueue } from '../services/batchQueueService';

const { width } = Dimensions.get('window');

const CheckmarkIcon = ({ size = 12, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  // Storage State
  const [storageInfo, setStorageInfo] = useState({
    totalBytes: 0,
    freeBytes: 0,
    usedBytes: 0,
    usedPercentage: 0,
    formattedTotal: 'Loading...',
    formattedFree: 'Loading...',
    formattedUsed: 'Loading...',
    loading: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);
  const [favoritesSet, setFavoritesSet] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Multi-Selection State for Recent Converted
  const [recentSelectionMode, setRecentSelectionMode] = useState(false);
  const [selectedRecentKeys, setSelectedRecentKeys] = useState(new Set());
  const [multiDeleteRecentModalVisible, setMultiDeleteRecentModalVisible] = useState(false);
  const [recentDeletingProgress, setRecentDeletingProgress] = useState({
    isDeleting: false,
    current: 0,
    total: 0,
    percentage: 0,
    fileName: '',
  });

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 GB';
    const gb = bytes / 1000000000;
    if (gb < 1) {
      const mb = bytes / 1000000;
      return `${mb.toFixed(1)} MB`;
    }
    return `${gb.toFixed(1)} GB`;
  };

  const fetchStorageInfo = useCallback(async () => {
    try {
      if (RNFS.getFSInfo) {
        const info = await RNFS.getFSInfo();
        const total = info.totalSpace || 0;
        const free = info.freeSpace || 0;
        const used = Math.max(0, total - free);
        const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

        setStorageInfo({
          totalBytes: total,
          freeBytes: free,
          usedBytes: used,
          usedPercentage: percentage,
          formattedTotal: formatBytes(total),
          formattedFree: formatBytes(free),
          formattedUsed: formatBytes(used),
          loading: false,
        });
      } else {
        setStorageInfo((prev) => ({ ...prev, loading: false, formattedTotal: 'N/A' }));
      }
    } catch (error) {
      console.warn('Error fetching storage info:', error);
      setStorageInfo((prev) => ({ ...prev, loading: false, formattedTotal: 'N/A' }));
    }
  }, []);

  const fetchRecentFiles = async () => {
    try {
      const files = await getConvertedFilesList();
      setRecentFiles(files.slice(0, 3)); // Only take top 3 for home screen
    } catch (error) {
      console.warn(error);
    }
  };

  const loadAllData = useCallback(async () => {
    await fetchStorageInfo();
    await fetchRecentFiles();
    try {
      const favs = await getFavorites();
      const paths = favs.map((f) => f.path || f.id || f.uri).filter(Boolean);
      setFavoritesSet(new Set(paths));
    } catch (e) { }
  }, [fetchStorageInfo]);

  const handleToggleFavorite = async (item) => {
    const fileKey = item.path || item.id || item.uri;
    const isNowFav = await toggleFavorite(item);
    setFavoritesSet((prev) => {
      const next = new Set(prev);
      if (isNowFav) {
        next.add(fileKey);
      } else {
        next.delete(fileKey);
      }
      return next;
    });
  };

  const handleRecentLongPress = (item) => {
    const key = item.path || item.id || item.uri;
    if (!recentSelectionMode) {
      setRecentSelectionMode(true);
      setSelectedRecentKeys(new Set([key]));
    } else {
      toggleRecentSelect(key);
    }
  };

  const toggleRecentSelect = (key) => {
    setSelectedRecentKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleRecentSelectAllToggle = () => {
    if (selectedRecentKeys.size === filteredRecentFiles.length && filteredRecentFiles.length > 0) {
      setSelectedRecentKeys(new Set());
    } else {
      const allKeys = filteredRecentFiles.map((f) => f.path || f.id || f.uri).filter(Boolean);
      setSelectedRecentKeys(new Set(allKeys));
    }
  };

  const exitRecentSelectionMode = () => {
    setRecentSelectionMode(false);
    setSelectedRecentKeys(new Set());
  };

  const handleRecentMultiDeletePress = () => {
    if (selectedRecentKeys.size === 0) {
      Alert.alert('Selection', 'Please select at least one file to delete.');
      return;
    }
    setMultiDeleteRecentModalVisible(true);
  };

  const handleConfirmRecentMultiDelete = async () => {
    setMultiDeleteRecentModalVisible(false);
    const itemsToDelete = recentFiles.filter((f) =>
      selectedRecentKeys.has(f.path || f.id || f.uri)
    );
    if (itemsToDelete.length === 0) {
      exitRecentSelectionMode();
      return;
    }

    setRecentDeletingProgress({
      isDeleting: true,
      current: 0,
      total: itemsToDelete.length,
      percentage: 0,
      fileName: itemsToDelete[0]?.name || '',
    });

    try {
      for (let i = 0; i < itemsToDelete.length; i++) {
        const file = itemsToDelete[i];
        setRecentDeletingProgress({
          isDeleting: true,
          current: i + 1,
          total: itemsToDelete.length,
          percentage: Math.round(((i + 1) / itemsToDelete.length) * 100),
          fileName: file.name || '',
        });

        await moveToRecycleBin(file);
        if (favoritesSet.has(file.path) || favoritesSet.has(file.id) || favoritesSet.has(file.uri)) {
          await toggleFavorite(file);
        }
      }
      await loadAllData();
    } catch (err) {
      console.warn('Recent multi delete error:', err);
      Alert.alert('Error', 'An error occurred while deleting files.');
    } finally {
      setRecentDeletingProgress({
        isDeleting: false,
        current: 0,
        total: 0,
        percentage: 0,
        fileName: '',
      });
      exitRecentSelectionMode();
    }
  };

  const checkAndAutoResumeBatch = useCallback(async () => {
    try {
      const isAutoResumeOn = await getAutoResumeEnabled();
      if (!isAutoResumeOn) return;

      const activeQueue = await getActiveBatchQueue();
      if (activeQueue && Array.isArray(activeQueue.files) && activeQueue.files.length > 0) {
        // Interrupted batch found, auto-navigate to BatchConvertScreen to resume
        navigation.navigate('BatchConvertScreen', {
          files: activeQueue.files,
          resumeQueue: activeQueue,
        });
      }
    } catch (e) {
      console.warn('[HomeScreen] Auto-resume check error:', e);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
      checkAndAutoResumeBatch();
    }, [loadAllData, checkAndAutoResumeBatch])
  );

  useEffect(() => {
    loadAllData();
    checkAndAutoResumeBatch();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadAllData();
        checkAndAutoResumeBatch();
      }
    });
    return () => subscription?.remove();
  }, [fetchStorageInfo, checkAndAutoResumeBatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const executeWithPermission = async (actionFn) => {
    if (Platform.OS !== 'android') {
      if (actionFn) actionFn();
      return;
    }
    const hasPermission = await checkOsStoragePermission();
    if (hasPermission) {
      if (actionFn) actionFn();
    } else {
      setPendingAction(() => actionFn);
      setPermissionModalVisible(true);
    }
  };

  const handleAllowPermission = async () => {
    const granted = await requestOsStoragePermissionDialog();
    setPermissionModalVisible(false);
    if (granted) {
      loadAllData();
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } else {
      setPendingAction(null);
    }
  };

  const handleFilePress = (item) => {
    executeWithPermission(() => setPreviewFile(item));
  };

  const handleAutoScanPress = () => {
    executeWithPermission(() => navigation.navigate('AllFilesScreen'));
  };

  const handlePickSingleFilePress = () => {
    executeWithPermission(async () => {
      try {
        const result = await DocumentPicker.pickSingle({
          type: [DocumentPicker.types.allFiles],
        });
        if (result) {
          const fileName = result.name || result.fileName || '';
          const fileSize = result.size || 0;
          if (!isTiffFile(fileName)) {
            Alert.alert('Invalid File', 'Please select a valid TIFF file (.tif or .tiff).');
            return;
          }
          if (fileSize <= 0) {
            Alert.alert('Empty File', 'The selected TIFF file is empty.');
            return;
          }
          navigation.navigate('PickFilesScreen', { file: { uri: result.uri, name: fileName, size: fileSize, type: result.type } });
        }
      } catch (err) {
        if (!DocumentPicker.isCancel(err)) {
          Alert.alert('Error', 'Unable to pick the file.');
        }
      }
    });
  };

  const handleBatchConversionPress = () => {
    executeWithPermission(async () => {
      try {
        const results = await DocumentPicker.pick({
          type: [DocumentPicker.types.allFiles],
          allowMultiSelection: true,
        });

        const pickedArray = Array.isArray(results) ? results : [results];

        if (pickedArray && pickedArray.length > 0) {
          const validFiles = pickedArray
            .filter((res) => {
              const name = res.name || res.fileName || '';
              const size = res.size || 0;
              return isTiffFile(name) && size > 0;
            })
            .map((res) => ({
              uri: res.uri,
              name: res.name || res.fileName || 'TIFF File',
              size: res.size || 0,
              type: res.type,
            }));

          if (validFiles.length === 0) {
            Alert.alert('Invalid Files', 'Please select valid TIFF files (.tif or .tiff).');
            return;
          }

          navigation.navigate('BatchConvertScreen', { files: validFiles });
        }
      } catch (err) {
        if (!DocumentPicker.isCancel(err)) {
          console.warn('Batch pick error:', err);
          Alert.alert('Error', err?.message || 'Unable to select files.');
        }
      }
    });
  };

  const handleConvertedOutputsPress = () => {
    executeWithPermission(() => navigation.navigate('ConvertedFilesScreen'));
  };

  const handleFavoritesPress = () => {
    executeWithPermission(() => navigation.navigate('FavoritesScreen'));
  };

  const handleSettingsPress = () => navigation.navigate('SettingsScreen');

  const filteredRecentFiles = searchQuery.trim()
    ? recentFiles.filter((item) =>
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
    : recentFiles;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

      <View style={styles.header}>
        {isSearchOpen ? (
          <View style={styles.searchBarRow}>
            <SearchIcon width={18} height={18} fill="#6B7280" />
            <TextInput
              style={styles.headerSearchInput}
              placeholder={t('Search converted files...')}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity
              style={styles.closeSearchBtn}
              onPress={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
            >
              <Text style={styles.closeSearchText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View>
              <Text style={styles.headerTitle}>{t('TIFF Converter')}</Text>
              <Text style={styles.headerSubtitle}>{t('Convert TIFF to JPG, PNG, PDF, WEBP')}</Text>
            </View>
            <TouchableOpacity
              style={styles.headerSearchBtn}
              activeOpacity={0.7}
              onPress={() => setIsSearchOpen(true)}
            >
              <SearchIcon width={20} height={20} fill="#1E1E1E" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Storage Banner */}
        <View style={styles.storageBanner}>
          <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 1 1" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="storageBannerGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#1A6CFA" />
                <Stop offset="100%" stopColor="#3FA5FC" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="1" height="1" fill="url(#storageBannerGrad)" />
          </Svg>

          <View style={styles.storageBannerContent}>
            <View style={styles.storageCircleWrapper}>
              <Svg width={88} height={88} viewBox="0 0 88 88">
                {/* Background Track */}
                <Circle
                  cx="44"
                  cy="44"
                  r="38"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Animated / Dynamic Progress Fill */}
                <Circle
                  cx="44"
                  cy="44"
                  r="38"
                  stroke="#FFFFFF"
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - (storageInfo.usedPercentage || 0) / 100)}`}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 44 44)"
                />
              </Svg>
              <View style={styles.storageCircleTextOverlay}>
                <Text style={styles.storageCirclePercent}>{storageInfo.usedPercentage}%</Text>
                <Text style={styles.storageCircleLabel}>{t('Used')}</Text>
              </View>
            </View>

            <View style={styles.storageInfo}>
              <Text style={styles.storageInfoTitle}>{t('Device Storage')}</Text>
              <Text style={styles.storageInfoData}>{storageInfo.formattedUsed} / {storageInfo.formattedTotal}</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${storageInfo.usedPercentage}%` }]} />
              </View>
              <View style={styles.availableRow}>
                <View style={styles.availableIconWrapper}>
                  <PieChartIcon width={12} height={12} />
                </View>
                <Text style={styles.availableText}>{storageInfo.formattedFree} {t('Available')}</Text>
              </View>
            </View>

            <View style={styles.storageIllustrationWrapper}>
              <StorageBannerIllustration width={64} height={74} />
            </View>
          </View>
        </View>

        {/* Action Grid */}
        <View style={styles.grid}>
          <ActionCard
            title={t("Auto Scan All TIFF")}
            desc={t("Find all TIFF files on your device")}
            Icon={AutoScanIcon}
            onPress={handleAutoScanPress}
          />
          <ActionCard
            title={t("Pick & Convert")}
            desc={t("Choose one TIFF file to convert")}
            Icon={PickConvertIcon}
            onPress={handlePickSingleFilePress}
          />
          <ActionCard
            title={t("Batch Conversion")}
            desc={t("Convert Multiple TIFF files together")}
            Icon={BatchConvertIcon}
            onPress={handleBatchConversionPress}
          />
          <ActionCard
            title={t("Converted Outputs")}
            desc={t("View all your converted files")}
            Icon={ConvertedOutputsIcon}
            onPress={handleConvertedOutputsPress}
          />
          <ActionCard
            title={t("Favorites")}
            desc={t("Quick access to saved files")}
            Icon={FavoritesIcon}
            onPress={handleFavoritesPress}
          />
          <ActionCard
            title={t("Settings")}
            desc={t("Manage app preferences")}
            Icon={SettingsIcon}
            onPress={handleSettingsPress}
          />
        </View>

        {/* Recent Converted Files */}
        <View style={styles.recentSection}>
          {recentSelectionMode ? (
            <View style={styles.recentSelectionHeader}>
              <View style={styles.recentSelectionHeaderLeft}>
                <TouchableOpacity
                  style={styles.recentCloseSelectionBtn}
                  onPress={exitRecentSelectionMode}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recentCloseSelectionText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.recentSelectionCountText}>
                  {selectedRecentKeys.size} {t('Selected')}
                </Text>
              </View>
              <View style={styles.recentSelectionHeaderRight}>
                <TouchableOpacity
                  style={styles.recentSelectAllBtn}
                  onPress={handleRecentSelectAllToggle}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recentSelectAllText}>
                    {selectedRecentKeys.size === filteredRecentFiles.length && filteredRecentFiles.length > 0
                      ? t('Deselect All')
                      : t('Select All')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.recentDeleteBtn,
                    selectedRecentKeys.size === 0 && styles.recentDeleteBtnDisabled,
                  ]}
                  onPress={handleRecentMultiDeletePress}
                  activeOpacity={0.7}
                  disabled={selectedRecentKeys.size === 0}
                >
                  <DeleteIcon
                    width={18}
                    height={18}
                    fill={selectedRecentKeys.size === 0 ? '#9CA3AF' : '#EF4444'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>
                {searchQuery.trim() ? `${t('Search')} (${filteredRecentFiles.length})` : t('Recent Converted')}
              </Text>
              <TouchableOpacity onPress={handleConvertedOutputsPress}>
                <Text style={styles.viewAll}>{t('View All')} {'>'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {filteredRecentFiles.length === 0 ? (
            <Text style={styles.emptyRecentText}>
              {searchQuery.trim() ? `${t('No files matching')} "${searchQuery}"` : t('No recent converted files.')}
            </Text>
          ) : (
            filteredRecentFiles.map((item, index) => {
              const fmt = (item.format || '').toUpperCase();
              const formatColor =
                fmt === 'PDF' ? '#D63230' :
                fmt === 'JPG' || fmt === 'JPEG' ? '#0E8131' :
                fmt === 'WEBP' ? '#867AE3' :
                fmt === 'PNG' ? '#2676D9' :
                fmt === 'TIFF' || fmt === 'TIF' ? '#EAB308' : '#0E8131';
              const isLast = index === filteredRecentFiles.length - 1;
              const timeString = new Date(item.mtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const sizeMB = (item.size / 1024 / 1024).toFixed(1) + ' MB';
              const fileKey = item.path || item.id || item.uri;
              const isSelected = selectedRecentKeys.has(fileKey);

              return (
                <TouchableOpacity
                  key={item.id || item.path || index.toString()}
                  style={[
                    styles.recentItem,
                    !isLast && styles.recentItemBorder,
                    isSelected && styles.recentItemSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (recentSelectionMode) {
                      toggleRecentSelect(fileKey);
                    } else {
                      handleFilePress(item);
                    }
                  }}
                  onLongPress={() => handleRecentLongPress(item)}
                  delayLongPress={300}
                >
                  {/* Thumbnail */}
                  <View style={styles.thumbnailWrapper}>
                    {item.thumbUri ? (
                      <Image
                        source={{ uri: item.thumbUri }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <Text style={styles.docIconPlaceholder}>📄</Text>
                      </View>
                    )}
                    <View style={[styles.formatBadge, { backgroundColor: formatColor }]}>
                      <Text style={styles.formatBadgeText}>{item.format}</Text>
                    </View>
                  </View>

                  <View style={styles.recentItemBody}>
                    <Text style={styles.recentItemTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.recentItemSub} numberOfLines={1}>
                      {item.format} . {sizeMB} . {timeString}
                    </Text>
                  </View>
                  
                  {recentSelectionMode ? (
                    <View style={styles.recentCheckboxWrapper}>
                      {isSelected ? (
                        <View style={styles.recentCheckedCircle}>
                          <CheckmarkIcon size={12} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View style={styles.recentUncheckedCircle} />
                      )}
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.recentActionBtn}
                        onPress={() => handleToggleFavorite(item)}
                        activeOpacity={0.6}
                      >
                        {favoritesSet.has(item.path) || favoritesSet.has(item.id) || favoritesSet.has(item.uri) ? (
                          <HeartFilledIcon
                            width={18}
                            height={18}
                            color="#2563EB"
                            fill="#2563EB"
                          />
                        ) : (
                          <HeartOutlineIcon
                            width={18}
                            height={18}
                            color="#9CA3AF"
                          />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.recentActionBtn}
                        onPress={handleConvertedOutputsPress}
                        activeOpacity={0.6}
                      >
                        <MoreVertIcon width={20} height={20} fill="#111827" />
                      </TouchableOpacity>
                    </>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Recent Converted Multi-Delete Confirmation Modal */}
      <Modal
        visible={multiDeleteRecentModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMultiDeleteRecentModalVisible(false)}
      >
        <View style={styles.previewModalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setMultiDeleteRecentModalVisible(false)}
          />
          <View style={styles.recentDeleteModalCard}>
            <View style={styles.recentDeleteIconCircle}>
              <DeleteIcon width={24} height={24} fill="#EF4444" />
            </View>

            <Text style={styles.recentDeleteModalTitle}>
              Delete {selectedRecentKeys.size} {selectedRecentKeys.size === 1 ? 'File' : 'Files'}?
            </Text>
            <Text style={styles.recentDeleteModalDesc}>
              Are you sure you want to move {selectedRecentKeys.size} selected {selectedRecentKeys.size === 1 ? 'file' : 'files'} to the Recycle Bin?
            </Text>

            <View style={styles.recentDeleteActionsRow}>
              <TouchableOpacity
                style={styles.recentDeleteCancelBtn}
                onPress={() => setMultiDeleteRecentModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.recentDeleteCancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recentDeleteConfirmBtn}
                onPress={handleConfirmRecentMultiDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.recentDeleteConfirmBtnText}>{t('Delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deleting Progress Indicator Modal */}
      <Modal
        visible={recentDeletingProgress.isDeleting}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.recentDeleteProgressOverlay}>
          <View style={styles.recentDeleteProgressCard}>
            <View style={styles.recentDeleteProgressIconCircle}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>

            <Text style={styles.recentDeleteProgressTitle}>Deleting Files...</Text>

            <Text style={styles.recentDeleteProgressSub}>
              Moving {recentDeletingProgress.current} of {recentDeletingProgress.total} {recentDeletingProgress.total === 1 ? 'file' : 'files'} to Recycle Bin
            </Text>

            {/* Slider / Progress Bar */}
            <View style={styles.recentDeleteProgressBarBg}>
              <View
                style={[
                  styles.recentDeleteProgressBarFill,
                  { width: `${recentDeletingProgress.percentage}%` },
                ]}
              />
            </View>

            <View style={styles.recentDeleteProgressFooter}>
              <Text style={styles.recentDeleteProgressFileName} numberOfLines={1}>
                {recentDeletingProgress.fileName}
              </Text>
              <Text style={styles.recentDeleteProgressPercentText}>
                {recentDeletingProgress.percentage}%
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewFile}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewFile(null)}
      >
        <View style={styles.previewModalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setPreviewFile(null)}
          />

          <View style={styles.previewModalCard}>
            <View style={styles.previewModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewModalFileName} numberOfLines={1}>
                  {previewFile?.name || 'Image Preview'}
                </Text>
                <Text style={styles.previewModalFileSize}>
                  {previewFile?.format} . {((previewFile?.size || 0) / 1024 / 1024).toFixed(1)} MB
                </Text>
              </View>
              <TouchableOpacity
                style={styles.previewModalCloseBtn}
                onPress={() => setPreviewFile(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.previewModalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.previewModalImageContainer}>
              {previewFile?.uri ? (
                <Image
                  source={{ uri: previewFile.uri }}
                  style={styles.previewModalImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.previewModalLoadingBox}>
                  <Text style={styles.previewModalLoadingText}>No image preview available</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
      {/* Storage Permission Dialog Modal */}
      <Modal
        visible={permissionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setPermissionModalVisible(false);
          setPendingAction(null);
        }}
      >
        <View style={styles.permModalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => {
              setPermissionModalVisible(false);
              setPendingAction(null);
            }}
          />

          <View style={styles.permModalCard}>
            {/* Top Folder Illustration Icon */}
            <View style={styles.permFolderWrapper}>
              <StoragePermissionFolderIcon width={125} height={144} />
            </View>

            {/* Title */}
            <Text style={styles.permModalTitle}>Storage Permission !</Text>

            {/* Description */}
            <Text style={styles.permModalDesc}>
              Allow Document Reader to access all your Documents on this Device ?
            </Text>

            {/* Allow Button */}
            <TouchableOpacity
              style={styles.permAllowBtn}
              onPress={handleAllowPermission}
              activeOpacity={0.85}
            >
              <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 1 1" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="permAllowGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#1A6CFA" />
                    <Stop offset="100%" stopColor="#3FA5FC" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="1" height="1" fill="url(#permAllowGrad)" />
              </Svg>
              <Text style={styles.permAllowBtnText}>Allow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const ActionCard = ({ title, desc, onPress, Icon }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.actionCardIconWrapper}>
      {Icon ? (
        <Icon width={40} height={40} />
      ) : (
        <View style={[styles.iconPlaceholder, { width: 40, height: 40, borderRadius: 20 }]} />
      )}
    </View>
    <Text style={styles.actionCardTitle} numberOfLines={2}>{title}</Text>
    <Text style={styles.actionCardDesc} numberOfLines={2}>{desc}</Text>
    <View style={styles.actionCardBtn}>
      <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 1 1" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="cardBtnGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#1A6CFA" />
            <Stop offset="100%" stopColor="#3FA5FC" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill="url(#cardBtnGrad)" />
      </Svg>
      <ArrowForwardIcon width={12} height={12} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 19,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    lineHeight: 24,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 0,
    fontFamily: 'Poppins-Regular',
    lineHeight: 14,
  },
  headerSearchBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#1E1E1E',
    padding: 0,
  },
  closeSearchBtn: {
    padding: 4,
    marginLeft: 6,
  },
  closeSearchText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Poppins-Medium',
  },
  iconPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  storageBanner: {
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#1A6CFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  storageBannerContent: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageCircleWrapper: {
    width: 88,
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  storageCircleTextOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storageCirclePercent: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Poppins-Medium',
  },
  storageCircleLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
  },
  storageInfo: {
    flex: 1,
    marginRight: 8,
  },
  storageInfoTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    marginBottom: 2,
  },
  storageInfoData: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginBottom: 8,
    fontFamily: 'Poppins-Regular',
  },
  progressBarBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1.5,
    marginBottom: 8,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableIconWrapper: {
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
  },
  storageIllustrationWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionCardIconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionCardTitle: {
    fontSize: 11.5,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: 1,
    minHeight: 28,
    lineHeight: 14,
  },
  actionCardDesc: {
    fontSize: 9,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 20,
    lineHeight: 11,
  },
  actionCardBtn: {
    width: '85%',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  recentSelectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentCloseSelectionBtn: {
    padding: 4,
    marginRight: 6,
  },
  recentCloseSelectionText: {
    fontSize: 15,
    color: '#4B5563',
    fontFamily: 'Poppins-Medium',
  },
  recentSelectionCountText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#1E1E1E',
  },
  recentSelectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentSelectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  recentSelectAllText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    color: '#2563EB',
  },
  recentDeleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentDeleteBtnDisabled: {
    opacity: 0.4,
  },
  recentTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
  },
  viewAll: {
    fontSize: 12,
    color: '#3B82F6',
    fontFamily: 'Poppins-Medium',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentItemSelected: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  recentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentCheckboxWrapper: {
    paddingLeft: 8,
    paddingRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentCheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentUncheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  recentDeleteModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  recentDeleteIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentDeleteModalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    marginBottom: 8,
  },
  recentDeleteModalDesc: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  recentDeleteActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  recentDeleteCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentDeleteCancelBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#4B5563',
  },
  recentDeleteConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  recentDeleteConfirmBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },
  recentItemBody: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 12.5,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    marginBottom: 2,
  },
  recentItemSub: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
  },
  emptyRecentText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    paddingVertical: 16,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  thumbnailImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  thumbnailPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docIconPlaceholder: {
    fontSize: 18,
  },
  formatBadge: {
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
  recentActionBtn: {
    paddingHorizontal: 2,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Image Preview Modal Styles
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  previewModalCard: {
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
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  previewModalFileName: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
  },
  previewModalFileSize: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  previewModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  previewModalCloseBtnText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Poppins-Medium',
  },
  previewModalImageContainer: {
    height: 320,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModalImage: {
    width: '100%',
    height: '100%',
  },
  previewModalLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  previewModalLoadingText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Poppins-Medium',
  },

  // Storage Permission Modal Styles
  permModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  permFolderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  permModalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginTop: 8,
  },
  permModalDesc: {
    fontSize: 13.5,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  permAllowBtn: {
    borderRadius: 25,
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    overflow: 'hidden',
    backgroundColor: '#1A6CFA',
    shadowColor: '#1A6CFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  permAllowBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  recentDeleteProgressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  recentDeleteProgressCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  recentDeleteProgressIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentDeleteProgressTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
    color: '#1E1E1E',
    marginBottom: 4,
  },
  recentDeleteProgressSub: {
    fontSize: 12.5,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    marginBottom: 18,
    textAlign: 'center',
  },
  recentDeleteProgressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  recentDeleteProgressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  recentDeleteProgressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  recentDeleteProgressFileName: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    marginRight: 8,
  },
  recentDeleteProgressPercentText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#2563EB',
  },
});

export default HomeScreen;
