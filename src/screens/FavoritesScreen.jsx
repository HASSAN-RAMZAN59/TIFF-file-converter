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
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { getFavorites, toggleFavorite } from '../services/favoritesService';
import { moveToRecycleBin } from '../services/recycleBinService';
import SearchIcon from '../assets/search.svg';
import HeartFilledIcon from '../assets/heart_filled.svg';
import HeartOutlineIcon from '../assets/heart_outline.svg';
import MoreVertIcon from '../assets/more_vert.svg';
import DeleteIcon from '../assets/delete.svg';
import ShareIcon from '../assets/share.svg';
import RenameIcon from '../assets/drive_file_rename.svg';
import ChatInfoIcon from '../assets/chat_info.svg';

const FavoritesScreen = ({ navigation }) => {
  const [favoriteFiles, setFavoriteFiles] = useState([]);
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

  // Image Preview Modal State
  const [previewFile, setPreviewFile] = useState(null);

  // About Info Modal State
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  // Delete Confirm Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const favs = await getFavorites();
      setFavoriteFiles(favs);
      const paths = favs.map((f) => f.path || f.id || f.uri).filter(Boolean);
      setFavoritesSet(new Set(paths));
    } catch (error) {
      console.warn('Error loading favorites list:', error);
      setFavoriteFiles([]);
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
    // Remove from local favorites array if unfavorited
    if (!isNowFav) {
      setFavoriteFiles((prev) => prev.filter((f) => (f.path || f.id || f.uri) !== fileKey));
    }
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
    setMenuVisible(false);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    const file = selectedFile;
    setDeleteModalVisible(false);
    if (!file) return;

    try {
      await moveToRecycleBin(file);
      await toggleFavorite(file);
      setFavoriteFiles((prev) => prev.filter((f) => f.path !== file.path && f.id !== file.id));
      const newSet = new Set(favoritesSet);
      newSet.delete(file.path);
      setFavoritesSet(newSet);
    } catch (err) {
      console.warn('Delete error:', err);
    }
  };

  const handleShare = async () => {
    const file = selectedFile;
    closeMenu();
    try {
      const fileUri = file.uri && file.uri.startsWith('file://') ? file.uri : `file://${file.path}`;
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      await Share.open({
        url: fileUri,
        type: mimeType,
        title: file.name,
        filename: file.name,
      });
    } catch (error) {
      if (error && error.message && !error.message.includes('User did not share')) {
        console.warn('Share error:', error);
      }
    }
  };

  const handleRenamePress = () => {
    const file = selectedFile;
    closeMenu();
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setRenameText(nameWithoutExt);
    setRenameVisible(true);
  };

  const handleRenameSubmit = async () => {
    if (!renameText.trim()) {
      Alert.alert('Error', 'Please enter a valid file name.');
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

      setFavoriteFiles((prev) =>
        prev.map((f) => (f.path === file.path ? { ...f, name: newName, path: newPath, uri: `file://${newPath}` } : f))
      );

      if (favoritesSet.has(file.path)) {
        await toggleFavorite(file);
        await toggleFavorite({ ...file, name: newName, path: newPath, uri: `file://${newPath}` });
      }

      loadData();
    } catch (err) {
      Alert.alert('Error', 'Could not rename file.');
    }
  };

  const handleAbout = () => {
    setMenuVisible(false);
    setAboutModalVisible(true);
  };

  const handleFilePress = (item) => {
    setPreviewFile(item);
  };

  const formatDisplayPath = (pathString) => {
    if (!pathString) return 'Storage';
    let p = pathString;
    if (p.startsWith('content://')) {
      if (p.includes('downloads') || p.includes('Download')) return 'Storage / Download';
      if (p.includes('media') || p.includes('image')) return 'Storage / Pictures';
      return 'Storage / Documents';
    }
    p = p.replace('file://', '');
    p = p.replace('/storage/emulated/0/', '').replace('/storage/emulated/0', '');
    if (p.startsWith('/')) p = p.substring(1);
    const lastSlash = p.lastIndexOf('/');
    let folderPart = lastSlash !== -1 ? p.substring(0, lastSlash) : p;
    if (!folderPart) return 'Storage';
    return `Storage / ${folderPart}`;
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
    ? favoriteFiles.filter((item) =>
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : favoriteFiles;

  const renderFileItem = ({ item, index }) => {
    const isLast = index === filteredFiles.length - 1;
    const formatStr = (item.format || item.name.split('.').pop() || 'TIFF').toUpperCase();
    const fmt = formatStr.toUpperCase();
    const formatColor =
      fmt === 'PDF' ? '#D63230' :
      fmt === 'JPG' || fmt === 'JPEG' ? '#0E8131' :
      fmt === 'WEBP' ? '#867AE3' :
      fmt === 'PNG' ? '#2676D9' :
      fmt === 'TIFF' || fmt === 'TIF' ? '#EAB308' : '#0E8131';
    const isFav = favoritesSet.has(item.path) || favoritesSet.has(item.id) || favoritesSet.has(item.uri);

    return (
      <TouchableOpacity
        style={[styles.fileItem, !isLast && styles.fileItemBorder]}
        activeOpacity={0.7}
        onPress={() => handleFilePress(item)}
      >
        <View style={styles.thumbnailWrapper}>
          {formatStr !== 'PDF' && (item.uri || item.path) ? (
            <Image
              source={{ uri: item.uri || `file://${item.path}` }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.docIconPlaceholder}>📄</Text>
            </View>
          )}
          <View style={[styles.formatBadge, { backgroundColor: formatColor }]}>
            <Text style={styles.formatBadgeText}>{formatStr}</Text>
          </View>
        </View>

        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileSubtext} numberOfLines={1}>
            {formatStr} • {formatFileSize(item.size)} {item.mtime ? `• ${formatTime(item.mtime)}` : ''}
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

      {/* Top Header */}
      <View style={styles.header}>
        {isSearchOpen ? (
          <View style={styles.searchBarRow}>
            <SearchIcon width={18} height={18} fill="#6B7280" />
            <TextInput
              style={styles.headerSearchInput}
              placeholder="Search favorites..."
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
              <Text style={styles.headerTitle}>Favorite Files</Text>
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

      {/* Main List Container */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#000000" />
          </View>
        ) : (
          <View style={styles.cardContainer}>
            <FlatList
              data={filteredFiles}
              keyExtractor={(item, index) => item.id || item.path || index.toString()}
              renderItem={renderFileItem}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <LottieView
                    source={require('../assets/no_files_found.json')}
                    autoPlay
                    loop
                    style={styles.emptyLottie}
                  />
                  <Text style={styles.emptyText}>
                    {searchQuery.trim() ? `No files matching "${searchQuery}"` : 'No favorite files yet.'}
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </View>

      {/* 3-Dots Options Menu Modal */}
      <Modal visible={menuVisible} transparent={true} animationType="fade" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <View style={styles.menuSvgWrapper}>
                <DeleteIcon width={20} height={20} />
              </View>
              <Text style={styles.menuText}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
              <View style={styles.menuSvgWrapper}>
                <ShareIcon width={20} height={20} />
              </View>
              <Text style={styles.menuText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleRenamePress}>
              <View style={styles.menuSvgWrapper}>
                <RenameIcon width={20} height={20} />
              </View>
              <Text style={styles.menuText}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
              <View style={styles.menuSvgWrapper}>
                <ChatInfoIcon width={20} height={20} />
              </View>
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
                  {(previewFile?.format || 'IMAGE').toUpperCase()} • {formatFileSize(previewFile?.size || 0)}
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

      {/* About File Info Modal */}
      <Modal
        visible={aboutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={styles.aboutModalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setAboutModalVisible(false)}
          />

          <View style={styles.aboutModalCard}>
            <View style={styles.aboutModalHeader}>
              <View style={styles.aboutIconCircle}>
                <ChatInfoIcon width={22} height={22} />
              </View>
              <Text style={styles.aboutModalTitle}>File Information</Text>
            </View>

            <View style={styles.aboutDetailsBox}>
              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>File Name:</Text>
                <Text style={styles.aboutValue} numberOfLines={2}>{selectedFile?.name}</Text>
              </View>

              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>Format:</Text>
                <View style={[styles.aboutFormatBadge, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.aboutFormatText}>{(selectedFile?.format || selectedFile?.name?.split('.').pop() || 'FILE').toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>File Size:</Text>
                <Text style={styles.aboutValue}>{formatFileSize(selectedFile?.size || 0)}</Text>
              </View>

              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>Location:</Text>
                <Text style={styles.aboutPathValue}>{formatDisplayPath(selectedFile?.path || selectedFile?.uri)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.aboutOkBtn}
              onPress={() => setAboutModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.aboutOkBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setDeleteModalVisible(false)}
          />

          <View style={styles.deleteModalCard}>
            <View style={styles.deleteIconCircle}>
              <DeleteIcon width={24} height={24} />
            </View>

            <Text style={styles.deleteModalTitle}>Delete File?</Text>
            <Text style={styles.deleteModalDesc}>
              Are you sure you want to delete <Text style={styles.deleteFileNameHighlight}>{selectedFile?.name}</Text>? This action cannot be undone.
            </Text>

            <View style={styles.deleteActionsRow}>
              <TouchableOpacity
                style={styles.deleteCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={handleConfirmDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteConfirmBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
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
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 12.5,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    marginBottom: 3,
  },
  fileSubtext: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Poppins-Regular',
  },
  actionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  actionBtn: {
    paddingHorizontal: 2,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLottie: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Poppins-Regular',
  },

  // Menu Modal Styles
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
  menuSvgWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
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
    fontFamily: 'Poppins-Medium',
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
    fontFamily: 'Poppins-Medium',
    color: '#4B5563',
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
    color: '#111827',
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

  // About Info Modal Styles
  aboutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  aboutModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  aboutModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aboutIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aboutModalTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Medium',
    color: '#111827',
  },
  aboutDetailsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
    marginBottom: 20,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aboutLabel: {
    width: 80,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#6B7280',
  },
  aboutValue: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#1E1E1E',
  },
  aboutFormatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  aboutFormatText: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },
  aboutPathValue: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    lineHeight: 16,
  },
  aboutOkBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  aboutOkBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },

  // Delete Confirmation Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalCard: {
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
  deleteIconCircle: {
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
  deleteModalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    marginBottom: 8,
  },
  deleteModalDesc: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteFileNameHighlight: {
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
  },
  deleteActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#4B5563',
  },
  deleteConfirmBtn: {
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
  deleteConfirmBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },
});

export default FavoritesScreen;
