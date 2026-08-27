import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TextInput } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import './src/i18n'; // Import i18n
import { getAppLanguage } from './src/services/settingsService';
import i18next from 'i18next';

// Set Global Default Font to Poppins across entire React Native app
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.style = { fontFamily: 'Poppins-Regular', ...(Text.defaultProps.style || {}) };

if (TextInput.defaultProps == null) TextInput.defaultProps = {};
TextInput.defaultProps.style = { fontFamily: 'Poppins-Regular', ...(TextInput.defaultProps.style || {}) };

const App = () => {
  React.useEffect(() => {
    const initLang = async () => {
      const lang = await getAppLanguage();
      if (lang) {
        i18next.changeLanguage(lang);
      }
    };
    initLang();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
