import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, StatusBar } from 'react-native';

const PreviewScreen = ({ route, navigation }) => {
  const { file } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Text style={styles.headerIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{file?.name || 'Preview'}</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <View style={styles.downloadPlaceholder}>
            <Text style={{fontSize: 12}}>↓</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Image Area */}
      <View style={styles.imageContainer}>
        {file?.uri ? (
          <Image 
            source={{ uri: file.uri }} 
            style={styles.previewImage} 
            resizeMode="contain" 
          />
        ) : (
          <Text style={{color: '#fff'}}>No Image Source</Text>
        )}
      </View>

      {/* Bottom Toolbar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.toolItem}>
          <View style={styles.toolPlaceholder}><Text style={styles.toolPlaceholderText}>Img</Text></View>
          <Text style={styles.toolText}>Image</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.toolItem}>
          <View style={styles.toolPlaceholder}><Text style={styles.toolPlaceholderText}>Txt</Text></View>
          <Text style={styles.toolText}>Text Style</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.toolItem}>
          <View style={styles.toolPlaceholder}><Text style={styles.toolPlaceholderText}>Frm</Text></View>
          <Text style={styles.toolText}>Frame</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.toolItem}>
          <View style={styles.toolPlaceholder}><Text style={styles.toolPlaceholderText}>Stk</Text></View>
          <Text style={styles.toolText}>Stickers</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.toolItem}>
          <View style={styles.toolPlaceholder}><Text style={styles.toolPlaceholderText}>Shr</Text></View>
          <Text style={styles.toolText}>Share</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7f1d1d', // Dark red as in mockup
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff', // White header in mockup
  },
  headerIcon: {
    fontSize: 22,
    color: '#374151',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  iconBtn: {
    padding: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  downloadPlaceholder: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FCD34D', // gold border from mockup
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingBottom: 24,
  },
  toolItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  toolPlaceholderText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  toolText: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: '600',
  },
});

export default PreviewScreen;
