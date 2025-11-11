// client/screens/GalleryScreen.js
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import CreateCaptionScreen from './CreateCaptionScreen';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 40) / 3 - 10;

export default function GalleryScreen({ navigation }) {
  const [images, setImages] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Tải ảnh khi vào màn hình
  useFocusEffect(
    useCallback(() => {
      loadImages();
    }, [])
  );

  const loadImages = async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem('APPWRITE_POSTS');
      const posts = raw ? JSON.parse(raw) : [];

      const processed = posts
        .map(photo => ({
          ...photo,
          uri: photo.uri || photo.localUri,
        }))
        .filter(p => p.uri)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      if (processed.length > 0) {
        const groups = processed.reduce((acc, img) => {
          const region = img.address?.district || img.address?.city || 'Local';
          if (!acc[region]) acc[region] = [];
          acc[region].push(img);
          return acc;
        }, {});

        setRegions(Object.keys(groups));
        setImages(processed);
      } else {
        setRegions([]);
        setImages([]);
      }
    } catch (error) {
      console.error('Lỗi tải ảnh:', error);
      Alert.alert('Lỗi', 'Không thể tải thư viện ảnh');
      setImages([]);
      setRegions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePress = (item) => {
    setSelectedImage(item);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedImage(null), 300);
  };

  const handlePostSuccess = () => {
    handleCloseModal();
    loadImages(); // Cập nhật lại thư viện
  };

  const renderImageItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleImagePress(item)}
      style={styles.imageItem}
      activeOpacity={0.75}
    >
      <Image source={{ uri: item.uri }} style={styles.gridImage} />
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRegionSection = ({ item: region }) => {
    const regionImages = images.filter(img =>
      img.address?.district === region ||
      img.address?.city === region ||
      (!img.address && region === 'Local')
    );

    return (
      <View style={styles.regionSection}>
        <Text style={styles.regionTitle}>
          {region} ({regionImages.length})
        </Text>
        <FlatList
          data={regionImages}
          renderItem={renderImageItem}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Đang tải ảnh...</Text>
          </View>
        ) : regions.length > 0 ? (
          <FlatList
            data={regions}
            renderItem={renderRegionSection}
            keyExtractor={item => item}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadImages} colors={['#2196F3']} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Chưa có ảnh nào</Text>
            <Text style={styles.emptySubtitle}>
              Hãy chụp ảnh để lưu vào thư viện
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Camera')}
              style={styles.cameraButton}
            >
              <Text style={styles.cameraButtonText}>Mở Camera</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MODAL: TẠO CAPTION VỚI AI */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseModal}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            {selectedImage && (
              <CreateCaptionScreen
                route={{ params: selectedImage }}
                navigation={{
                  goBack: handleCloseModal,
                  navigate: () => {},
                  setParams: () => {},
                }}
                onPostSuccess={handlePostSuccess}
              />
            )}
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  regionSection: {
    marginVertical: 12,
  },
  regionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  gridContainer: {
    paddingHorizontal: 12,
  },
  imageItem: {
    flex: 1 / 3,
    margin: 5,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gridImage: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    borderRadius: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: 6,
  },
  overlayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  cameraButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 3,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});