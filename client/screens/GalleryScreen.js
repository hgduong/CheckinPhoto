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
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

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
  // Removed comment-related states


  useFocusEffect(
    React.useCallback(() => {
      loadImages();
    }, [])
  );

  const loadImages = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Check LOCAL_POSTS storage
      const rawLocal = await AsyncStorage.getItem('LOCAL_POSTS');
      const local = rawLocal ? JSON.parse(rawLocal) : [];
      console.log('📸 Gallery: LOCAL_POSTS has', local.length, 'photos');

      // Check APPWRITE_POSTS storage
      const rawAppwrite = await AsyncStorage.getItem('APPWRITE_POSTS');
      const appwrite = rawAppwrite ? JSON.parse(rawAppwrite) : [];
      console.log('📸 Gallery: APPWRITE_POSTS has', appwrite.length, 'photos');

      // Log details of LOCAL_POSTS
      if (local.length > 0) {
        console.log('📸 Gallery: LOCAL_POSTS sample:', local.slice(0, 3).map(p => ({ id: p.id, uri: p.uri ? p.uri.substring(0, 50) + '...' : 'undefined' })));
      }

      // Log details of APPWRITE_POSTS
      if (appwrite.length > 0) {
        console.log('📸 Gallery: APPWRITE_POSTS sample:', appwrite.slice(0, 3).map(p => ({ id: p.id, uri: p.uri ? p.uri.substring(0, 50) + '...' : 'undefined' })));
      }

      // Combine photos from both storages
      const allPhotos = [...local, ...appwrite];
      console.log('📸 Gallery: Total photos from both storages:', allPhotos.length);

      // For Appwrite photos, use localUri if uri is undefined
      const processedPhotos = allPhotos.map(photo => {
        if (photo && !photo.uri && photo.localUri) {
          console.log('📸 Gallery: Using localUri for Appwrite photo:', photo.id);
          return { ...photo, uri: photo.localUri };
        }
        return photo;
      }).filter(photo => photo && photo.uri);

      console.log('📸 Gallery: Total valid photos after processing:', processedPhotos.length);
      console.log('📸 Gallery: Filtered out', allPhotos.length - processedPhotos.length, 'invalid photos');

      // Use processed photos
      const photosToDisplay = processedPhotos;

      if (Array.isArray(allPhotos) && allPhotos.length > 0) {
        // Sort by createdAt descending (newest first)
        allPhotos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // derive regions from processed photos
        const regionGroups = photosToDisplay.reduce((groups, image) => {
          const region = image.address?.district || image.address?.city || image.address?.region || 'Local';
          if (!groups[region]) groups[region] = [];
          groups[region].push(image);
          return groups;
        }, {});
        setRegions(Object.keys(regionGroups));
        setImages(photosToDisplay);
      } else {
        // no posts — show empty state
        console.log('📸 Gallery: No photos found in any storage');
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
    // Always use the current aiDescription from the image object
    setEditedSuggestions(image.aiDescription || '');
    setModalVisible(true);
  };




  const handleUpload = async () => {
    try {
      // Get current user info from Firebase Auth
      const { auth } = await import('../firebaseConfig');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để upload');
        return;
      }

      // Create post data (don't include id, let Firebase generate it)
      const postData = {
        author: {
          id: currentUser.uid, // Use actual Firebase UID
          name: 'Tên của bạn', // TODO: Get from user profile
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg' // TODO: Get from user profile
        },
        title: selectedImage.aiDescription || 'Ảnh của tôi',
        description: selectedImage.aiDescription || '',
        image: selectedImage.uri,
        likes: 0,
        comments: 0,
        shares: 0,
        maps: 1,
        createdAt: new Date(), // Use Date object for Firebase timestamp
        likedBy: [],
        location: selectedImage.address
      };

      // Save to Firebase
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebaseConfig');

      // Use serverTimestamp for consistent timing
      const firebasePostData = {
        ...postData,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'posts'), firebasePostData);
      console.log('📸 Gallery: Post uploaded with Firebase ID:', docRef.id);

      // Update the post data with the correct Firebase ID for immediate display
      const updatedPostData = { ...postData, id: docRef.id };
      console.log('📸 Gallery: Updated post data:', updatedPostData);

      Alert.alert('Thành công', 'Ảnh đã được đăng lên trang chủ!', [
        { text: 'OK', onPress: () => setModalVisible(false) }
      ]);

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Lỗi', 'Không thể upload ảnh');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Xóa ảnh',
      'Bạn có chắc muốn xóa ảnh này không? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              // Check which storage the image belongs to
              const isLocalPost = selectedImage.id.startsWith('local_');
              const storageKey = isLocalPost ? 'LOCAL_POSTS' : 'APPWRITE_POSTS';

              console.log('📸 Gallery: Deleting from', storageKey, 'image ID:', selectedImage.id);

              // Remove from the appropriate AsyncStorage
              const rawPosts = await AsyncStorage.getItem(storageKey);
              if (rawPosts) {
                let posts = JSON.parse(rawPosts);
                posts = posts.filter(post => post.id !== selectedImage.id);
                await AsyncStorage.setItem(storageKey, JSON.stringify(posts));

                // Reload images to reflect changes
                await loadImages();

                // Close modal
                setModalVisible(false);
                setSelectedImage(null);

                Alert.alert('Đã xóa', 'Ảnh đã được xóa thành công.');
              }
            } catch (error) {
              console.error('Error deleting image:', error);
              Alert.alert('Lỗi', 'Không thể xóa ảnh. Vui lòng thử lại.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderImageItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleImageSelect(item)} style={styles.imageItem}>
      <Image
        source={{ uri: item.uri }}
        style={styles.gridImage}
      />
    </TouchableOpacity>
  );

  const renderRegionSection = ({ item: region }) => {
    const regionImages = images.filter(img => img.address?.district === region || img.address?.city === region || img.address?.region === region || (!img.address && region === 'Local'));
    console.log(`📸 Gallery: Region "${region}" has ${regionImages.length} photos`);

    return (
      <View style={styles.regionSection}>
        <Text style={styles.regionTitle}>{region} ({regionImages.length})</Text>
        <FlatList
          data={regionImages}
          renderItem={renderImageItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
        />
      </View>
    );
  };

  // Removed comment-related functions



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
                <View>
                  <Text style={styles.suggestions}>{selectedImage?.aiDescription || editedSuggestions}</Text>
                  {selectedImage?.likes !== undefined && (
                    <View style={styles.likesContainer}>
                      <MaterialIcons name="favorite" size={16} color="#2196F3" />
                      <Text style={styles.likesText}>{selectedImage.likes} lượt thích</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  if (editMode) {
                    // Save changes
                    const updatedImage = { ...selectedImage, aiDescription: editedSuggestions };
                    // Update in AsyncStorage
                    const storageKey = selectedImage.id.startsWith('local_') ? 'LOCAL_POSTS' : 'APPWRITE_POSTS';
                    AsyncStorage.getItem(storageKey).then(raw => {
                      if (raw) {
                        let posts = JSON.parse(raw);
                        posts = posts.map(p => p.id === selectedImage.id ? updatedImage : p);
                        AsyncStorage.setItem(storageKey, JSON.stringify(posts)).then(() => {
                          // Update the images array in state to reflect changes immediately
                          setImages(prevImages =>
                            prevImages.map(img => img.id === selectedImage.id ? updatedImage : img)
                          );
                          // Update selected image
                          setSelectedImage(updatedImage);
                          console.log('📸 Gallery: Caption updated for image:', selectedImage.id);
                        });
                      }
                    });
                  }
                  setEditMode(!editMode);
                }}
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
                onPress={handleUpload}
              >
                <MaterialIcons name="cloud-upload" size={24} color="white" />
                <Text style={styles.buttonText}>Upload</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <MaterialIcons name="delete" size={24} color="white" />
                <Text style={styles.buttonText}>Delete</Text>
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
  horizontalList: {
    paddingHorizontal: 10,
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
  gridImage: {
    width: (width - 40) / 3 - 10, // 3 columns with padding
    height: (width - 40) / 3 - 10,
    margin: 5,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  imageItem: {
    flex: 1/3,
    alignItems: 'center',
  },
  gridContainer: {
    paddingHorizontal: 10,
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
    resizeMode: 'contain',
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
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  likesText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 4,
    fontWeight: '600',
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
  deleteButton: {
    backgroundColor: '#dc3545',
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
