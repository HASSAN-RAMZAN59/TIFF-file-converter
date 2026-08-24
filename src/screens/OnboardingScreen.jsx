import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
} from 'react-native';

import { setOnboardingCompleted } from '../services/onboardingService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'Scan & View TIFF Files',
  },
  {
    id: '2',
    title: 'Convert to PDF & JPG',
  },
  {
    id: '3',
    title: 'Fast & Offline Access',
  },
];

/**
 * Single Swipable OnboardingScreen
 * Minimalist Black & White Theme with Paging & Indicator Dots
 */
const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < ONBOARDING_DATA.length) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await setOnboardingCompleted();
    navigation.replace('MainApp');
  };

  const renderItem = ({ item }) => (
    <View style={styles.slide}>
      <Text style={styles.title}>{item.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        
        {/* Top Skip Button */}
        <View style={styles.topBar}>
          {currentIndex < ONBOARDING_DATA.length - 1 ? (
            <TouchableOpacity onPress={handleFinish} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.topSpacer} />
          )}
        </View>

        {/* Swipable FlatList */}
        <FlatList
          ref={flatListRef}
          data={ONBOARDING_DATA}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          style={styles.flatList}
        />

        {/* Footer: Pagination Dots & Action Button */}
        <View style={styles.footer}>
          {/* Dots */}
          <View style={styles.paginationContainer}>
            {ONBOARDING_DATA.map((_, index) => (
              <View
                key={index.toString()}
                style={[
                  styles.dot,
                  currentIndex === index ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingVertical: 20,
  },
  topBar: {
    height: 40,
    paddingHorizontal: 28,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipText: {
    color: '#888888',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
  },
  topSpacer: {
    height: 20,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 38,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 24,
    gap: 28,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#333333',
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
});

export default OnboardingScreen;
