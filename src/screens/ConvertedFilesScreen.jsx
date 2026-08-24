import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  Share,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import { getConvertedFilesList } from '../services/tiffConverterService';
import { getFavorites, toggleFavorite } from '../services/favoritesService';
import SearchIcon from '../assets/search.svg';
import HeartFilledIcon from '../assets/heart_filled.svg';
import HeartOutlineIcon from '../assets/heart_outline.svg';
import MoreVertIcon from '../assets/more_vert.svg';

const ConvertedFilesScreen = ({ navigation }) => {
  const [convertedFiles, setConvertedFiles] = useState([]);
  const [favoritesSet, setFavoritesSet] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Menu State
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Rename State
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameText, setRenameText] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [files, favs] = await Promise.all([
        getConvertedFilesList(),
        getFavorites(),
      ]);
      setConvertedFiles(files);
      const paths = favs.map((f) => f.path || f.id || f.uri).filter(Boolean);
      setFavoritesSet(new Set(paths));
    } catch (error) {
      setConvertedFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

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

  const openMenu = (item) => {
    setSelectedFile(item);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedFile(null);
  };

  const handleDelete = () => {
    const file = selectedFile;
    closeMenu();
    Alert.alert('Delete File', `Are you sure you want to delete ${file.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await RNFS.unlink(file.path);
            setConvertedFiles((prev) => prev.filter((f) => f.path !== file.path));
            // Option: Also remove from favorites if it was there
            if (favoritesSet.has(file.path)) {
               await toggleFavorite(file);
               const newSet = new Set(favoritesSet);
               newSet.delete(file.path);
               setFavoritesSet(newSet);
            }
          } catch (err) {
            Alert.alert('Error', 'Could not delete file.');
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    const file = selectedFile;
    closeMenu();
    try {
      await Share.share({
        title: file.name,
        url: file.uri,
        message: `Check out this file: ${file.name}`,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  const handleRenamePress = () => {
    const file = selectedFile;
    closeMenu();
    // Remove extension for the input
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setRenameText(nameWithoutExt);
    setSelectedFile(file);
    setRenameVisible(true);
  };

  const handleRenameSubmit = async () => {
    if (!renameText.trim()) {
      Alert.alert('Error', 'File name cannot be empty.');
      return;
    }
    const file = selectedFile;
    setRenameVisible(false);
    
    try {
      const ext = file.name.substring(file.name.lastIndexOf('.'));
      const newName = `${renameText.trim()}${ext}`;
      const newPath = file.path.replace(file.name, newName);

      if (await RNFS.exists(newPath)) {
        Alert.alert('Error', 'A file with this name already exists.');
        return;
      }

      await RNFS.moveFile(file.path, newPath);
      
      // Update state
      setConvertedFiles((prev) =>
        prev.map((f) => (f.path === file.path ? { ...f, name: newName, path: newPath, uri: `file://${newPath}` } : f))
      );
      
      // If it was a favorite, update favorite path (this requires removing old and adding new, handled simply by refreshing or adjusting list)
      if (favoritesSet.has(file.path)) {
        await toggleFavorite(file); // remove old
        await toggleFavorite({ ...file, name: newName, path: newPath, uri: `file://${newPath}` }); // add new
      }
      
      loadData(); // Re-fetch to make sure everything is in sync
    } catch (err) {
      Alert.alert('Error', 'Could not rename file.');
    }
  };

  const handleAbout = () => {
    const file = selectedFile;
    closeMenu();
    Alert.alert(
      'File Info',
      `Name: ${file.name}\n\nFormat: ${file.format}\n\nSize: ${formatFileSize(file.size)}\n\nPath: ${file.path}`
    );
  };

  const handleFilePress = (item) => {
    if (['JPG', 'PNG', 'WEBP', 'JPEG'].includes(item.format.toUpperCase())) {
      navigation.navigate('PreviewScreen', { file: item });
    } else {
      Alert.alert('PDF Saved', `File is saved at:\n${item.path}`);
    }
  };

  const formatFileSize = (bytes) => {
    const b = Number(bytes) || 0;
    if (b <= 0) return '0 KB';
    const mb = b / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatTime = (dateObj) => {
    const d = new Date(dateObj);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isToday = new Date().toDateString() === d.toDateString();
    return `${isToday ? 'Today' : d.toLocaleDateString()}, ${time}`;
  };

  const filteredFiles = searchQuery.trim()
    ? convertedFiles.filter((item) =>
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : convertedFiles;

  const renderFileItem = ({ item, index }) => {
    const isLast = index === filteredFiles.length - 1;
    const formatColor = item.format === 'PDF' ? '#EF4444' : item.format === 'PNG' ? '#3B82F6' : '#10B981';
    const isFav = favoritesSet.has(item.path) || favoritesSet.has(item.id) || favoritesSet.has(item.uri);

    return (
      <TouchableOpacity 
        style={[styles.fileItem, !isLast && styles.fileItemBorder]} 
        activeOpacity={0.7}
        onPress={() => handleFilePress(item)}
      >
        
        <View style={styles.thumbnailWrapper}>
           <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.docIconPlaceholder}>📄</Text>
           </View>
           <View style={[styles.formatBadge, { backgroundColor: formatColor }]}>
             <Text style={styles.formatBadgeText}>{item.format}</Text>
           </View>
        </View>

        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileSubtext} numberOfLines={1}>
            {item.format} . {formatFileSize(item.size)} . {formatTime(item.mtime)}
          </Text>
        </View>

        <View style={styles.actionsWrapper}>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => handleToggleFavorite(item)}
              activeOpacity={0.6}
            >
              {isFav ? (
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
             style={styles.actionBtn} 
             onPress={() => openMenu(item)}
             activeOpacity={0.6}
           >
             <MoreVertIcon width={18} height={18} fill="#111827" />
           </TouchableOpacity>
        </View>

      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />
      
      <View style={styles.header}>
        {isSearchOpen ? (
          <View style={styles.searchBarRow}>
            <SearchIcon width={18} height={18} fill="#6B7280" />
            <TextInput
              style={styles.headerSearchInput}
              placeholder="Search converted files..."
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
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Recent Converted</Text>
            </View>
            <TouchableOpacity 
              style={styles.searchBtn} 
              activeOpacity={0.7}
              onPress={() => setIsSearchOpen(true)}
            >
              <SearchIcon width={20} height={20} fill="#111827" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#000000" />
          </View>
        ) : (
          <View style={styles.cardContainer}>
            <FlatList
              data={filteredFiles}
              keyExtractor={(item) => item.id}
              renderItem={renderFileItem}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery.trim() ? `No files matching "${searchQuery}"` : 'No converted files yet.'}
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </View>

      {/* Options Menu Modal */}
      <Modal visible={menuVisible} transparent={true} animationType="fade" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Text style={[styles.menuIcon, { color: '#EF4444' }]}>✕</Text>
              <Text style={styles.menuText}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
              <Text style={[styles.menuIcon, { color: '#3B82F6' }]}>➔</Text>
              <Text style={styles.menuText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleRenamePress}>
              <Text style={[styles.menuIcon, { color: '#3B82F6' }]}>✎</Text>
              <Text style={styles.menuText}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
              <Text style={[styles.menuIcon, { color: '#3B82F6' }]}>ℹ</Text>
              <Text style={styles.menuText}>About</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={renameVisible} transparent={true} animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle}>Rename File</Text>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus={true}
              selectionColor="#3B82F6"
            />
            <View style={styles.renameActions}>
              <TouchableOpacity style={styles.renameBtn} onPress={() => setRenameVisible(false)}>
                <Text style={styles.renameBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.renameBtn, { backgroundColor: '#3B82F6', borderWidth: 0 }]} onPress={handleRenameSubmit}>
                <Text style={[styles.renameBtnText, { color: '#FFFFFF' }]}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  searchBtn: {
    padding: 4,
  },
  searchBarRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#111827',
    padding: 0,
  },
  closeSearchBtn: {
    padding: 4,
    marginLeft: 6,
  },
  closeSearchText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Poppins-Bold',
  },
  searchIcon: {
    fontSize: 20,
    color: '#111827',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  listContent: {
    paddingVertical: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  fileItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  thumbnailPlaceholder: {
    width: 46,
    height: 46,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docIconPlaceholder: {
    fontSize: 20,
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
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  fileSubtext: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Poppins-Medium',
  },
  actionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconStar: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  actionIconDots: {
    fontSize: 20,
    color: '#111827',
    fontWeight: 'bold',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Poppins-Regular',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 15,
    color: '#1F2937',
    fontFamily: 'Poppins-Medium',
  },
  
  // Rename Modal Styles
  renameCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  renameTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    marginBottom: 20,
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  renameBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  renameBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#4B5563',
  },
});

export default ConvertedFilesScreen;
