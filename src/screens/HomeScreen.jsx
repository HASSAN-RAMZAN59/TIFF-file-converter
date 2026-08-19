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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import { isTiffFile } from '../services/tiffScannerService';

/**
 * HomeScreen Dashboard Component
 * Forces Native Internal Storage File Manager (No PhotoPicker) & Enforces Strict TIFF-only Filtering (> 0 Bytes)
 */
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

  // Dynamic Bytes Formatter (Decimal GB/MB)
  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 GB';
    const gb = bytes / 1000000000;
    if (gb < 1) {
      const mb = bytes / 1000000;
      return `${mb.toFixed(1)} MB`;
    }
    return `${gb.toFixed(1)} GB`;
  };

  // 100% Pure Dynamic real-time storage calculation from OS kernel
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
      console.warn('Error fetching dynamic storage info from RNFS:', error);
      setStorageInfo((prev) => ({ ...prev, loading: false, formattedTotal: 'N/A' }));
    }
  }, []);

  // Recalculate Storage whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchStorageInfo();
    }, [fetchStorageInfo])
  );

  // Recalculate Storage when app comes to foreground (AppState active)
  useEffect(() => {
    fetchStorageInfo();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchStorageInfo();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [fetchStorageInfo]);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStorageInfo();
    setRefreshing(false);
  };

  // Card 1: Auto-Scan All TIFFs Logic
  const handleAutoScanPress = () => {
    navigation.navigate('AllFilesScreen');
  };

  // Card 2: Pick & Convert Single File Logic (Internal Storage, Strict TIFF Check & Size > 0)
  const handlePickSingleFilePress = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });

      if (result) {
        const fileName = result.name || result.fileName || '';
        const fileSize = result.size || 0;
        
        // Strict TIFF File extension check
        if (!isTiffFile(fileName)) {
          Alert.alert('Invalid File', 'Please select a valid TIFF file (.tif or .tiff).');
          return;
        }

        // Strict 0-byte empty file check
        if (fileSize <= 0) {
          Alert.alert('Empty File', 'The selected TIFF file is empty (0 bytes) and cannot be processed.');
          return;
        }

        navigation.navigate('PickFilesScreen', {
          file: {
            uri: result.uri,
            name: fileName,
            size: fileSize,
            type: result.type,
          },
        });
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled single file picker');
      } else {
        console.warn('DocumentPicker Error (Single):', err);
        Alert.alert('File Pick Error', 'Unable to pick the selected file.');
      }
    }
  };

  // Card 3: Batch Conversion Logic (Internal Storage Multi-Select, Strict TIFF Check & Size > 0)
  const handleBatchConversionPress = async () => {
    try {
      const results = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
      });

      if (results && results.length > 0) {
        // Strict TIFF extension & non-zero size filter
        const tiffResults = results.filter((item) => {
          const fileName = item.name || item.fileName || '';
          const fileSize = item.size || 0;
          return isTiffFile(fileName) && fileSize > 0;
        });

        if (tiffResults.length === 0) {
          Alert.alert(
            'Invalid Selection',
            'None of the selected files are valid TIFF images (> 0 bytes).'
          );
          return;
        }

        if (tiffResults.length < results.length) {
          Alert.alert(
            'Files Filtered',
            `Selected ${tiffResults.length} valid TIFF files. Non-TIFF or empty (0 byte) files were excluded.`
          );
        }

        const formattedFiles = tiffResults.map((item) => ({
          uri: item.uri,
          name: item.name || item.fileName,
          size: item.size,
          type: item.type,
        }));

        navigation.navigate('BatchConvertScreen', {
          files: formattedFiles,
        });
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled batch file picker');
      } else {
        console.warn('DocumentPicker Error (Batch):', err);
        Alert.alert('Batch Pick Error', 'Unable to pick multiple files.');
      }
    }
  };

  // Card 4: Converted Outputs Logic
  const handleConvertedOutputsPress = () => {
    navigation.navigate('ConvertedFilesScreen');
  };

  // Card 5: Favorites Logic
  const handleFavoritesPress = () => {
    navigation.navigate('FavoritesScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TIFF Viewer Dashboard</Text>
        
        {/* Dynamic Storage Info Header Section */}
        <TouchableOpacity
          style={styles.storageCard}
          onPress={fetchStorageInfo}
          activeOpacity={0.8}
        >
          <View style={styles.storageHeaderRow}>
            <Text style={styles.storageTitle}>Device Storage Status</Text>
            <Text style={styles.storagePercent}>{storageInfo.usedPercentage}% Used</Text>
          </View>
          <Text style={styles.storageData}>
            Storage: {storageInfo.formattedUsed} Used / {storageInfo.formattedFree} Free (Total: {storageInfo.formattedTotal})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Cards List */}
      <ScrollView
        contentContainerStyle={styles.cardsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        
        {/* Card 1: Auto-Scan All TIFFs */}
        <TouchableOpacity style={styles.card} onPress={handleAutoScanPress} activeOpacity={0.7}>
          <Text style={styles.cardTitle}>1. Auto-Scan All TIFFs</Text>
          <Text style={styles.cardDescription}>Automatically search and list all TIFF files across device storage.</Text>
        </TouchableOpacity>

        {/* Card 2: Pick & Convert Single File */}
        <TouchableOpacity style={styles.card} onPress={handlePickSingleFilePress} activeOpacity={0.7}>
          <Text style={styles.cardTitle}>2. Pick & Convert Single File</Text>
          <Text style={styles.cardDescription}>Open Internal Storage file picker to select one TIFF file.</Text>
        </TouchableOpacity>

        {/* Card 3: Batch Conversion */}
        <TouchableOpacity style={styles.card} onPress={handleBatchConversionPress} activeOpacity={0.7}>
          <Text style={styles.cardTitle}>3. Batch Conversion</Text>
          <Text style={styles.cardDescription}>Select multiple TIFF files from Internal Storage for batch conversion.</Text>
        </TouchableOpacity>

        {/* Card 4: Converted Outputs */}
        <TouchableOpacity style={styles.card} onPress={handleConvertedOutputsPress} activeOpacity={0.7}>
          <Text style={styles.cardTitle}>4. Converted Outputs</Text>
          <Text style={styles.cardDescription}>View exported PDF and JPG files in app sandbox.</Text>
        </TouchableOpacity>

        {/* Card 5: Favorites */}
        <TouchableOpacity style={styles.card} onPress={handleFavoritesPress} activeOpacity={0.7}>
          <Text style={styles.cardTitle}>5. Favorites</Text>
          <Text style={styles.cardDescription}>Access bookmarked TIFF files quickly.</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  storageCard: {
    padding: 14,
    backgroundColor: '#EAEAEA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  storageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  storagePercent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  storageData: {
    fontSize: 13,
    color: '#555555',
  },
  cardsList: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666666',
  },
});

export default HomeScreen;
