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
  const cameraRef = useRef(null);
  const navigation = useNavigation();

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady) return;

    if (!locationPermission?.granted) {
      const { status } = await requestLocationPermission();
      if (status !== 'granted') {
        console.log('Location permission denied. Proceeding without location.');
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
          console.warn('Could not get location:', e.message || e);
          // Không có location cũng OK, tiếp tục
        }
      }
      setCapturedUri(photo.uri);
      setCapturedLocation(loc);
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error taking picture:', error);
    }
  };

  const handleSaveToGallery = async () => {
    if (!capturedUri) return;

    if (!mediaPermission?.granted) {
      const { status } = await requestMediaPermission();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Media library permission is required to save photos.');
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
        console.warn('Reverse geocode failed:', e);
      }

      Alert.alert(
        'Save photo',
        `${address?.city || address?.region || 'No address available'}\n\nSave photo to app storage?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: async () => {
              try {
                await saveToAppStorage(capturedUri, {
                  address,
                  location: lat && lng ? { type: 'Point', coordinates: [lng, lat] } : null,
                });
                Alert.alert('Saved', 'Photo saved to app storage', [
                  {
                    text: 'OK',
                    onPress: () => {
                      setPreviewVisible(false);
                      setCapturedUri(null);
                      setCapturedLocation(null);
                      // Navigate về Camera tab (reset stack)
                      navigation.navigate('Camera', { screen: 'CameraMain' });
                    },
                  },
                ]);
              } catch (e) {
                console.warn('Could not save to app storage:', e);
                Alert.alert('Error', 'Could not save photo');
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
              });
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error in analyze & save:', error);
      Alert.alert('Error', 'Could not analyze or save photo');
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
    };

    const raw = await AsyncStorage.getItem('LOCAL_POSTS');
    let arr = raw ? JSON.parse(raw) : [];
    arr.unshift(post);
    await AsyncStorage.setItem('LOCAL_POSTS', JSON.stringify(arr));

    console.log('📸 Camera: Saved photo to storage. Total photos:', arr.length);
  };

  const handleShare = async () => {
    if (!capturedUri) return;
    try {
      await Share.share({ url: capturedUri, message: 'Check out this photo' });
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Could not share photo');
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
          We need your permission to show the camera.
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
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
            <View style={styles.previewButtons}>
              <Button title="Retake" onPress={() => setPreviewVisible(false)} />
              <Button title="Save & Use" onPress={handleSaveToGallery} disabled={isSaving} />
              <Button title="Share" onPress={handleShare} />
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
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'black',
  },
});