import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  Platform,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import FamilyStarIcon from '../assets/family_star.svg';
import FileSaveIcon from '../assets/file_save.svg';
import GlobeAsiaIcon from '../assets/globe_asia.svg';
import InfoIcon from '../assets/info.svg';
import SecurityIcon from '../assets/security.svg';
import SettingDeleteIcon from '../assets/setting delete.svg';
import SettingShareIcon from '../assets/setting share.svg';
import SwitchActiveSvg from '../assets/Switch.svg';
import { getAutoResumeEnabled, setAutoResumeEnabled } from '../services/settingsService';
import { useTranslation } from 'react-i18next';

// Custom toggle component using the Switch SVG
const CustomSwitch = ({ value, onValueChange }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onValueChange && onValueChange(!value)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {value ? (
        <SwitchActiveSvg width={36} height={20} />
      ) : (
        <Svg width={36} height={20} viewBox="0 0 33 19" fill="none">
          <Path
            d="M32.8048 9.11243C32.8048 4.07978 28.725 0 23.6923 0H9.11243C4.07978 0 0 4.07978 0 9.11243C0 14.1451 4.07977 18.2249 9.11243 18.2249H23.6923C28.725 18.2249 32.8048 14.1451 32.8048 9.11243Z"
            fill="#D1D5DB"
          />
          <Rect
            width="14.5799"
            height="14.5799"
            rx="7.28995"
            transform="matrix(-1 0 0 1 16.5 1.82422)"
            fill="white"
          />
        </Svg>
      )}
    </TouchableOpacity>
  );
};

// Custom reusable SVG Chevron Right
const ChevronRightIcon = ({ size = 18, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18L15 12L9 6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Icon Placeholder Box Component
const IconPlaceholder = ({ label = 'Icon' }) => (
  <View style={styles.iconPlaceholderBox}>
    <Text style={styles.iconPlaceholderText}>{label}</Text>
  </View>
);

const SettingItem = ({
  iconLabel,
  icon: IconComponent,
  title,
  showChevron = true,
  rightElement,
  onPress,
  isLast = false,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={rightElement ? 1 : 0.6}
      style={[styles.itemContainer, isLast && styles.noBorder]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={styles.leftContent}>
        {IconComponent ? (
          <View style={styles.iconBox}>
            <IconComponent width={22} height={22} />
          </View>
        ) : (
          <IconPlaceholder label={iconLabel} />
        )}
        <Text style={styles.itemTitle}>{title}</Text>
      </View>
      <View style={styles.rightContent}>
        {rightElement ? (
          rightElement
        ) : showChevron ? (
          <ChevronRightIcon size={20} color="#6B7280" />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const SettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [autoResume, setAutoResume] = useState(true);

  useEffect(() => {
    getAutoResumeEnabled().then((val) => {
      setAutoResume(val);
    });
  }, []);

  const toggleAutoResume = async () => {
    const nextVal = !autoResume;
    setAutoResume(nextVal);
    await setAutoResumeEnabled(nextVal);
  };

  const handleRecycleBinPress = () => {
    navigation.navigate('RecycleBinScreen');
  };

  const handleLanguagePress = () => {
    navigation.navigate('LanguageScreen');
  };

  const handlePrivacyPolicyPress = () => {
    Alert.alert(t('Privacy Policy'), t('Read our terms and policies'));
  };

  const handleShareWithFriendsPress = async () => {
    try {
      await Share.share({
        message: 'Check out this awesome TIFF File Converter App!',
      });
    } catch (error) {
      console.warn('Error sharing app:', error);
    }
  };

  const handleRateUsPress = () => {
    Alert.alert(t('Rate Us'), t('Review our app on the Play Store'));
  };

  const handleAboutPress = () => {
    Alert.alert(t('About') || 'About', 'TIFF File Converter & Viewer\nVersion 1.0.0');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('Settings')}</Text>
        </View>

        {/* Settings Card */}
        <View style={styles.card}>
          {/* Auto Resume */}
          <SettingItem
            icon={FileSaveIcon}
            title={t("Auto Resume Process")}
            showChevron={false}
            rightElement={
              <CustomSwitch
                value={autoResume}
                onValueChange={toggleAutoResume}
              />
            }
          />

          {/* Recycle Bin */}
          <SettingItem
            icon={SettingDeleteIcon}
            title={t("Recycle Bin")}
            onPress={handleRecycleBinPress}
          />

          {/* Language */}
          <SettingItem
            icon={GlobeAsiaIcon}
            title={t("Language")}
            onPress={handleLanguagePress}
          />

          {/* Privacy Policy */}
          <SettingItem
            icon={SecurityIcon}
            title={t("Privacy Policy")}
            onPress={handlePrivacyPolicyPress}
          />

          {/* Share with Friends */}
          <SettingItem
            icon={SettingShareIcon}
            title={t("Share with Friends") || "Share with Friends"}
            onPress={handleShareWithFriendsPress}
          />

          {/* Rate Us */}
          <SettingItem
            icon={FamilyStarIcon}
            title={t("Rate Us")}
            onPress={handleRateUsPress}
          />

          {/* About */}
          <SettingItem
            icon={InfoIcon}
            title={t("About") || "About"}
            isLast={true}
            onPress={handleAboutPress}
          />
        </View>

        {/* Temporary Quick Test Onboarding Button */}
        <TouchableOpacity
          style={styles.testOnboardingBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={styles.testOnboardingText}>▶ Test Onboarding Screens</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
    lineHeight: 26,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconPlaceholderBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#D8E5FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconPlaceholderText: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    color: '#2563EB',
    textAlign: 'center',
  },
  itemTitle: {
    fontSize: 14,
    color: '#1E1E1E',
    fontFamily: 'Poppins-Regular',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  testOnboardingBtn: {
    marginTop: 24,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EEF4FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D8E5FE',
  },
  testOnboardingText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#2563EB',
  },
});
