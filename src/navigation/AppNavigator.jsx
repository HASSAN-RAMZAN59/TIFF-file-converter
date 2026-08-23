import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import PermissionScreen from '../screens/PermissionScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import AllFilesScreen from '../screens/AllFilesScreen';
import PickFilesScreen from '../screens/PickFilesScreen';
import BatchConvertScreen from '../screens/BatchConvertScreen';
import ConvertedFilesScreen from '../screens/ConvertedFilesScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import PreviewScreen from '../screens/PreviewScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Permission" component={PermissionScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="MainApp" component={HomeScreen} />
      <Stack.Screen name="AllFilesScreen" component={AllFilesScreen} />
      <Stack.Screen name="PickFilesScreen" component={PickFilesScreen} />
      <Stack.Screen name="BatchConvertScreen" component={BatchConvertScreen} />
      <Stack.Screen name="ConvertedFilesScreen" component={ConvertedFilesScreen} />
      <Stack.Screen name="FavoritesScreen" component={FavoritesScreen} />
      <Stack.Screen name="PreviewScreen" component={PreviewScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
