import React from 'react';
import { View, Text, Button } from 'react-native';

const OnboardingScreen1 = ({ navigation }) => {
  return (
    <View>
      <Text>Onboarding 1</Text>
      <Button
        title="Next"
        onPress={() => navigation.navigate('Onboarding2')}
      />
    </View>
  );
};

export default OnboardingScreen1;
