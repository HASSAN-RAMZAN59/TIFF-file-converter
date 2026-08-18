import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Permission');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View>
      <Text>Splash</Text>
    </View>
  );
};

export default SplashScreen;
