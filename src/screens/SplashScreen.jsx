import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { hasCompletedOnboarding } from '../services/onboardingService';
import { checkOsStoragePermission } from '../services/permissionService';
import SplashIcon from '../assets/Group 4.svg';

const { width } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(async () => {
      const onboardingDone = await hasCompletedOnboarding();
      const permissionGranted = await checkOsStoragePermission();

      if (onboardingDone) {
        if (permissionGranted) {
          navigation.replace('MainApp');
        } else {
          navigation.replace('Permission');
        }
      } else {
        if (permissionGranted) {
          navigation.replace('Onboarding');
        } else {
          navigation.replace('Permission');
        }
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1A6CFA" />
      <View style={styles.container}>
        {/* Main Center Content */}
        <View style={styles.centerContent}>
          {/* Splash Document Illustration Icon */}
          <View style={styles.iconWrapper}>
            <SplashIcon width={170} height={205} />
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.title}>TIFF File Viewer</Text>
          <Text style={styles.subtitle}>
            You can convert all your TIFF file easily
          </Text>

          {/* Clean White Loading Spinner Indicator */}
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A6CFA',
  },
  container: {
    flex: 1,
    backgroundColor: '#1A6CFA',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconWrapper: {
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
    marginBottom: 36,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});

export default SplashScreen;

