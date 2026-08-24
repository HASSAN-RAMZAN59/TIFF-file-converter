import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { hasCompletedOnboarding } from '../services/onboardingService';
import { checkOsStoragePermission } from '../services/permissionService';

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
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        <Text style={styles.title}>TIFF Viewer & Converter</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;
