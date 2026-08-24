import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  PanResponder,
} from 'react-native';
import { decodeTiffToBase64Uri, cropAndRotateImage } from '../services/tiffDecoderService';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import EditDocumentIcon from '../assets/edit_document.svg';
import PreviewDeleteIcon from '../assets/preview_delete.svg';
import PreviewInfoIcon from '../assets/preview_info.svg';
import PreviewShareIcon from '../assets/preview_share.svg';
import CropIcon from '../assets/crop.svg';
import CropRotateIcon from '../assets/crop_rotate.svg';

const PreviewScreen = ({ route, navigation }) => {
  const { file } = route.params || {};
  const [imageUri, setImageUri] = useState(file?.uri || null);
  const [loading, setLoading] = useState(!file?.uri);

  // Modals state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  // Edit Mode state (Crop / Rotate)
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeEditTool, setActiveEditTool] = useState('crop'); // 'crop' | 'rotate'
  const [rotationDegree, setRotationDegree] = useState(0);

  // Interactive Crop Selection Box State (pixel relative to container)
  const [containerSize, setContainerSize] = useState({ width: 320, height: 450 });
  const [cropBox, setCropBox] = useState({ x: 30, y: 40, width: 260, height: 350 });

  const cropBoxRef = useRef({ x: 30, y: 40, width: 260, height: 350 });
  const containerSizeRef = useRef({ width: 320, height: 450 });
  const layoutInitializedRef = useRef(false);

  // Sync ref with state always
  useEffect(() => {
    cropBoxRef.current = cropBox;
  }, [cropBox]);

  const onContainerLayout = (e) => {
    const { width, height } = e.nativeEvent.layout || {};
    if (Number.isFinite(width) && Number.isFinite(height) && width > 100 && height > 100) {
      containerSizeRef.current = { width, height };
      setContainerSize({ width, height });

      if (!layoutInitializedRef.current) {
        layoutInitializedRef.current = true;
        const marginH = Math.round(width * 0.08);
        const marginV = Math.round(height * 0.08);
        const initialBox = {
          x: marginH,
          y: marginV,
          width: width - marginH * 2,
          height: height - marginV * 2,
        };
        cropBoxRef.current = initialBox;
        setCropBox(initialBox);
      }
    }
  };

  const startCoordsRef = useRef({ x: 30, y: 40, width: 260, height: 350 });

  const createPanResponder = (handleType) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        // Always take snapshot from current latest cropBoxRef
        startCoordsRef.current = {
          startX: cropBoxRef.current.x,
          startY: cropBoxRef.current.y,
          startWidth: cropBoxRef.current.width,
          startHeight: cropBoxRef.current.height,
        };
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const { startX, startY, startWidth, startHeight } = startCoordsRef.current;
        const contW = containerSizeRef.current.width;
        const contH = containerSizeRef.current.height;
        const minSize = 60;

        let nextX = startX;
        let nextY = startY;
        let nextW = startWidth;
        let nextH = startHeight;

        if (handleType === 'topLeft') {
          const clampedX = Math.min(Math.max(0, startX + dx), startX + startWidth - minSize);
          const clampedY = Math.min(Math.max(0, startY + dy), startY + startHeight - minSize);
          nextX = clampedX;
          nextY = clampedY;
          nextW = startWidth - (clampedX - startX);
          nextH = startHeight - (clampedY - startY);
        } else if (handleType === 'topRight') {
          const clampedY = Math.min(Math.max(0, startY + dy), startY + startHeight - minSize);
          nextY = clampedY;
          nextW = Math.min(Math.max(minSize, startWidth + dx), contW - startX);
          nextH = startHeight - (clampedY - startY);
        } else if (handleType === 'bottomLeft') {
          const clampedX = Math.min(Math.max(0, startX + dx), startX + startWidth - minSize);
          nextX = clampedX;
          nextW = startWidth - (clampedX - startX);
          nextH = Math.min(Math.max(minSize, startHeight + dy), contH - startY);
        } else if (handleType === 'bottomRight') {
          nextW = Math.min(Math.max(minSize, startWidth + dx), contW - startX);
          nextH = Math.min(Math.max(minSize, startHeight + dy), contH - startY);
        } else if (handleType === 'move') {
          nextX = Math.min(Math.max(0, startX + dx), Math.max(0, contW - startWidth));
          nextY = Math.min(Math.max(0, startY + dy), Math.max(0, contH - startHeight));
        }

        const safeBox = {
          x: Math.round(nextX),
          y: Math.round(nextY),
          width: Math.round(nextW),
          height: Math.round(nextH),
        };
        cropBoxRef.current = safeBox;
        setCropBox(safeBox);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    });

  const panTopLeft = useRef(createPanResponder('topLeft')).current;
  const panTopRight = useRef(createPanResponder('topRight')).current;
  const panBottomLeft = useRef(createPanResponder('bottomLeft')).current;
  const panBottomRight = useRef(createPanResponder('bottomRight')).current;
  const panMove = useRef(createPanResponder('move')).current;

  useEffect(() => {
    let isActive = true;
    const targetPath = file?.path || file?.uri;

    if (targetPath) {
      setLoading(true);
      decodeTiffToBase64Uri(targetPath, 0)
        .then((result) => {
          if (isActive && result && result.uri) {
            setImageUri(result.uri);
          } else if (isActive && file?.uri) {
            setImageUri(file.uri);
          }
        })
        .catch((err) => {
          console.warn('Error decoding preview image:', err);
          if (isActive && file?.uri) {
            setImageUri(file.uri);
          }
        })
        .finally(() => {
          if (isActive) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => {
      isActive = false;
    };
  }, [file]);

  const handleEdit = () => {
    setIsEditMode(true);
    setActiveEditTool('crop');
  };

  const handleRotatePress = () => {
    setActiveEditTool('rotate');
    setRotationDegree((prev) => (prev + 90) % 360);
  };

  const handleCropPress = () => {
    setActiveEditTool('crop');
  };

  const handleDoneOrClose = async () => {
    if (isEditMode) {
      const targetPath = file?.path || file?.uri;
      if (targetPath) {
        setLoading(true);
        try {
          const result = await cropAndRotateImage({
            filePath: targetPath,
            cropRect: cropBoxRef.current,
            containerSize: containerSizeRef.current,
            rotationDegree: rotationDegree,
          });

          if (result && result.previewUri) {
            setImageUri(result.previewUri);
          }
          setIsEditMode(false);
          setRotationDegree(0);
          
          if (route.params?.fromScreen === 'PickFilesScreen') {
            navigation.navigate('PickFilesScreen', { editedFile: result });
          } else {
            Alert.alert('Saved', `Edited image saved successfully as ${result.name}`);
          }
        } catch (err) {
          console.warn('Error saving cropped image:', err);
          setIsEditMode(false);
        } finally {
          setLoading(false);
        }
      } else {
        setIsEditMode(false);
      }
    } else {
      navigation.goBack();
    }
  };

  const handleDeletePress = () => {
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteModalVisible(false);
    try {
      if (file?.path) {
        await RNFS.unlink(file.path);
      }
      navigation.goBack();
    } catch (err) {
      console.warn('Delete error:', err);
      navigation.goBack();
    }
  };

  const handleInfoPress = () => {
    setInfoModalVisible(true);
  };

  const handleShare = async () => {
    try {
      let shareUrl = null;
      let mimeType = 'image/png';

      if (file?.path && (await RNFS.exists(file.path))) {
        // Ensure path starts with file://
        shareUrl = file.path.startsWith('file://') ? file.path : `file://${file.path}`;
        const ext = (file?.name?.split('.').pop() || 'tif').toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else mimeType = 'image/*';
      } else if (imageUri) {
        // If it's a data base64 uri or remote/local uri
        if (imageUri.startsWith('data:image')) {
          // Write to temporary cache file so Android apps can easily receive it
          const tempPath = `${RNFS.CachesDirectoryPath}/shared_preview_${Date.now()}.png`;
          const base64Data = imageUri.split(',')[1];
          await RNFS.writeFile(tempPath, base64Data, 'base64');
          shareUrl = `file://${tempPath}`;
          mimeType = 'image/png';
        } else {
          shareUrl = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;
          mimeType = 'image/png';
        }
      }

      if (!shareUrl) {
        Alert.alert('Error', 'Image preview is still loading, please wait.');
        return;
      }

      await Share.open({
        url: shareUrl,
        type: mimeType,
        title: file?.name || 'Share Image',
        filename: file?.name || 'image',
        failOnCancel: false,
      });
    } catch (error) {
      if (error && error.message && !error.message.includes('User did not share') && !error.message.includes('dismissed') && !error.message.includes('Canceled')) {
        console.warn('Share error:', error);
        Alert.alert('Share', 'Could not open share dialog.');
      }
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Photo</Text>
        <TouchableOpacity style={styles.checkBtn} onPress={handleDoneOrClose} activeOpacity={0.7}>
          <Text style={styles.checkIcon}>✓</Text>
        </TouchableOpacity>
      </View>

      {/* Main Center Image View */}
      <View style={styles.imageWrapper}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading image preview...</Text>
          </View>
        ) : imageUri ? (
          <View style={styles.imageInnerWrapper} onLayout={onContainerLayout}>
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.mainImage,
                { transform: [{ rotate: `${rotationDegree}deg` }] },
              ]}
              resizeMode="contain"
            />
            {/* Interactive Draggable & Resizable Blue Crop Box in Edit Mode */}
            {isEditMode && activeEditTool === 'crop' && (
              <View
                style={[
                  styles.cropOverlayBox,
                  {
                    left: cropBox.x,
                    top: cropBox.y,
                    width: cropBox.width,
                    height: cropBox.height,
                  },
                ]}
              >
                {/* Center Drag Zone */}
                <View style={styles.cropCenterDragArea} {...panMove.panHandlers} />

                {/* Refined Slim Corner Brackets */}
                <View style={[styles.bracketCorner, styles.topLeft]} {...panTopLeft.panHandlers} />
                <View style={[styles.bracketCorner, styles.topRight]} {...panTopRight.panHandlers} />
                <View style={[styles.bracketCorner, styles.bottomLeft]} {...panBottomLeft.panHandlers} />
                <View style={[styles.bracketCorner, styles.bottomRight]} {...panBottomRight.panHandlers} />

                {/* Subtle Mid-Edge Markers */}
                <View style={[styles.bracketEdge, styles.edgeTop]} />
                <View style={[styles.bracketEdge, styles.edgeBottom]} />
                <View style={[styles.bracketEdge, styles.edgeLeft]} />
                <View style={[styles.bracketEdge, styles.edgeRight]} />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Unable to load image preview</Text>
          </View>
        )}
      </View>

      {/* Bottom Action Bar */}
      {isEditMode ? (
        /* Edit Mode Bottom Bar: Crop & Rotate */
        <View style={styles.editBottomBar}>
          <TouchableOpacity
            style={styles.editTabItem}
            activeOpacity={0.7}
            onPress={handleCropPress}
          >
            <View style={styles.editIconWrapper}>
              <CropIcon
                width={26}
                height={26}
                fill={activeEditTool === 'crop' ? '#3B9FFB' : '#64748B'}
              />
            </View>
            <Text
              style={[
                styles.editTabText,
                activeEditTool === 'crop' && styles.activeEditTabText,
              ]}
            >
              Crop
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editTabItem}
            activeOpacity={0.7}
            onPress={handleRotatePress}
          >
            <View style={styles.editIconWrapper}>
              <CropRotateIcon
                width={26}
                height={26}
                fill={activeEditTool === 'rotate' ? '#3B9FFB' : '#1C1B1F'}
              />
            </View>
            <Text
              style={[
                styles.editTabText,
                activeEditTool === 'rotate' && styles.activeEditTabText,
              ]}
            >
              Rotate
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Normal Mode Bottom Bar: Edit, Delete, Info, Share */
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.bottomTabItem} activeOpacity={0.7} onPress={handleEdit}>
            <View style={styles.iconSvgWrapper}>
              <EditDocumentIcon width={22} height={22} />
            </View>
            <Text style={styles.bottomTabText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomTabItem} activeOpacity={0.7} onPress={handleDeletePress}>
            <View style={styles.iconSvgWrapper}>
              <PreviewDeleteIcon width={22} height={22} />
            </View>
            <Text style={styles.bottomTabText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomTabItem} activeOpacity={0.7} onPress={handleInfoPress}>
            <View style={styles.iconSvgWrapper}>
              <PreviewInfoIcon width={22} height={22} />
            </View>
            <Text style={styles.bottomTabText}>Info</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomTabItem} activeOpacity={0.7} onPress={handleShare}>
            <View style={styles.iconSvgWrapper}>
              <PreviewShareIcon width={22} height={22} />
            </View>
            <Text style={styles.bottomTabText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info Details Modal */}
      <Modal
        visible={infoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setInfoModalVisible(false)}
          />

          <View style={styles.infoModalCard}>
            <View style={styles.infoModalHeader}>
              <View style={styles.infoIconCircle}>
                <PreviewInfoIcon width={22} height={22} />
              </View>
              <Text style={styles.infoModalTitle}>File Information</Text>
            </View>

            <View style={styles.infoDetailsBox}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>File Name:</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{file?.name || 'Unknown'}</Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Format:</Text>
                <View style={styles.infoFormatBadge}>
                  <Text style={styles.infoFormatText}>{(file?.name?.split('.').pop() || 'TIFF').toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>File Size:</Text>
                <Text style={styles.infoValue}>{formatFileSize(file?.size)}</Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Location:</Text>
                <Text style={styles.infoPathValue}>{file?.path || file?.uri || 'Storage'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.infoOkBtn}
              onPress={() => setInfoModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.infoOkBtnText}>Done</Text>
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
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setDeleteModalVisible(false)}
          />

          <View style={styles.deleteModalCard}>
            <View style={styles.deleteIconCircle}>
              <PreviewDeleteIcon width={24} height={24} />
            </View>

            <Text style={styles.deleteModalTitle}>Delete File?</Text>
            <Text style={styles.deleteModalDesc}>
              Are you sure you want to delete <Text style={styles.deleteFileNameHighlight}>{file?.name}</Text>? This action cannot be undone.
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#111827',
  },
  checkBtn: {
    padding: 6,
  },
  checkIcon: {
    fontSize: 20,
    color: '#111827',
    fontWeight: 'bold',
  },
  imageWrapper: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
  },
  imageInnerWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cropOverlayBox: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(59, 159, 251, 0.4)',
  },
  cropCenterDragArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  bracketCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#3B9FFB',
    zIndex: 10,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  bracketEdge: {
    position: 'absolute',
    backgroundColor: '#3B9FFB',
  },
  edgeTop: {
    top: -1,
    left: '35%',
    width: '30%',
    height: 2.5,
  },
  edgeBottom: {
    bottom: -1,
    left: '35%',
    width: '30%',
    height: 2.5,
  },
  edgeLeft: {
    left: -1,
    top: '38%',
    width: 2.5,
    height: '24%',
  },
  edgeRight: {
    right: -1,
    top: '38%',
    width: 2.5,
    height: '24%',
  },

  // Edit Mode Bottom Bar Styles (Crop / Rotate)
  editBottomBar: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 32,
    gap: 48,
  },
  editTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  editIconWrapper: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  editTabText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#64748B',
  },
  activeEditTabText: {
    color: '#3B9FFB',
    fontFamily: 'Poppins-Bold',
  },

  bottomBar: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  bottomTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  iconSvgWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  bottomTabText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    color: '#64748B',
  },

  // Modal Common Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBackdropTap: {
    ...StyleSheet.absoluteFillObject,
  },

  // Info Modal Styles
  infoModalCard: {
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
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoModalTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  infoDetailsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoLabel: {
    width: 80,
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#6B7280',
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#1F2937',
  },
  infoFormatBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  infoFormatText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  infoPathValue: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    lineHeight: 16,
  },
  infoOkBtn: {
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
  infoOkBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },

  // Delete Confirmation Modal Styles
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
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
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
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
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
    fontFamily: 'Poppins-SemiBold',
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
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
});

export default PreviewScreen;
