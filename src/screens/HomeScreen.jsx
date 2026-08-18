import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';

/**
 * HomeScreen Dashboard Component
 * Focuses on functional logic, state management, storage info calculations,
 * and react-native-document-picker async card triggers.
 */
const HomeScreen = ({ navigation }) => {
  // Storage State
  const [storageInfo, setStorageInfo] = useState({
    totalBytes: 0,
    freeBytes: 0,
    usedBytes: 0,
    formattedTotal: 'Loading...',
    formattedFree: 'Loading...',
    formattedUsed: 'Loading...',
    loading: true,
  });

  // 1. Storage Info Header Logic using react-native-fs
  useEffect(() => {
    fetchStorageInfo();
  }, []);

  const fetchStorageInfo = async () => {
    try {
      if (RNFS.getFSInfo) {
        const info = await RNFS.getFSInfo();
        const total = info.totalSpace || 0;
        const free = info.freeSpace || 0;
        const used = Math.max(0, total - free);

        setStorageInfo({
          totalBytes: total,
          freeBytes: free,
          usedBytes: used,
          formattedTotal: formatBytesToGB(total),
          formattedFree: formatBytesToGB(free),
          formattedUsed: formatBytesToGB(used),
          loading: false,
        });
      } else {
        setStorageInfo((prev) => ({ ...prev, loading: false, formattedTotal: 'N/A' }));
      }
    } catch (error) {
      console.warn('Error fetching storage info from RNFS:', error);
      setStorageInfo((prev) => ({ ...prev, loading: false, formattedTotal: 'N/A' }));
    }
  };

  const formatBytesToGB = (bytes) => {
    if (!bytes || bytes <= 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  // 2. Card 1: Auto-Scan All TIFFs Logic
  const handleAutoScanPress = () => {
    navigation.navigate('AllFilesScreen');
  };

  // 3. Card 2: Pick & Convert Single File Logic (react-native-document-picker)
  const handlePickSingleFilePress = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.images, 'image/tiff', 'image/x-tiff'],
      });

      console.log('Single Document Picked:', result);

      if (result) {
        navigation.navigate('PickFilesScreen', {
          file: {
            uri: result.uri,
            name: result.name || result.fileName,
            size: result.size,
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

  // 4. Card 3: Batch Conversion Logic (react-native-document-picker multi-select)
  const handleBatchConversionPress = async () => {
    try {
      const results = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.images, 'image/tiff', 'image/x-tiff'],
      });

      console.log('Batch Documents Picked:', results);

      if (results && results.length > 0) {
        const formattedFiles = results.map((item) => ({
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

  // 5. Card 4: Converted Outputs Logic
  const handleConvertedOutputsPress = () => {
    navigation.navigate('ConvertedFilesScreen');
  };

  // 6. Card 5: Favorites Logic
  const handleFavoritesPress = () => {
    navigation.navigate('FavoritesScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TIFF Viewer Dashboard</Text>
        
        {/* Storage Info Header Section */}
        <View style={styles.storageCard}>
          <Text style={styles.storageTitle}>Device Storage Status</Text>
          <Text style={styles.storageData}>
            Storage: {storageInfo.formattedUsed} Used / {storageInfo.formattedFree} Free (Total: {storageInfo.formattedTotal})
          </Text>
        </View>
      </View>

      {/* Action Cards List */}
      <ScrollView contentContainerStyle={styles.cardsList} showsVerticalScrollIndicator={false}>
        
        {/* Card 1: Auto-Scan All TIFFs */}
        <TouchableOpacity style={styles.card} onPress={handleAutoScanPress} activeOpacity={0.7}>
          <Text style={styles.cardTitle}>1. Auto-Scan All TIFFs</Text>
          <Text style={styles.cardDescription}>Automatically search and list all TIFF files across device storage.</Text>
        </TouchableOpacity>

        {/* Card 2: Pick & Convert Single File */}
        <TouchableOpacity style={styles.card} onPress={handlePickSingleFilePress} activeOpacity={0.7}>
          <Text style={styles.cardTitle}>2. Pick & Convert Single File</Text>
          <Text style={styles.cardDescription}>Open DocumentPicker to pick one TIFF file and navigate to viewer.</Text>
        </TouchableOpacity>

        {/* Card 3: Batch Conversion */}
        <TouchableOpacity style={styles.card} onPress={handleBatchConversionPress} activeOpacity={0.7}>
          <Text style={styles.cardTitle}>3. Batch Conversion</Text>
          <Text style={styles.cardDescription}>Select multiple TIFF files for batch PDF/JPG conversion.</Text>
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
    padding: 12,
    backgroundColor: '#EAEAEA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  storageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333333',
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
