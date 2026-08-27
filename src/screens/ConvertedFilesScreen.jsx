import React, { useState, useCallback, useEffect } from 'react';
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
  ScrollView,
  BackHandler,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { getConvertedFilesList } from '../services/tiffConverterService';
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

const ConvertedFilesScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [convertedFiles, setConvertedFiles] = useState([]);
  const [favoritesSet, setFavoritesSet] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Multi-Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFileKeys, setSelectedFileKeys] = useState(new Set());
  const [multiDeleteModalVisible, setMultiDeleteModalVisible] = useState(false);
  const [deletingProgress, setDeletingProgress] = useState({
    isDeleting: false,
    current: 0,
    total: 0,
    percentage: 0,
    fileName: '',
  });

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

  // Handle hardware back button in selection mode
  useEffect(() => {
    const backAction = () => {
      if (isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedFileKeys(new Set());
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isSelectionMode]);

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
    setMenuVisible(false);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    const file = selectedFile;
    setDeleteModalVisible(false);
    if (!file) return;

    try {
      await moveToRecycleBin(file);
      setConvertedFiles((prev) => prev.filter((f) => f.path !== file.path && f.id !== file.id));
      if (favoritesSet.has(file.path)) {
        await toggleFavorite(file);
        const newSet = new Set(favoritesSet);
        newSet.delete(file.path);
        setFavoritesSet(newSet);
      }
    } catch (err) {
      console.warn('Delete error:', err);
    }
  };

  const handleShare = async () => {
    const file = selectedFile;
    closeMenu();
    try {
      let sourcePath = file?.path || (file?.uri ? file.uri.replace('file://', '').replace('content://', '') : null);
      if (!sourcePath || !(await RNFS.exists(sourcePath))) {
        Alert.alert(t('Error'), t('File does not exist or is inaccessible.'));
        return;
      }

      // Copy to cache directory to avoid Android FileProvider paths.xml restrictions
      const tempSharePath = `${RNFS.CachesDirectoryPath}/share_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      await RNFS.copyFile(sourcePath, tempSharePath);
      
      const shareUrl = `file://${tempSharePath}`;
      const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
      const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      await Share.open({
        url: shareUrl,
        type: mimeType,
        title: file.name,
        filename: file.name,
        failOnCancel: false,
      });
      
      // Cleanup temp file after share dialog closes/fails
      setTimeout(async () => {
        try { await RNFS.unlink(tempSharePath); } catch (e) {}
      }, 10000);

    } catch (error) {
      if (error && error.message && !error.message.includes('User did not share') && !error.message.includes('dismissed') && !error.message.includes('Canceled')) {
        console.warn('Share error:', error);
      }
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
    setMenuVisible(false);
    setAboutModalVisible(true);
  };

  const handleFilePress = (item) => {
    setPreviewFile(item);
  };

  const formatDisplayPath = (pathString) => {
    if (!pathString) return t('Storage');
    let p = pathString;
    if (p.startsWith('content://')) {
      if (p.includes('downloads') || p.includes('Download')) return `${t('Storage')} / ${t('Download')}`;
      if (p.includes('media') || p.includes('image')) return `${t('Storage')} / ${t('Pictures')}`;
      return `${t('Storage')} / ${t('Documents')}`;
    }
    p = p.replace('file://', '');
    p = p.replace('/storage/emulated/0/', '').replace('/storage/emulated/0', '');
    if (p.startsWith('/')) p = p.substring(1);
    const lastSlash = p.lastIndexOf('/');
    let folderPart = lastSlash !== -1 ? p.substring(0, lastSlash) : p;
    if (!folderPart) return t('Storage');
    return `${t('Storage')} / ${t(folderPart)}`;
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

  const handleItemLongPress = (item) => {
    const key = item.path || item.id || item.uri;
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedFileKeys(new Set([key]));
    } else {
      toggleSelectFile(key);
    }
  };

  const toggleSelectFile = (key) => {
    setSelectedFileKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAllToggle = () => {
    if (selectedFileKeys.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedFileKeys(new Set());
    } else {
      const allKeys = filteredFiles.map((f) => f.path || f.id || f.uri).filter(Boolean);
      setSelectedFileKeys(new Set(allKeys));
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedFileKeys(new Set());
  };

  const handleDeleteSelectedPress = () => {
    if (selectedFileKeys.size === 0) {
      Alert.alert('Selection', 'Please select at least one file to delete.');
      return;
    }
    setMultiDeleteModalVisible(true);
  };

  const handleConfirmMultiDelete = async () => {
    setMultiDeleteModalVisible(false);
    const itemsToDelete = convertedFiles.filter((f) =>
      selectedFileKeys.has(f.path || f.id || f.uri)
    );
    if (itemsToDelete.length === 0) {
      exitSelectionMode();
      return;
    }

    setDeletingProgress({
      isDeleting: true,
      current: 0,
      total: itemsToDelete.length,
      percentage: 0,
      fileName: itemsToDelete[0]?.name || '',
    });

    try {
      for (let i = 0; i < itemsToDelete.length; i++) {
        const file = itemsToDelete[i];
        setDeletingProgress({
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
      const updatedFiles = convertedFiles.filter(
        (f) => !selectedFileKeys.has(f.path || f.id || f.uri)
      );
      setConvertedFiles(updatedFiles);
      setFavoritesSet((prev) => {
        const next = new Set(prev);
        itemsToDelete.forEach((f) => {
          next.delete(f.path);
          next.delete(f.id);
          next.delete(f.uri);
        });
        return next;
      });
    } catch (err) {
      console.warn('Multi delete error:', err);
      Alert.alert('Error', 'An error occurred while deleting files.');
    } finally {
      setDeletingProgress({
        isDeleting: false,
        current: 0,
        total: 0,
        percentage: 0,
        fileName: '',
      });
      exitSelectionMode();
    }
  };

  const renderFileItem = ({ item, index }) => {
    const isLast = index === filteredFiles.length - 1;
    const fmt = (item.format || (item.name ? item.name.split('.').pop() : '')).toUpperCase();
    const formatColor =
      fmt === 'PDF' ? '#D63230' :
      fmt === 'JPG' || fmt === 'JPEG' ? '#0E8131' :
      fmt === 'WEBP' ? '#867AE3' :
      fmt === 'PNG' ? '#2676D9' :
      fmt === 'TIFF' || fmt === 'TIF' ? '#EAB308' : '#0E8131';
    const fileKey = item.path || item.id || item.uri;
    const isFav = favoritesSet.has(item.path) || favoritesSet.has(item.id) || favoritesSet.has(item.uri);
    const isSelected = selectedFileKeys.has(fileKey);

    return (
      <TouchableOpacity 
        style={[
          styles.fileItem,
          !isLast && styles.fileItemBorder,
          isSelected && styles.fileItemSelected,
        ]} 
        activeOpacity={0.7}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelectFile(fileKey);
          } else {
            handleFilePress(item);
          }
        }}
        onLongPress={() => handleItemLongPress(item)}
        delayLongPress={300}
      >
        
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

        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileSubtext} numberOfLines={1}>
            {item.format} . {formatFileSize(item.size)} . {formatTime(item.mtime)}
          </Text>
        </View>

        {isSelectionMode ? (
          <View style={styles.checkboxWrapper}>
            {isSelected ? (
              <View style={styles.checkedCircle}>
                <CheckmarkIcon size={12} color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.uncheckedCircle} />
            )}
          </View>
        ) : (
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
        )}

      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />
      
      {isSelectionMode ? (
        <View style={styles.selectionHeader}>
          <View style={styles.selectionHeaderLeft}>
            <TouchableOpacity
              style={styles.closeSelectionBtn}
              onPress={exitSelectionMode}
              activeOpacity={0.7}
            >
              <Text style={styles.closeSelectionText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.selectionCountText}>
              {selectedFileKeys.size} {t('Selected')}
            </Text>
          </View>
          <View style={styles.selectionHeaderRight}>
            <TouchableOpacity
              style={styles.selectAllHeaderBtn}
              onPress={handleSelectAllToggle}
              activeOpacity={0.7}
            >
              <Text style={styles.selectAllHeaderText}>
                {selectedFileKeys.size === filteredFiles.length && filteredFiles.length > 0
                  ? t('Deselect All')
                  : t('Select All')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteSelectedHeaderBtn,
                selectedFileKeys.size === 0 && styles.deleteSelectedHeaderBtnDisabled,
              ]}
              onPress={handleDeleteSelectedPress}
              activeOpacity={0.7}
              disabled={selectedFileKeys.size === 0}
            >
              <DeleteIcon
                width={20}
                height={20}
                fill={selectedFileKeys.size === 0 ? '#9CA3AF' : '#EF4444'}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
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
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>{t('Converted Files')}</Text>
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
      )}

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {filteredFiles.length > 0 ? (
            <View style={styles.cardContainer}>
              {filteredFiles.map((item, index) => (
                <React.Fragment key={item.id || item.path || index.toString()}>
                  {renderFileItem({ item, index })}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <LottieView
                source={require('../assets/no_files_found.json')}
                autoPlay
                loop
                style={styles.emptyLottie}
              />
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? `${t('No files matching')} "${searchQuery}"` : t('No recent converted files.')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Options Menu Modal */}
      <Modal visible={menuVisible} transparent={true} animationType="fade" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <View style={styles.menuSvgWrapper}>
                <DeleteIcon width={20} height={20} />
              </View>
              <Text style={styles.menuText}>{t('Delete')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
              <View style={styles.menuSvgWrapper}>
                <ShareIcon width={20} height={20} />
              </View>
              <Text style={styles.menuText}>{t('Share')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleRenamePress}>
              <View style={styles.menuSvgWrapper}>
                <RenameIcon width={20} height={20} />
              </View>
              <Text style={styles.menuText}>{t('Rename')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
              <View style={styles.menuSvgWrapper}>
                <ChatInfoIcon width={20} height={20} />
              </View>
              <Text style={styles.menuText}>{t('About')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={renameVisible} transparent={true} animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle}>{t('Rename File')}</Text>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus={true}
              selectionColor="#3B82F6"
            />
            <View style={styles.renameActions}>
              <TouchableOpacity style={styles.renameBtn} onPress={() => setRenameVisible(false)}>
                <Text style={styles.renameBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.renameBtn, { backgroundColor: '#3B82F6', borderWidth: 0 }]} onPress={handleRenameSubmit}>
                <Text style={[styles.renameBtnText, { color: '#FFFFFF' }]}>{t('Rename')}</Text>
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
                  {previewFile?.name || t('Image Preview')}
                </Text>
                <Text style={styles.previewModalFileSize}>
                  {previewFile?.format} . {formatFileSize(previewFile?.size || 0)}
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
              {previewFile?.thumbUri ? (
                <Image 
                  source={{ uri: previewFile.thumbUri }} 
                  style={styles.previewModalImage} 
                  resizeMode="contain" 
                />
              ) : (
                <View style={styles.previewModalLoadingBox}>
                  <Text style={styles.previewModalLoadingText}>{t('No image preview available')}</Text>
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
              <Text style={styles.aboutModalTitle}>{t('File Information')}</Text>
            </View>

            <View style={styles.aboutDetailsBox}>
              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>{t('File Name:')}</Text>
                <Text style={styles.aboutValue} numberOfLines={2}>{selectedFile?.name}</Text>
              </View>

              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>{t('Format:')}</Text>
                <View style={[styles.aboutFormatBadge, { backgroundColor: selectedFile?.format === 'PDF' ? '#EF4444' : selectedFile?.format === 'PNG' ? '#3B82F6' : '#10B981' }]}>
                  <Text style={styles.aboutFormatText}>{selectedFile?.format}</Text>
                </View>
              </View>

              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>{t('File Size:')}</Text>
                <Text style={styles.aboutValue}>{formatFileSize(selectedFile?.size || 0)}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.aboutOkBtn} 
              onPress={() => setAboutModalVisible(false)}
              activeOpacity={0.8}
            >
              <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 1 1" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="aboutOkBtnGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#1A6CFA" />
                    <Stop offset="100%" stopColor="#3FA5FC" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="1" height="1" fill="url(#aboutOkBtnGrad)" />
              </Svg>
              <Text style={styles.aboutOkBtnText}>{t('Done')}</Text>
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

            <Text style={styles.deleteModalTitle}>{t('Delete Permanently?')}</Text>
            <Text style={styles.deleteModalDesc}>
              {t('Are you sure you want to permanently delete')} <Text style={styles.deleteFileNameHighlight}>{selectedFile?.name}</Text>? {t('This action cannot be undone.')}
            </Text>

            <View style={styles.deleteActionsRow}>
              <TouchableOpacity 
                style={styles.deleteCancelBtn} 
                onPress={() => setDeleteModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteCancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.deleteConfirmBtn} 
                onPress={handleConfirmDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteConfirmBtnText}>{t('Delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Multi-Delete Confirmation Modal */}
      <Modal
        visible={multiDeleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMultiDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdropTap} 
            activeOpacity={1} 
            onPress={() => setMultiDeleteModalVisible(false)} 
          />
          
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteIconCircle}>
              <DeleteIcon width={24} height={24} fill="#EF4444" />
            </View>

            <Text style={styles.deleteModalTitle}>
              {t('Delete')} {selectedFileKeys.size} {selectedFileKeys.size === 1 ? 'File' : 'Files'}?
            </Text>
            <Text style={styles.deleteModalDesc}>
              {t('Are you sure you want to permanently delete')} {selectedFileKeys.size} {selectedFileKeys.size === 1 ? 'file' : 'files'}?
            </Text>

            <View style={styles.deleteActionsRow}>
              <TouchableOpacity 
                style={styles.deleteCancelBtn} 
                onPress={() => setMultiDeleteModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteCancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.deleteConfirmBtn} 
                onPress={handleConfirmMultiDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteConfirmBtnText}>{t('Delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deleting Progress Indicator Modal */}
      <Modal
        visible={deletingProgress.isDeleting}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.deleteProgressOverlay}>
          <View style={styles.deleteProgressCard}>
            <View style={styles.deleteProgressIconCircle}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>

            <Text style={styles.deleteProgressTitle}>Deleting Files...</Text>
            
            <Text style={styles.deleteProgressSub}>
              Moving {deletingProgress.current} of {deletingProgress.total} {deletingProgress.total === 1 ? 'file' : 'files'} to Recycle Bin
            </Text>

            {/* Slider / Progress Bar */}
            <View style={styles.deleteProgressBarBg}>
              <View
                style={[
                  styles.deleteProgressBarFill,
                  { width: `${deletingProgress.percentage}%` },
                ]}
              />
            </View>

            <View style={styles.deleteProgressFooter}>
              <Text style={styles.deleteProgressFileName} numberOfLines={1}>
                {deletingProgress.fileName}
              </Text>
              <Text style={styles.deleteProgressPercentText}>
                {deletingProgress.percentage}%
              </Text>
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
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeSelectionBtn: {
    padding: 6,
    marginRight: 10,
  },
  closeSelectionText: {
    fontSize: 16,
    color: '#4B5563',
    fontFamily: 'Poppins-Medium',
  },
  selectionCountText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1E1E1E',
  },
  selectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectAllHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  selectAllHeaderText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#2563EB',
  },
  deleteSelectedHeaderBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteSelectedHeaderBtnDisabled: {
    opacity: 0.4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 22,
    color: '#1E1E1E',
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
  searchIcon: {
    fontSize: 20,
    color: '#111827',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  cardContainer: {
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
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  fileItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  fileItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkboxWrapper: {
    paddingLeft: 8,
    paddingRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
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
    fontFamily: 'Poppins-Medium',
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
  actionIconStar: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  actionIconDots: {
    fontSize: 20,
    color: '#1E1E1E',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 350,
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
    color: '#1E1E1E',
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
    color: '#1E1E1E',
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
    color: '#1E1E1E',
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
    fontFamily: 'Poppins-Medium',
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
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A6CFA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A6CFA',
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
  deleteProgressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteProgressCard: {
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
  deleteProgressIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteProgressTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
    color: '#1E1E1E',
    marginBottom: 4,
  },
  deleteProgressSub: {
    fontSize: 12.5,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    marginBottom: 18,
    textAlign: 'center',
  },
  deleteProgressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  deleteProgressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  deleteProgressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  deleteProgressFileName: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    marginRight: 8,
  },
  deleteProgressPercentText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#2563EB',
  },
});

export default ConvertedFilesScreen;
