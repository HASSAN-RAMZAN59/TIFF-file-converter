import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AllFilesScreen from '../screens/tabs/AllFilesScreen';
import PickFilesScreen from '../screens/tabs/PickFilesScreen';
import ConvertedScreen from '../screens/tabs/ConvertedScreen';
import FavoritesScreen from '../screens/tabs/FavoritesScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="AllFiles"
      screenOptions={{
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="AllFiles"
        component={AllFilesScreen}
        options={{ title: 'All Files' }}
      />
      <Tab.Screen
        name="PickFiles"
        component={PickFilesScreen}
        options={{ title: 'Pick Files' }}
      />
      <Tab.Screen
        name="Converted"
        component={ConvertedScreen}
        options={{ title: 'Converted' }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Favorites' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
