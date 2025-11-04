import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Share,
  Alert,
  Button,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useForegroundPermissions } from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { usePermissions as useMediaLibraryPermissions } from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import CONFIG from '../config';
import { analyzeImage, formatErrorMessage } from '../utils/api';

export default function CameraScreen() {
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = useForegroundPermissions();
  const [mediaPermission, requestMediaPermission] = useMediaLibraryPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState('back'); // 'back' hoặc 'front'
  const [previewVisible, setPreviewVisible] = useState(false);
  const [capturedUri, setCapturedUri] = useState(null);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [addressInfo, setAddressInfo] = useState(null);
  const cameraRef = useRef(null);
  const navigation = useNavigation();

  const analyzeImageAndLocation = async (imageUri, location) => {
    setAnalyzing(true);
    try {
      // Get detailed address using Google Maps API
      let addressData = null;
      if (location?.coords) {
        const { latitude, longitude } = location.coords;
        try {
          const geoController = new AbortController();
          const geoTimeoutId = setTimeout(() => geoController.abort(), 10000);

          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyAsC1F-paj-AZzDUqgPnoaRrDiHCDdf1KA`,
            {
              signal: geoController.signal,
              headers: {
                'Accept': 'application/json',
              }
            }
          );

          clearTimeout(geoTimeoutId);
          const data = await response.json();
          if (data.results && data.results[0]) {
            const result = data.results[0];
            const components = result.address_components || [];

            // Extract detailed address components
            const streetNumber = components.find(c => c.types.includes('street_number'))?.long_name;
            const route = components.find(c => c.types.includes('route'))?.long_name;
            const sublocality = components.find(c => c.types.includes('sublocality'))?.long_name;
            const locality = components.find(c => c.types.includes('locality'))?.long_name;
            const administrativeAreaLevel2 = components.find(c => c.types.includes('administrative_area_level_2'))?.long_name;
            const administrativeAreaLevel1 = components.find(c => c.types.includes('administrative_area_level_1'))?.long_name;
            const country = components.find(c => c.types.includes('country'))?.long_name;

            addressData = {
              formatted: result.formatted_address,
              street: streetNumber && route ? `${streetNumber} ${route}` : route || '',
              ward: sublocality || '',
              district: locality || administrativeAreaLevel2 || '',
              city: administrativeAreaLevel1 || '',
              country: country || '',
              coordinates: [longitude, latitude]
            };
          }
        } catch (geoError) {
          console.warn('Lỗi định vị địa chỉ:', geoError);
          if (geoError.name === 'AbortError') {
            console.warn('Định vị địa chỉ bị timeout');
          } else if (geoError.message.includes('Network request failed')) {
            console.warn('Lỗi kết nối mạng khi định vị địa chỉ');
          }
          // Fallback to basic location info
          addressData = {
            formatted: `Vĩ độ: ${latitude.toFixed(4)}, Kinh độ: ${longitude.toFixed(4)}`,
            street: '',
            ward: '',
            district: '',
            city: '',
            country: '',
            coordinates: [longitude, latitude]
          };
        }
      }

      // Analyze image with AI using the centralized API function
      let aiResult = null;
      try {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const imageData = `data:image/jpeg;base64,${base64}`;

        aiResult = await analyzeImage(imageData, location?.coords?.latitude, location?.coords?.longitude);
      } catch (aiError) {
        console.warn('Phân tích AI thất bại:', aiError);
        const errorMessage = formatErrorMessage(aiError);
        console.warn('Lỗi được format:', errorMessage);
        aiResult = { ai: { aiDescription: errorMessage } };
      }

      // Set results
      setAddressInfo(addressData);
      setAiDescription(aiResult?.ai?.aiDescription || 'Không thể phân tích ảnh');

    } catch (error) {
      console.error('Lỗi phân tích:', error);
      const errorMessage = formatErrorMessage(error);
      setAiDescription(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady) return;

    if (!locationPermission?.granted) {
      const { status } = await requestLocationPermission();
      if (status !== 'granted') {
        console.log('Quyền truy cập vị trí bị từ chối. Tiếp tục mà không có vị trí.');
      }
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      let loc = null;
      if (locationPermission?.granted) {
        try {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch (e) {
          console.warn('Không thể lấy vị trí:', e.message || e);
          // Không có location cũng OK, tiếp tục
        }
      }
      setCapturedUri(photo.uri);
      setCapturedLocation(loc);
      setPreviewVisible(true);

      // Start background analysis
      setTimeout(() => {
        analyzeImageAndLocation(photo.uri, loc).catch(error => {
          console.warn('Phân tích nền thất bại:', error);
        });
      }, 500);
    } catch (error) {
      console.error('Lỗi chụp ảnh:', error);
    }
  };

  const handleSaveToGallery = async () => {
    if (!capturedUri) return;

    if (!mediaPermission?.granted) {
      const { status } = await requestMediaPermission();
      if (status !== 'granted') {
        Alert.alert('Cần cấp quyền', 'Cần quyền truy cập thư viện để lưu ảnh.');
        return;
      }
    }

    setIsSaving(true);
    try {
      let lat = capturedLocation?.coords?.latitude;
      let lng = capturedLocation?.coords?.longitude;

      let address = null;
      try {
        if (lat && lng) {
          const geos = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (geos && geos.length > 0) address = geos[0];
        }
      } catch (e) {
        console.warn('Định vị địa chỉ thất bại:', e);
      }

      Alert.alert(
        'Lưu ảnh',
        `📍 ${addressInfo ? `${addressInfo.ward ? addressInfo.ward + ', ' : ''}${addressInfo.district}, ${addressInfo.city}` : 'Không có địa chỉ'}\n\n📝 ${aiDescription}\n\nLưu ảnh vào bộ sưu tập?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Lưu',
            onPress: async () => {
              try {
                await saveToAppStorage(capturedUri, {
                  address: addressInfo,
                  location: lat && lng ? { type: 'Point', coordinates: [lng, lat] } : null,
                  aiDescription: aiDescription,
                });
                Alert.alert('Đã lưu', 'Ảnh đã được lưu vào bộ sưu tập', [
                  {
                    text: 'OK',
                    onPress: () => {
                      setPreviewVisible(false);
                      setCapturedUri(null);
                      setCapturedLocation(null);
                      setAiDescription('');
                      setAddressInfo(null);
                      setAnalyzing(false);
                      // Navigate về Camera tab (reset stack)
                      navigation.navigate('Camera', { screen: 'CameraMain' });
                    },
                  },
                ]);
              } catch (e) {
                console.warn('Không thể lưu vào bộ nhớ ứng dụng:', e);
                Alert.alert('Lỗi', 'Không thể lưu ảnh');
              }
            },
          },
          {
            text: 'Edit',
            onPress: () => {
              setPreviewVisible(false);
              navigation.navigate('CreateCaptionScreen', {
                image: capturedUri,
                location: lat && lng ? { type: 'Point', coordinates: [lng, lat] } : null,
                aiSuggestion: aiDescription,
                addressInfo: addressInfo,
              });
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Lỗi khi phân tích và lưu:', error);
      Alert.alert('Lỗi', 'Không thể phân tích hoặc lưu ảnh');
    } finally {
      setIsSaving(false);
    }
  };

  const APP_PHOTO_DIR = FileSystem.documentDirectory + 'photos/';

  const ensureDirExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(APP_PHOTO_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(APP_PHOTO_DIR, { intermediates: true });
    }
  };

  const saveToAppStorage = async (uri, meta = {}) => {
    await ensureDirExists();
    const ts = Date.now();
    const filename = `photo_${ts}.jpg`;
    const dest = APP_PHOTO_DIR + filename;
    await FileSystem.copyAsync({ from: uri, to: dest });

    const post = {
      id: `local_${ts}`,
      uri: dest,
      createdAt: ts,
      address: meta.address || null,
      location: meta.location || null,
      aiDescription: meta.aiDescription || null,
    };

    const raw = await AsyncStorage.getItem('LOCAL_POSTS');
    let arr = raw ? JSON.parse(raw) : [];
    arr.unshift(post);
    await AsyncStorage.setItem('LOCAL_POSTS', JSON.stringify(arr));

    console.log('📸 Camera: Đã lưu ảnh vào bộ nhớ. Tổng số ảnh:', arr.length);
  };

  const handleShare = async () => {
    if (!capturedUri) return;
    try {
      await Share.share({ url: capturedUri, message: 'Xem ảnh này đi!' });
    } catch (error) {
      console.error('Lỗi chia sẻ ảnh:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ ảnh');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (hasPermission.granted === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={{ textAlign: 'center', marginBottom: 16 }}>
          Chúng tôi cần quyền truy cập camera để chụp ảnh.
        </Text>
        <Button onPress={requestPermission} title="Cấp quyền" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
        onCameraReady={() => setCameraReady(true)}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
          <Text style={styles.text}> Flip </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.captureButton, !cameraReady && { opacity: 0.5 }]}
          onPress={takePicture}
          disabled={!cameraReady}
        />
      </View>

      {previewVisible && (
        <Modal animationType="slide" transparent={false} visible={previewVisible}>
          <View style={styles.container}>
            <Image source={{ uri: capturedUri }} style={styles.previewImage} />

            {/* Analysis Results */}
            <View style={styles.analysisContainer}>
              {analyzing ? (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator size="small" color="#2196F3" />
                  <Text style={styles.analyzingText}>Đang phân tích ảnh...</Text>
                </View>
              ) : (
                <>
                  {addressInfo && (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>📍 Địa chỉ:</Text>
                      <Text style={styles.infoText}>
                        {addressInfo.ward && `${addressInfo.ward}, `}
                        {addressInfo.district}, {addressInfo.city}
                      </Text>
                    </View>
                  )}

                  {aiDescription && (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>🤖 AI phân tích:</Text>
                      <Text style={styles.infoText}>
                        {aiDescription.includes('Không thể') || aiDescription.includes('timeout') || aiDescription.includes('kết nối') ?
                          `${aiDescription}\n\n💡 Mẹo: Kiểm tra kết nối mạng và thử lại` :
                          aiDescription
                        }
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.previewButtons}>
              <Button title="Chụp lại" onPress={() => setPreviewVisible(false)} />
              <Button
                title={analyzing ? "Đang phân tích..." : "Lưu & Sử dụng"}
                onPress={handleSaveToGallery}
                disabled={isSaving || analyzing}
              />
              <Button title="Chia sẻ" onPress={handleShare} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 40,
    paddingBottom: 60,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    borderWidth: 5,
    borderColor: '#ccc',
  },
  text: {
    fontSize: 18,
    color: 'white',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  analysisContainer: {
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  analyzingText: {
    marginLeft: 10,
    color: '#fff',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'black',
  },
});