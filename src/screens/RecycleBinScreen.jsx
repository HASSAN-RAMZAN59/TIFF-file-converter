import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import {
  getRecycleBinFiles,
  restoreFromRecycleBin,
  deletePermanentlyFromRecycleBin,
  emptyRecycleBin,
} from '../services/recycleBinService';
import DeleteIcon from '../assets/delete.svg';
import BackIcon from '../assets/Back Press.svg';
import { useTranslation } from 'react-i18next';

const ChevronLeftIcon = ({ size = 22, color = '#1E1E1E' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18L9 12L15 6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CheckCircleIcon = ({ size = 24, color = '#10B981' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const RecycleBinScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [binFiles, setBinFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [emptyModalVisible, setEmptyModalVisible] = useState(false);
  const [restoreSuccessModalVisible, setRestoreSuccessModalVisible] = useState(false);
  const [restoredFileName, setRestoredFileName] = useState('');

  // Emptying Progress Indicator State
  const [emptyProgress, setEmptyProgress] = useState({
    isProcessing: false,
    current: 0,
    total: 0,
    percentage: 0,
    fileName: '',
  });

  const loadData = async () => {
    setLoading(true);
    const files = await getRecycleBinFiles();
    setBinFiles(files);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRestore = async (item) => {
    const success = await restoreFromRecycleBin(item);
    if (success) {
      setBinFiles((prev) => prev.filter((f) => f.id !== item.id));
      setRestoredFileName(item.name);
      setRestoreSuccessModalVisible(true);
      setTimeout(() => {
        setRestoreSuccessModalVisible(false);
      }, 1500);
    } else {
      Alert.alert('Error', 'Could not restore file.');
    }
  };

  const handlePromptDeletePermanently = (item) => {
    setSelectedItem(item);
    setDeleteModalVisible(true);
  };

  const handleConfirmDeletePermanently = async () => {
    if (!selectedItem) return;
    const itemToDelete = selectedItem;
    setDeleteModalVisible(false);
    setSelectedItem(null);

    const success = await deletePermanentlyFromRecycleBin(itemToDelete);
    if (success) {
      setBinFiles((prev) => prev.filter((f) => f.id !== itemToDelete.id));
    } else {
      Alert.alert('Error', 'Could not delete file permanently.');
    }
  };

  const handleConfirmEmptyBin = async () => {
    setEmptyModalVisible(false);
    const filesToEmpty = [...binFiles];
    if (filesToEmpty.length === 0) return;

    setEmptyProgress({
      isProcessing: true,
      current: 0,
      total: filesToEmpty.length,
      percentage: 0,
      fileName: filesToEmpty[0]?.name || '',
    });

    try {
      for (let i = 0; i < filesToEmpty.length; i++) {
        const item = filesToEmpty[i];
        setEmptyProgress({
          isProcessing: true,
          current: i + 1,
          total: filesToEmpty.length,
          percentage: Math.round(((i + 1) / filesToEmpty.length) * 100),
          fileName: item.name || '',
        });
        await deletePermanentlyFromRecycleBin(item);
      }
      await emptyRecycleBin();
      setBinFiles([]);
    } catch (e) {
      console.warn('Error emptying recycle bin:', e);
    } finally {
      setEmptyProgress({
        isProcessing: false,
        current: 0,
        total: 0,
        percentage: 0,
        fileName: '',
      });
    }
  };

  const formatFileSize = (bytes) => {
    const b = Number(bytes) || 0;
    if (b <= 0) return '0 KB';
    const mb = b / 1024 / 1024;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(b / 1024).toFixed(1)} KB`;
  };

  const formatDeletedDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderItem = ({ item, index }) => {
    const isLast = index === binFiles.length - 1;
    const isImage = item.format !== 'PDF' && (item.uri || item.binPath);
    const fmt = (item.format || 'TIFF').toUpperCase();
    const formatColor =
      fmt === 'PDF' ? '#D63230' :
      fmt === 'JPG' || fmt === 'JPEG' ? '#0E8131' :
      fmt === 'WEBP' ? '#867AE3' :
      fmt === 'PNG' ? '#2676D9' :
      fmt === 'TIFF' || fmt === 'TIF' ? '#EAB308' : '#0E8131';

    return (
      <View style={[styles.fileCard, !isLast && styles.fileCardBorder]}>
        {/* Thumbnail */}
        <View style={styles.thumbnailWrapper}>
          {isImage ? (
            <Image
              source={{ uri: item.uri || `file://${item.binPath}` }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.docIconPlaceholder}>📄</Text>
            </View>
          )}
          <View style={[styles.formatBadge, { backgroundColor: formatColor }]}>
            <Text style={styles.formatBadgeText}>{item.format || 'TIFF'}</Text>
          </View>
        </View>

        {/* File Info */}
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.fileSubtext} numberOfLines={1}>
            {formatFileSize(item.size)} • {formatDeletedDate(item.deletedAt)}
          </Text>
        </View>

        {/* Action Buttons: Restore & Delete Permanently */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.restoreBtn}
            activeOpacity={0.7}
            onPress={() => handleRestore(item)}
          >
            <Text style={styles.restoreBtnText}>{t('Restore')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deletePermanentlyBtn}
            activeOpacity={0.7}
            onPress={() => handlePromptDeletePermanently(item)}
          >
            <DeleteIcon width={18} height={18} fill="#2780FB" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <BackIcon width={24} height={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Recycle Bin')}</Text>
        </View>

        {binFiles.length > 0 && (
          <TouchableOpacity
            style={styles.emptyAllBtn}
            activeOpacity={0.7}
            onPress={() => setEmptyModalVisible(true)}
          >
            <Text style={styles.emptyAllText}>{t('Empty')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : binFiles.length === 0 ? (
        <View style={styles.centerContainer}>
          <LottieView
            source={require('../assets/no_files_found.json')}
            autoPlay
            loop
            style={styles.emptyLottie}
          />
          <Text style={styles.emptyTitle}>{t('Recycle Bin is Empty')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('Deleted files will appear here and can be restored or deleted permanently.')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardContainer}>
            {binFiles.map((item, index) => (
              <React.Fragment key={item.id || index.toString()}>
                {renderItem({ item, index })}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Delete Permanently Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setDeleteModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalDeleteIconCircle}>
              <DeleteIcon width={24} height={24} fill="#2780FB" />
            </View>

            <Text style={styles.modalTitle}>{t('Delete Permanently?')}</Text>
            <Text style={styles.modalDesc}>
              {t('Are you sure you want to permanently delete')}{' '}
              <Text style={styles.modalHighlight}>{selectedItem?.name}</Text>? {t('This action cannot be undone.')}
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmDeleteBtn}
                onPress={handleConfirmDeletePermanently}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmDeleteBtnText}>{t('Delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Empty All Recycle Bin Modal */}
      <Modal
        visible={emptyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEmptyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setEmptyModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalDeleteIconCircle}>
              <DeleteIcon width={24} height={24} fill="#2780FB" />
            </View>

            <Text style={styles.modalTitle}>{t('Empty Recycle Bin?')}</Text>
            <Text style={styles.modalDesc}>
              {t('Are you sure you want to permanently delete')} {binFiles.length} {t('files')}? {t('This action cannot be undone.')}
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEmptyModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmDeleteBtn}
                onPress={handleConfirmEmptyBin}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmDeleteBtnText}>{t('Empty All')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Emptying Progress Indicator Modal */}
      <Modal
        visible={emptyProgress.isProcessing}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.emptyProgressOverlay}>
          <View style={styles.emptyProgressCard}>
            <View style={styles.emptyProgressIconCircle}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>

            <Text style={styles.emptyProgressTitle}>{t('Emptying Recycle Bin...')}</Text>

            <Text style={styles.emptyProgressSub}>
              {emptyProgress.current} / {emptyProgress.total}
            </Text>

            {/* Slider / Progress Bar */}
            <View style={styles.emptyProgressBarBg}>
              <View
                style={[
                  styles.emptyProgressBarFill,
                  { width: `${emptyProgress.percentage}%` },
                ]}
              />
            </View>

            <View style={styles.emptyProgressFooter}>
              <Text style={styles.emptyProgressFileName} numberOfLines={1}>
                {emptyProgress.fileName}
              </Text>
              <Text style={styles.emptyProgressPercentText}>
                {emptyProgress.percentage}%
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Restore Success Modal */}
      <Modal
        visible={restoreSuccessModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalDeleteIconCircle, { borderColor: '#D1FAE5', backgroundColor: '#ECFDF5' }]}>
              <CheckCircleIcon size={28} color="#10B981" />
            </View>

            <Text style={styles.modalTitle}>{t('File Restored')}</Text>
            <Text style={[styles.modalDesc, { marginBottom: 4 }]}>
              <Text style={styles.modalHighlight}>{restoredFileName}</Text> {t('has been restored successfully.')}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default RecycleBinScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
  },
  emptyAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  emptyAllText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#EF4444',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fileCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnailImage: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  thumbnailPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconPlaceholder: {
    fontSize: 20,
  },
  formatBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
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
    marginRight: 8,
  },
  fileName: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    marginBottom: 2,
  },
  fileSubtext: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restoreBtn: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8E5FE',
  },
  restoreBtnText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    color: '#2563EB',
  },
  deletePermanentlyBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modals Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBackdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalDeleteIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalHighlight: {
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
  },
  modalActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#64748B',
  },
  modalConfirmDeleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmDeleteBtnText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },
  emptyLottie: {
    width: 220,
    height: 220,
    marginBottom: 4,
  },
  emptyProgressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyProgressCard: {
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
  emptyProgressIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyProgressTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
    color: '#1E1E1E',
    marginBottom: 4,
  },
  emptyProgressSub: {
    fontSize: 12.5,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    marginBottom: 18,
    textAlign: 'center',
  },
  emptyProgressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  emptyProgressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  emptyProgressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  emptyProgressFileName: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    marginRight: 8,
  },
  emptyProgressPercentText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#2563EB',
  },
});
