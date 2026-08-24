import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';

const FavoritesScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>No favorite files added</Text>
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
    fontSize: 24,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
  },
});

export default FavoritesScreen;
