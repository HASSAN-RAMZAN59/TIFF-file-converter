import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import SearchIcon from '../assets/search.svg';
import { getAppLanguage, setAppLanguage } from '../services/settingsService';

// Flag SVGs
import FlagFrance from '../assets/flags/FR - France.svg';
import FlagArabic from '../assets/flags/SA - Saudi Arabia.svg';
import FlagItalian from '../assets/flags/IT - Italy.svg';
import FlagKalaallisut from '../assets/flags/GL - Greenland.svg';
import FlagZulu from '../assets/flags/ZA - South Africa.svg';
import FlagEnglish from '../assets/flags/FK - Falkland Islands.svg';
import FlagHindi from '../assets/flags/IN - India.svg';
import FlagDutch from '../assets/flags/NO - Norway.svg';
import FlagGerman from '../assets/flags/DE - Germany.svg';

const LANGUAGES_DATA = [
  { id: 'en', name: 'English', FlagComponent: FlagEnglish },
  { id: 'hi', name: 'Hindi', FlagComponent: FlagHindi },
  { id: 'fr', name: 'French', FlagComponent: FlagFrance },
  { id: 'ar', name: 'Arabic', FlagComponent: FlagArabic },
  { id: 'it', name: 'Italian', FlagComponent: FlagItalian },
  { id: 'kl', name: 'Kalaallisut', FlagComponent: FlagKalaallisut },
  { id: 'zu', name: 'zulu', FlagComponent: FlagZulu },
  { id: 'nl', name: 'Dutch', FlagComponent: FlagDutch },
  { id: 'de', name: 'German', FlagComponent: FlagGerman },
];

const RadioButton = ({ selected }) => {
  return (
    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
  );
};

const LanguageScreen = ({ navigation }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('fr');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  useEffect(() => {
    const loadSelectedLanguage = async () => {
      const currentLang = await getAppLanguage();
      if (currentLang) {
        setSelectedLanguage(currentLang);
      }
    };
    loadSelectedLanguage();
  }, []);

  const handleSelect = (langId) => {
    setSelectedLanguage(langId);
  };

  const handleApply = async () => {
    await setAppLanguage(selectedLanguage);
    navigation.goBack();
  };

  const filteredLanguages = searchQuery.trim()
    ? LANGUAGES_DATA.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : LANGUAGES_DATA;

  const renderLanguageItem = ({ item }) => {
    const isSelected = selectedLanguage === item.id;
    const Flag = item.FlagComponent;

    return (
      <TouchableOpacity
        style={styles.langRow}
        activeOpacity={0.7}
        onPress={() => handleSelect(item.id)}
      >
        <View style={styles.langLeft}>
          <View style={styles.flagWrapper}>
            <Flag width={36} height={36} />
          </View>
          <Text style={styles.langName}>{item.name}</Text>
        </View>

        <RadioButton selected={isSelected} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Language</Text>
      </View>

      {/* Language List - Fixed / Non-Scrollable */}
      <View style={styles.listContent}>
        {LANGUAGES_DATA.map((item) => renderLanguageItem({ item }))}
      </View>

      {/* Bottom Apply Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.applyBtn}
          activeOpacity={0.85}
          onPress={handleApply}
        >
          <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 1 1" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="langApplyBtnGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#1A6CFA" />
                <Stop offset="100%" stopColor="#3FA5FC" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="1" height="1" fill="url(#langApplyBtnGrad)" />
          </Svg>
          <Text style={styles.applyBtnText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LanguageScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#1E1E1E',
  },
  searchIconBtn: {
    padding: 6,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#1E1E1E',
    paddingVertical: 4,
  },
  searchCloseBtn: {
    padding: 4,
  },
  searchCloseText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Poppins-Medium',
  },
  listContent: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  langName: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: '#1E1E1E',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
    borderColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  radioOuterSelected: {
    borderColor: '#2563EB',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
    paddingTop: 12,
  },
  applyBtn: {
    borderRadius: 25,
    height: 50,
    backgroundColor: '#1A6CFA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#1A6CFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },
});
