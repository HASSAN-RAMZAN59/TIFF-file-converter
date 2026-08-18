import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

const PickFilesScreen = ({ route, navigation }) => {
  const file = route.params?.file || null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Single File Viewer & Converter</Text>
      </View>
      <View style={styles.content}>
        {file ? (
          <View style={styles.infoBox}>
            <Text style={styles.label}>Selected File Details:</Text>
            <Text>Name: {file.name || file.fileName || 'N/A'}</Text>
            <Text>URI: {file.uri}</Text>
            <Text>Size: {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'N/A'}</Text>
            <Text>Type: {file.type || 'N/A'}</Text>
          </View>
        ) : (
          <Text>No file passed in route parameters.</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    fontSize: 16,
    marginRight: 16,
    color: '#000000',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  infoBox: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    gap: 8,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

export default PickFilesScreen;
