import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';

import { setOnboardingCompleted } from '../services/onboardingService';
import HeroIllustration from '../assets/Hero Illustration Area.svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'Convert TIFF Files Easily',
    subtitle: 'Turn your TIFF images into JPG,\nPNG, PDF or WEBP in just a few\ntaps.',
  },
  {
    id: '2',
    title: 'Batch Convert in Seconds',
    subtitle: 'Convert multiple TIFF images simultaneously with lightning speed.',
  },
  {
    id: '3',
    title: 'Fast & Offline Viewing',
    subtitle: 'View, edit, crop, rotate and organize your files anytime without internet.',
  },
];

const SlideItem = React.memo(({ item, illustrationWidth, illustrationHeight }) => (
  <View style={styles.slide}>
    {/* Hero Illustration Area */}
    <View style={styles.illustrationWrapper}>
      <HeroIllustration width={illustrationWidth} height={illustrationHeight} />
    </View>

    {/* Text Content */}
    <View style={styles.textContainer}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  </View>
));

/**
 * OnboardingScreen Component
 * Matches Figma specs with W: 350, Padding: 0 32, Hero Illustration, Skip pill, and active dots.
 */
const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * SCREEN_WIDTH,
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

  const illustrationWidth = Math.min(SCREEN_WIDTH - 60, 310);
  const illustrationHeight = illustrationWidth * (548 / 412);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />
      <View style={styles.container}>

        {/* Top Header: Skip Pill Button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.skipPill}
            onPress={handleFinish}
            activeOpacity={0.8}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Swipable ScrollView for 100% Flat Native Swipe without virtualization glitches */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            onMomentumScrollEnd={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / SCREEN_WIDTH);
              if (index >= 0 && index < ONBOARDING_DATA.length) {
                setCurrentIndex(index);
              }
            }}
          >
            {ONBOARDING_DATA.map((item) => (
              <SlideItem 
                key={item.id}
                item={item} 
                illustrationWidth={illustrationWidth} 
                illustrationHeight={illustrationHeight} 
              />
            ))}
          </ScrollView>
        </View>

        {/* Action Button & Indicator Dots with equal spacing */}
        <View style={styles.footer}>
          {/* Main Action Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>

          {/* Pagination Indicator Dots */}
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
        </View>

      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    justifyContent: 'space-between',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 10,
  },
  skipPill: {
    backgroundColor: '#2780FB',
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#2780FB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    marginTop: -5, // Pull it even closer to the top bar
  },
  flatList: {
    flexGrow: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
  },
  illustrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -15, // Further push up inside the slide
    marginBottom: -15, // Pull text up closer
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: -15, // Pull text even closer to the illustration
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 0, // Removed padding
    paddingBottom: 36, // Keep breathing room below indicators
    alignItems: 'center',
    marginTop: -15, // Pull entire footer up closer to text
  },
  button: {
    width: '100%',
    backgroundColor: '#2780FB',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2780FB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 28,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  activeDot: {
    width: 28,
    backgroundColor: '#2780FB',
  },
  inactiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#93C5FD',
  },
});
