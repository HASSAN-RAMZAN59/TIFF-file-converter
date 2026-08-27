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
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { decodeTiffToBase64Uri, decodeTiffThumbnailFast, cropAndRotateImage } from '../services/tiffDecoderService';
import { moveToRecycleBin } from '../services/recycleBinService';
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
        } else if (handleType === 'edgeTop') {
          const clampedY = Math.min(Math.max(0, startY + dy), startY + startHeight - minSize);
          nextY = clampedY;
          nextH = startHeight - (clampedY - startY);
        } else if (handleType === 'edgeBottom') {
          nextH = Math.min(Math.max(minSize, startHeight + dy), contH - startY);
        } else if (handleType === 'edgeLeft') {
          const clampedX = Math.min(Math.max(0, startX + dx), startX + startWidth - minSize);
          nextX = clampedX;
          nextW = startWidth - (clampedX - startX);
        } else if (handleType === 'edgeRight') {
          nextW = Math.min(Math.max(minSize, startWidth + dx), contW - startX);
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
  const panEdgeTop = useRef(createPanResponder('edgeTop')).current;
  const panEdgeBottom = useRef(createPanResponder('edgeBottom')).current;
  const panEdgeLeft = useRef(createPanResponder('edgeLeft')).current;
  const panEdgeRight = useRef(createPanResponder('edgeRight')).current;
  const panMove = useRef(createPanResponder('move')).current;

  // Rotation Dial / Ruler Slider PanResponder (Full 360° rotation: left, right, up, down)
  const startRotationRef = useRef(0);
  const panSlider = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        startRotationRef.current = rotationDegree;
      },
      onPanResponderMove: (_, gestureState) => {
        // Smooth 360 degree rotation (drag sensitivity)
        const deltaAngle = Math.round(gestureState.dx / 1.5);
        let nextDeg = (startRotationRef.current + deltaAngle) % 360;
        if (nextDeg < -180) nextDeg += 360;
        if (nextDeg > 180) nextDeg -= 360;
        setRotationDegree(nextDeg);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  useEffect(() => {
    let isActive = true;
    const targetPath = file?.path || file?.uri;

    if (targetPath) {
      // Step 1: Immediately display the cached / fast-sampled preview (0ms delay)
      decodeTiffThumbnailFast(targetPath, 480)
        .then((fastResult) => {
          if (isActive && fastResult && fastResult.uri) {
            setImageUri(fastResult.uri);
            setLoading(false);
          }
        })
        .catch(() => {});

      // Step 2: Full resolution background upgrade
      decodeTiffToBase64Uri(targetPath, 0)
        .then((result) => {
          if (isActive && result && result.uri) {
            setImageUri(result.uri);
          } else if (isActive && file?.uri) {
            setImageUri(file.uri);
          }
        })
        .catch((err) => {
          console.warn('Error decoding full preview image:', err);
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
            Alert.alert('Crop Applied', 'Cropped preview updated.');
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
      if (file) {
        await moveToRecycleBin(file);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        {route.params?.fromScreen === 'PickFilesScreen' ? (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isEditMode ? 'Edit Photo' : file?.name || 'Image Preview'}
            </Text>
            {isEditMode ? (
              <TouchableOpacity style={styles.checkBtn} onPress={handleDoneOrClose} activeOpacity={0.7}>
                <Text style={styles.checkIcon}>✓</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 28 }} />
            )}
          </>
        ) : (
          <>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {file?.name || 'Image Preview'}
            </Text>
            <TouchableOpacity
              style={styles.closeCrossBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.closeCrossText}>✕</Text>
            </TouchableOpacity>
          </>
        )}
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

                {/* Responsive Mid-Edge Drag Handles */}
                <View style={[styles.bracketEdge, styles.edgeTop]} {...panEdgeTop.panHandlers}>
                  <View style={styles.edgeBarH} />
                </View>
                <View style={[styles.bracketEdge, styles.edgeBottom]} {...panEdgeBottom.panHandlers}>
                  <View style={styles.edgeBarH} />
                </View>
                <View style={[styles.bracketEdge, styles.edgeLeft]} {...panEdgeLeft.panHandlers}>
                  <View style={styles.edgeBarV} />
                </View>
                <View style={[styles.bracketEdge, styles.edgeRight]} {...panEdgeRight.panHandlers}>
                  <View style={styles.edgeBarV} />
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Unable to load image preview</Text>
          </View>
        )}
      </View>

      {/* Bottom Bar: Rendered when opened from Pick & Convert screen */}
      {route.params?.fromScreen === 'PickFilesScreen' && (
        isEditMode ? (
          <View style={styles.editBottomContainer}>
            {/* Full 360° Rotation Ruler Dial Slider */}
            {activeEditTool === 'rotate' && (
              <View style={styles.rotationDialWrapper}>
                <View style={styles.rotationRulerArea} {...panSlider.panHandlers}>
                  <View style={styles.rulerTicksContainer}>
                    {[-90, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90].map((tick) => {
                      const isCenter = tick === 0;
                      const isMajor = tick % 45 === 0;
                      return (
                        <View
                          key={tick}
                          style={[
                            styles.rulerTick,
                            isCenter && styles.rulerTickCenter,
                            isMajor && !isCenter && styles.rulerTickMajor,
                          ]}
                        />
                      );
                    })}
                  </View>
                  {/* Center Indicator Needle */}
                  <View style={styles.rulerCenterNeedle} pointerEvents="none" />
                </View>
                <View style={styles.degreeControlsRow}>
                  <TouchableOpacity
                    style={styles.quickRotateBtn}
                    onPress={() => setRotationDegree((prev) => ((prev - 90) % 360))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickRotateBtnText}>↺ -90°</Text>
                  </TouchableOpacity>

                  <Text style={styles.rotationDegreeText}>{rotationDegree}°</Text>

                  <TouchableOpacity
                    style={styles.quickRotateBtn}
                    onPress={() => setRotationDegree((prev) => ((prev + 90) % 360))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickRotateBtnText}>↻ +90°</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Edit Mode Controls: Crop & Rotate */}
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
                    fill={activeEditTool === 'crop' ? '#3B82F6' : '#1E1E1E'}
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
                    fill={activeEditTool === 'rotate' ? '#3B82F6' : '#1E1E1E'}
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
          </View>
        ) : (
          /* 4 Actions: Edit, Delete, Info, Share */
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
        )
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
                <Text style={styles.infoPathValue}>{formatDisplayPath(file?.path || file?.uri)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.infoOkBtn}
              onPress={() => setInfoModalVisible(false)}
              activeOpacity={0.8}
            >
              <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 1 1" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="infoOkBtnGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#1A6CFA" />
                    <Stop offset="100%" stopColor="#3FA5FC" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="1" height="1" fill="url(#infoOkBtnGrad)" />
              </Svg>
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
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    marginRight: 12,
  },
  closeCrossBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeCrossText: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: '#374151',
  },
  checkBtn: {
    padding: 6,
  },
  checkIcon: {
    fontSize: 20,
    color: '#1E1E1E',
    fontFamily: 'Poppins-Medium',
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  edgeTop: {
    top: -15,
    left: '25%',
    width: '50%',
    height: 30,
  },
  edgeBottom: {
    bottom: -15,
    left: '25%',
    width: '50%',
    height: 30,
  },
  edgeLeft: {
    left: -15,
    top: '25%',
    width: 30,
    height: '50%',
  },
  edgeRight: {
    right: -15,
    top: '25%',
    width: 30,
    height: '50%',
  },
  edgeBarH: {
    width: 36,
    height: 3,
    backgroundColor: '#3B9FFB',
    borderRadius: 1.5,
  },
  edgeBarV: {
    width: 3,
    height: 36,
    backgroundColor: '#3B9FFB',
    borderRadius: 1.5,
  },

  // Edit Mode Bottom Container (Dial Slider + Tabs)
  editBottomContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  rotationDialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rotationRulerArea: {
    width: '100%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  rulerTicksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
    height: '100%',
  },
  rulerTick: {
    width: 1.5,
    height: 12,
    backgroundColor: '#94A3B8',
    borderRadius: 1,
  },
  rulerTickMajor: {
    width: 2,
    height: 20,
    backgroundColor: '#64748B',
  },
  rulerTickCenter: {
    width: 2.5,
    height: 24,
    backgroundColor: '#3B82F6',
  },
  rulerCenterNeedle: {
    position: 'absolute',
    width: 3,
    height: 30,
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
  },
  rotationDegreeText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#2563EB',
  },
  degreeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
    marginTop: 2,
  },
  quickRotateBtn: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8E5FE',
  },
  quickRotateBtnText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    color: '#2563EB',
  },
  editBottomBar: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
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
    color: '#1E1E1E',
  },
  activeEditTabText: {
    color: '#3B82F6',
    fontFamily: 'Poppins-Medium',
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
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
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
    fontFamily: 'Poppins-Medium',
    color: '#6B7280',
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
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
    fontFamily: 'Poppins-Medium',
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
  infoOkBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
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

export default PreviewScreen;
