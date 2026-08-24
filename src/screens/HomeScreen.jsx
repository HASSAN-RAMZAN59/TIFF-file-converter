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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import Svg, { Circle } from 'react-native-svg';
import ArrowForwardIcon from '../assets/arrow_forward.svg';
import StorageBannerIllustration from '../assets/storage_banner.svg';
import PieChartIcon from '../assets/pie_chart_icon.svg';
import AutoScanIcon from '../assets/auto_scan_icon.svg';
import PickConvertIcon from '../assets/pick_convert_icon.svg';
import BatchConvertIcon from '../assets/batch_convert_icon.svg';
import ConvertedOutputsIcon from '../assets/converted_outputs_icon.svg';
import FavoritesIcon from '../assets/favorites_icon.svg';
import SettingsIcon from '../assets/settings_icon.svg';
import StarIcon from '../assets/star.svg';
import MoreVertIcon from '../assets/more_vert.svg';
import SearchIcon from '../assets/search.svg';
import { isTiffFile } from '../services/tiffScannerService';
import { getConvertedFilesList } from '../services/tiffConverterService';
import { getFavorites, toggleFavorite } from '../services/favoritesService';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
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
      setFavoritesSet(new Set(favs.map((f) => f.path)));
    } catch (e) {}
  }, [fetchStorageInfo]);

  const handleToggleFavorite = async (item) => {
    await toggleFavorite(item);
    const newSet = new Set(favoritesSet);
    if (newSet.has(item.path)) {
      newSet.delete(item.path);
    } else {
      newSet.add(item.path);
    }
    setFavoritesSet(newSet);
  };

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  useEffect(() => {
    loadAllData();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadAllData();
      }
    });
    return () => subscription?.remove();
  }, [fetchStorageInfo]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleFilePress = (item) => {
    if (['JPG', 'PNG', 'WEBP', 'JPEG'].includes(item.format.toUpperCase())) {
      navigation.navigate('PreviewScreen', { file: item });
    } else {
      Alert.alert('PDF Saved', `File is saved at:\n${item.path}`);
    }
  };

  const handleAutoScanPress = () => navigation.navigate('AllFilesScreen');

  const handlePickSingleFilePress = async () => {
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
  };

  const handleBatchConversionPress = async () => {
    try {
      const results = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
      });
      if (results && results.length > 0) {
        const tiffResults = results.filter((item) => {
          const fileName = item.name || item.fileName || '';
          const fileSize = item.size || 0;
          return isTiffFile(fileName) && fileSize > 0;
        });
        if (tiffResults.length === 0) {
          Alert.alert('Invalid', 'No valid TIFF files selected.');
          return;
        }
        const formattedFiles = tiffResults.map((item) => ({
          uri: item.uri, name: item.name || item.fileName, size: item.size, type: item.type
        }));
        navigation.navigate('BatchConvertScreen', { files: formattedFiles });
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Unable to pick multiple files.');
      }
    }
  };

  const handleConvertedOutputsPress = () => navigation.navigate('ConvertedFilesScreen');
  const handleFavoritesPress = () => navigation.navigate('FavoritesScreen');
  const handleSettingsPress = () => Alert.alert('Settings', 'Settings screen coming soon.');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>TIFF Converter</Text>
          <Text style={styles.headerSubtitle}>Convert TIFF to JPG, PNG, PDF, WEBP</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerSearchBtn} 
          activeOpacity={0.7}
          onPress={handleAutoScanPress}
        >
          <SearchIcon width={20} height={20} fill="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Storage Banner */}
        <View style={styles.storageBanner}>
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
              <Text style={styles.storageCircleLabel}>Used</Text>
            </View>
          </View>
          
          <View style={styles.storageInfo}>
            <Text style={styles.storageInfoTitle}>Device Storage</Text>
            <Text style={styles.storageInfoData}>{storageInfo.formattedUsed} / {storageInfo.formattedTotal}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${storageInfo.usedPercentage}%` }]} />
            </View>
            <View style={styles.availableRow}>
              <View style={styles.availableIconWrapper}>
                <PieChartIcon width={12} height={12} />
              </View>
              <Text style={styles.availableText}>{storageInfo.formattedFree} Available</Text>
            </View>
          </View>
          
          <View style={styles.storageIllustrationWrapper}>
            <StorageBannerIllustration width={64} height={74} />
          </View>
        </View>

        {/* Action Grid */}
        <View style={styles.grid}>
          <ActionCard 
            title="Auto Scan All TIFF" 
            desc="Find all TIFF files on your device" 
            Icon={AutoScanIcon}
            onPress={handleAutoScanPress} 
          />
          <ActionCard 
            title="Pick & Convert" 
            desc="Choose one TIFF file to convert" 
            Icon={PickConvertIcon}
            onPress={handlePickSingleFilePress} 
          />
          <ActionCard 
            title="Batch Conversion" 
            desc="Convert Multiple TIFF files together" 
            Icon={BatchConvertIcon}
            onPress={handleBatchConversionPress} 
          />
          <ActionCard 
            title="Converted Outputs" 
            desc="View all your converted files" 
            Icon={ConvertedOutputsIcon}
            onPress={handleConvertedOutputsPress} 
          />
          <ActionCard 
            title="Favorites" 
            desc="Quick access to saved files" 
            Icon={FavoritesIcon}
            onPress={handleFavoritesPress} 
          />
          <ActionCard 
            title="Settings" 
            desc="Manage app preferences" 
            Icon={SettingsIcon}
            onPress={handleSettingsPress} 
          />
        </View>

        {/* Recent Converted Files */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Converted</Text>
            <TouchableOpacity onPress={handleConvertedOutputsPress}>
              <Text style={styles.viewAll}>View All {'>'}</Text>
            </TouchableOpacity>
          </View>
          
          {recentFiles.length === 0 ? (
            <Text style={styles.emptyRecentText}>No recent converted files.</Text>
          ) : (
            recentFiles.map((item, index) => {
              const formatColor = item.format === 'PDF' ? '#EF4444' : item.format === 'PNG' ? '#3B82F6' : '#10B981';
              const isLast = index === recentFiles.length - 1;
              const timeString = new Date(item.mtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const sizeMB = (item.size / 1024 / 1024).toFixed(1) + ' MB';

              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.recentItem, !isLast && styles.recentItemBorder]}
                  activeOpacity={0.7}
                  onPress={() => handleFilePress(item)}
                >
                  {/* Thumbnail */}
                  <View style={styles.thumbnailWrapper}>
                    <View style={styles.thumbnailPlaceholder}>
                      <Text style={styles.docIconPlaceholder}>📄</Text>
                    </View>
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
                  <TouchableOpacity 
                    style={styles.recentActionBtn}
                    onPress={() => handleToggleFavorite(item)}
                  >
                    <StarIcon 
                      width={20} 
                      height={20} 
                      fill={favoritesSet.has(item.path) ? '#F59E0B' : '#9CA3AF'} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.recentActionBtn}
                    onPress={handleConvertedOutputsPress}
                  >
                    <MoreVertIcon width={20} height={20} fill="#111827" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const ActionCard = ({ title, desc, onPress, Icon }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.actionCardIconWrapper}>
      {Icon ? (
        <Icon width={48} height={48} />
      ) : (
        <View style={[styles.iconPlaceholder, { width: 48, height: 48, borderRadius: 24 }]} />
      )}
    </View>
    <Text style={styles.actionCardTitle} numberOfLines={2}>{title}</Text>
    <Text style={styles.actionCardDesc} numberOfLines={3}>{desc}</Text>
    <View style={styles.actionCardBtn}>
      <ArrowForwardIcon width={14} height={14} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  headerSearchBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  storageBanner: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
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
    fontWeight: 'bold',
  },
  storageCircleLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
  },
  storageInfo: {
    flex: 1,
    marginRight: 8,
  },
  storageInfoTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  storageInfoData: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginBottom: 10,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1.5,
    marginBottom: 10,
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
    fontWeight: '600',
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
    gap: 8,
    marginBottom: 24,
  },
  actionCard: {
    width: (width - 32 - 16) / 3, // 3 cols, 2 gaps of 8 => 16px
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionCardIconWrapper: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 30,
  },
  actionCardDesc: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    minHeight: 28,
  },
  actionCardBtn: {
    width: '100%',
    height: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  viewAll: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentItemBody: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  recentItemSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  emptyRecentText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
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
    fontWeight: '800',
    color: '#FFFFFF',
  },
  recentActionBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});

export default HomeScreen;
