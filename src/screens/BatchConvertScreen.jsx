import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';

const BatchConvertScreen = ({ route, navigation }) => {
  const files = route.params?.files || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Batch Conversion Screen</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.countText}>Total Files Selected: {files.length}</Text>
        {files.length > 0 ? (
          <FlatList
            data={files}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.fileCard}>
                <Text style={styles.fileName}>{index + 1}. {item.name || item.fileName || 'File'}</Text>
                <Text style={styles.fileSub}>URI: {item.uri}</Text>
              </View>
            )}
          />
        ) : (
          <Text>No files selected for batch conversion.</Text>
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
  },
  countText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  fileCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 6,
    marginBottom: 8,
  },
  fileName: {
    fontWeight: 'bold',
  },
  fileSub: {
    fontSize: 12,
    color: '#666666',
  },
});

export default BatchConvertScreen;
