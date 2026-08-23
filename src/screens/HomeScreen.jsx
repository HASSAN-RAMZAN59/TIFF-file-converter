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
import { isTiffFile } from '../services/tiffScannerService';

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

  useFocusEffect(
    useCallback(() => {
      fetchStorageInfo();
    }, [fetchStorageInfo])
  );

  useEffect(() => {
    fetchStorageInfo();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchStorageInfo();
      }
    });
    return () => subscription?.remove();
  }, [fetchStorageInfo]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStorageInfo();
    setRefreshing(false);
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
        <View style={[styles.iconPlaceholder, { width: 32, height: 32, borderRadius: 16 }]} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Storage Banner */}
        <View style={styles.storageBanner}>
          <View style={styles.storageCircleWrapper}>
            <View style={styles.storageCircle}>
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
              <View style={[styles.iconPlaceholder, { width: 14, height: 14, borderRadius: 7, marginRight: 6, borderWidth: 0 }]} />
              <Text style={styles.availableText}>{storageInfo.formattedFree} Available</Text>
            </View>
          </View>
          
          <View style={[styles.iconPlaceholder, { width: 56, height: 56, borderRadius: 8, alignSelf: 'center', borderWidth: 0 }]} />
        </View>

        {/* Action Grid */}
        <View style={styles.grid}>
          <ActionCard 
            title="Auto Scan All TIFF" 
            desc="Find all TIFF files on your device" 
            onPress={handleAutoScanPress} 
          />
          <ActionCard 
            title="Pick & Convert" 
            desc="Choose one TIFF file to convert" 
            onPress={handlePickSingleFilePress} 
          />
          <ActionCard 
            title="Batch Conversion" 
            desc="Convert Multiple TIFF files together" 
            onPress={handleBatchConversionPress} 
          />
          <ActionCard 
            title="Converted Outputs" 
            desc="View all your converted files" 
            onPress={handleConvertedOutputsPress} 
          />
          <ActionCard 
            title="Favorites" 
            desc="Quick access to saved files" 
            onPress={handleFavoritesPress} 
          />
          <ActionCard 
            title="Settings" 
            desc="Manage app preferences" 
            onPress={handleSettingsPress} 
          />
        </View>

        {/* Recent Converted Files */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Converted Files</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All {'>'}</Text>
            </TouchableOpacity>
          </View>
          
          {[1, 2, 3].map((item, index) => (
            <View key={item} style={[styles.recentItem, index !== 2 && styles.recentItemBorder]}>
              <View style={[styles.iconPlaceholder, { width: 44, height: 44, borderRadius: 6, marginRight: 12 }]} />
              <View style={styles.recentItemBody}>
                <Text style={styles.recentItemTitle}>Invoice_01.jpg</Text>
                <Text style={styles.recentItemSub}>JPG . 2.4 MB . Today, 2:34 PM</Text>
              </View>
              <View style={[styles.iconPlaceholder, { width: 24, height: 24, borderRadius: 12, marginRight: 12 }]} />
              <View style={[styles.iconPlaceholder, { width: 24, height: 24, borderRadius: 12 }]} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const ActionCard = ({ title, desc, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.iconPlaceholder, { width: 48, height: 48, borderRadius: 24, marginBottom: 12 }]} />
    <Text style={styles.actionCardTitle} numberOfLines={2}>{title}</Text>
    <Text style={styles.actionCardDesc} numberOfLines={3}>{desc}</Text>
    <View style={styles.actionCardBtn}>
      <View style={[styles.iconPlaceholder, { width: 16, height: 16, borderRadius: 8, borderWidth: 0 }]} />
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
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderLeftColor: '#FFFFFF',
    transform: [{ rotate: '-45deg' }],
  },
  storageCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
  },
  storageCirclePercent: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  storageCircleLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
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
  availableText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
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
});

export default HomeScreen;
