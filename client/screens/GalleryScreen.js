import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Share,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GalleryScreen({ navigation }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [editedSuggestions, setEditedSuggestions] = useState('');
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadImages();
    }, [])
  );

  const loadImages = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const rawLocal = await AsyncStorage.getItem('LOCAL_POSTS');
      const local = rawLocal ? JSON.parse(rawLocal) : [];
      console.log('📸 Gallery: Loaded', local.length, 'photos from storage');

      if (Array.isArray(local) && local.length > 0) {
        // derive regions from local posts
        const regionGroups = local.reduce((groups, image) => {
          const region = image.address?.city || image.address?.region || image.region || 'Local';
          if (!groups[region]) groups[region] = [];
          groups[region].push(image);
          return groups;
        }, {});
        setRegions(Object.keys(regionGroups));
        setImages(local);
      } else {
        // no local posts — show empty state
        console.log('📸 Gallery: No photos found');
        setRegions([]);
        setImages([]);
      }
    } catch (error) {
      console.warn('Error loading images:', error);
      setFetchError(error.message || String(error));
      setImages([]);
      setRegions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    loadImages();
  }, []);



  const handleImageSelect = async (image) => {
    setSelectedImage(image);
    // Use stored aiDescription if present; otherwise allow user to edit
    const suggestionsArr = [];
    if (image.aiDescription) suggestionsArr.push(image.aiDescription);
    setAiSuggestions(suggestionsArr);
    setEditedSuggestions(suggestionsArr.join('\n'));
    setModalVisible(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        url: selectedImage.uri,
        message: 'Check out this photo!',
      });
    } catch (error) {
      console.error('Error sharing image:', error);
    }
  };

  const handleUpload = async () => {
    Alert.alert('Upload disabled', 'This build saves photos locally. Enable backend upload in a different build.');
  };

  const renderImageItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleImageSelect(item)}>
      <Image
        source={{ uri: item.uri }}
        style={styles.thumbnail}
      />
    </TouchableOpacity>
  );

  const renderRegionSection = ({ item: region }) => (
    <View style={styles.regionSection}>
      <Text style={styles.regionTitle}>{region}</Text>
      <FlatList
        data={images.filter(img => img.region === region)}
        renderItem={renderImageItem}
        horizontal
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 10 }}>Loading images...</Text>
        </View>
      ) : fetchError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>Could not load images: {fetchError}</Text>
          <Text style={{ textAlign: 'center', marginBottom: 12 }}>If you're testing on a physical device, make sure `client/config.js` points to your computer's IP (not localhost) and that the backend is running.</Text>
          <TouchableOpacity onPress={loadImages} style={{ backgroundColor: '#2196F3', padding: 10, borderRadius: 8 }}>
            <Text style={{ color: 'white' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        (regions && regions.length > 0) ? (
          <FlatList
            data={regions}
            renderItem={renderRegionSection}
            keyExtractor={item => item}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 16, marginBottom: 12 }}>No images yet.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Camera')} style={{ backgroundColor: '#2196F3', padding: 10, borderRadius: 8 }}>
              <Text style={{ color: 'white' }}>Open Camera</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Image
              source={{ uri: selectedImage?.uri }}
              style={styles.selectedImage}
            />

            <ScrollView style={styles.suggestionsContainer}>
              {editMode ? (
                <TextInput
                  style={styles.suggestionsInput}
                  multiline
                  value={editedSuggestions}
                  onChangeText={setEditedSuggestions}
                  placeholder="Edit AI suggestions..."
                />
              ) : (
                <Text style={styles.suggestions}>{editedSuggestions}</Text>
              )}
            </ScrollView>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setEditMode(!editMode)}
              >
                <MaterialIcons
                  name={editMode ? "check" : "edit"}
                  size={24}
                  color="white"
                />
                <Text style={styles.buttonText}>
                  {editMode ? "Save" : "Edit"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShare}
              >
                <MaterialIcons name="share" size={24} color="white" />
                <Text style={styles.buttonText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleUpload}
              >
                <MaterialIcons name="cloud-upload" size={24} color="white" />
                <Text style={styles.buttonText}>Upload</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  regionSection: {
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  regionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  thumbnail: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    maxHeight: '80%',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  suggestionsContainer: {
    width: '100%',
    maxHeight: 150,
    marginBottom: 20,
  },
  suggestions: {
    fontSize: 16,
    lineHeight: 24,
  },
  suggestionsInput: {
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    marginLeft: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 5,
  },
});
