import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  AppState,
  StyleSheet,
} from 'react-native';
import { checkMyPermission, requestMyPermission } from '../utils/permissionHelper';

const MyFeatureScreen = () => {
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // AppState ref to track current application state
  const appStateRef = useRef(AppState.currentState);

  // 1. Silent / Background Check Function
  const verifyPermission = async () => {
    const granted = await checkMyPermission();
    setIsPermissionGranted(granted);
    if (granted) {
      setShowConsentModal(false); // Modal auto-close when permission is granted
    }
  };

  useEffect(() => {
    // Initial check when screen loads
    verifyPermission();

    // 2. BACKGROUND CHECK LOGIC: App state change detection
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // When app transitions from background/inactive back to active (foreground)
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Trigger silent background check
        verifyPermission();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 3. User Clicks UI Action Button
  const handleFeaturePress = async () => {
    const granted = await checkMyPermission();
    if (granted) {
      setIsPermissionGranted(true);
      // Main action proceed logic
    } else {
      // Show custom consent dialogue
      setShowConsentModal(true);
    }
  };

  // 4. User Clicks "Allow" / "Agree" inside Dialogue
  const handleModalAllowPress = async () => {
    const success = await requestMyPermission();
    if (success) {
      setIsPermissionGranted(true);
      setShowConsentModal(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* UI Feature Button */}
      <TouchableOpacity style={styles.actionBtn} onPress={handleFeaturePress}>
        <Text style={styles.btnText}>Open Feature</Text>
      </TouchableOpacity>

      {/* Permission Status */}
      <Text style={styles.statusText}>
        Status: {isPermissionGranted ? 'Granted' : 'Not Granted'}
      </Text>

      {/* CUSTOM CONSENT DIALOGUE / MODAL */}
      <Modal
        visible={showConsentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConsentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Permission Required</Text>
            <Text style={styles.dialogBody}>
              Please grant the required permission to continue using this feature.
            </Text>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowConsentModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.allowBtn}
                onPress={handleModalAllowPress}
              >
                <Text style={styles.allowBtnText}>Allow Permission</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  actionBtn: { backgroundColor: '#3B82F6', padding: 14, borderRadius: 8 },
  btnText: { color: '#FFF', fontFamily: 'Poppins-Medium' },
  statusText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogCard: { width: '85%', backgroundColor: '#FFF', padding: 20, borderRadius: 12 },
  dialogTitle: { fontSize: 18, fontFamily: 'Poppins-Medium', marginBottom: 8 },
  dialogBody: { fontSize: 14, color: '#475569', marginBottom: 20 },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: { padding: 10, marginRight: 10 },
  cancelBtnText: { color: '#64748B' },
  allowBtn: { backgroundColor: '#3B82F6', padding: 10, borderRadius: 6 },
  allowBtnText: { color: '#FFF', fontFamily: 'Poppins-Medium' },
});

export default MyFeatureScreen;
