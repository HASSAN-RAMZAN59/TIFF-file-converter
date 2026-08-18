import React from 'react';
import { View, Text, Button } from 'react-native';

const OnboardingScreen3 = ({ navigation }) => {
  return (
    <View>
      <Text>Onboarding 3</Text>
      <Button
        title="Get Started"
        onPress={() => navigation.replace('MainApp')}
      />
    </View>
  );
};

export default OnboardingScreen3;
