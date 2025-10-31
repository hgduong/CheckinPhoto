import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Modal, ActivityIndicator, Share, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(null);
  const [hasMediaPermission, setHasMediaPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [type, setType] = useState(null); // will set after camera module is ready
  const [location, setLocation] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [capturedUri, setCapturedUri] = useState(null);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    (async () => {
      // Request camera permissions
      // guard: Camera module may be undefined on some platforms (web)
      if (typeof Camera === 'undefined') {
        console.error('expo-camera module is not available on this platform');
        setHasPermission(false);
        return;
      }

      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus === 'granted');

      // Request location permissions (best-effort)
      try {
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        setHasLocationPermission(locationStatus === 'granted');
      } catch (e) {
        setHasLocationPermission(false);
      }
      // Request media library permission for saving images
      try {
        const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
        setHasMediaPermission(mediaStatus === 'granted');
      } catch (e) {
        setHasMediaPermission(false);
      }

      // overall hasPermission for rendering camera view depends only on camera permission
      setHasPermission(cameraStatus === 'granted');

      // set default type now that Camera exists
      try {
        const defaultType = Camera?.Constants?.Type?.back;
        if (defaultType) setType(defaultType);
        else setType('back');
      } catch (e) {
        setType('back');
      }
    })();
  }, [retryTick]);

  const isCameraModuleAvailable = () => {
    // expo-camera should expose requestCameraPermissionsAsync; use that to detect availability
    return Camera && typeof Camera.requestCameraPermissionsAsync === 'function';
  };

  const takePicture = async () => {
    if (!cameraRef.current) {
      console.warn('Camera ref not available yet');
      return;
    }
    if (!cameraReady) {
      console.warn('Camera not ready');
      return;
    }
    if (typeof Camera === 'undefined') {
      Alert.alert('Camera unavailable', 'Camera module is not available on this platform.');
      return;
    }
    if (cameraRef.current) {
      try {
        // Take photo
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

        // Get current location (best effort)
        let loc = null;
        try {
          loc = await Location.getCurrentPositionAsync({});
        } catch (e) {
          console.warn('Could not get location:', e);
        }

        setCapturedUri(photo.uri);
        setCapturedLocation(loc);
        setPreviewVisible(true);
      } catch (error) {
        console.error('Error taking picture:', error);
      }
    }
  };

  const handleSaveToGallery = async () => {
    if (!capturedUri) return;
    setIsSaving(true);
    try {
      // Ensure we have location; prompt user if not
      let lat = capturedLocation?.coords?.latitude;
      let lng = capturedLocation?.coords?.longitude;
      if (!lat || !lng) {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        } catch (e) {
          console.warn('Location not available:', e);
        }
      }

      // Try to reverse-geocode locally to get address (best-effort)
      let address = null;
      try {
        if (lat && lng) {
          const geos = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (geos && geos.length > 0) address = geos[0];
        }
      } catch (e) {
        console.warn('Reverse geocode failed:', e);
      }

      const aiText = null; // no AI in local-only build

      Alert.alert(
        'Save photo',
        `${address?.city || address?.region || 'No address available'}\n\nSave photo to app storage?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: async () => {
              try {
                await ensureDirExists();
                await saveToAppStorage(capturedUri, { aiDescription: aiText, address: address, location: (lat && lng) ? { type: 'Point', coordinates: [lng, lat] } : null });
                Alert.alert('Saved', 'Photo saved to app storage');
                setPreviewVisible(false);
              } catch (e) {
                console.warn('Could not save to app storage:', e);
                Alert.alert('Error', 'Could not save photo');
              }
            }
          },
          {
            text: 'Edit',
            onPress: () => {
              setPreviewVisible(false);
              navigation.navigate('CreateCaption', {
                image: capturedUri,
                location: (lat && lng) ? { type: 'Point', coordinates: [lng, lat] } : null,
                aiSuggestion: aiText
              });
            }
          }
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

  // Helpers for app-local storage
  const APP_PHOTO_DIR = FileSystem.documentDirectory + 'photos/';

  const ensureDirExists = async () => {
    try {
      const info = await FileSystem.getInfoAsync(APP_PHOTO_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(APP_PHOTO_DIR, { intermediates: true });
      }
    } catch (e) {
      console.warn('Could not create photo dir:', e);
    }
  };

  const saveToAppStorage = async (uri, meta = {}) => {
    // copy file into app documentDirectory/photos and save metadata in AsyncStorage
    try {
      const ts = Date.now();
      const filename = `photo_${ts}.jpg`;
      const dest = APP_PHOTO_DIR + filename;
      await FileSystem.copyAsync({ from: uri, to: dest });

      const post = {
        id: `local_${ts}`,
        uri: dest,
        createdAt: ts,
        aiDescription: meta.aiDescription || null,
        address: meta.address || null,
        location: meta.location || null
      };

      // store in AsyncStorage under key LOCAL_POSTS (array)
      const raw = await AsyncStorage.getItem('LOCAL_POSTS');
      let arr = raw ? JSON.parse(raw) : [];
      arr.unshift(post);
      await AsyncStorage.setItem('LOCAL_POSTS', JSON.stringify(arr));
      return dest;
    } catch (e) {
      console.error('saveToAppStorage error', e);
      throw e;
    }
  };

  const handleEdit = () => {
    setPreviewVisible(false);
    navigation.navigate('CreateCaption', {
      image: capturedUri,
      location: capturedLocation
        ? { type: 'Point', coordinates: [capturedLocation.coords.longitude, capturedLocation.coords.latitude] }
        : null,
    });
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

  const handleUpload = async () => {
    Alert.alert('Upload disabled', 'This build saves photos locally. Enable backend upload in a different build.');
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera or location</Text>;
  }
  // If the native Camera module isn't available (e.g., running in Expo Go without the native module),
  // render a friendly message instead of trying to render <Camera /> which would crash.
  if (!isCameraModuleAvailable()) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}> 
        <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 12 }}>Camera module is not available in this runtime.</Text>
        <Text style={{ textAlign: 'center', marginBottom: 12 }}>If you're using Expo Go on Android, create a development build or use an emulator with the native modules installed.</Text>
        <TouchableOpacity onPress={() => setRetryTick(t => t + 1)} style={{ backgroundColor: '#2196F3', padding: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={type} ref={cameraRef} onCameraReady={() => setCameraReady(true)}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const backType = Camera?.Constants?.Type?.back ?? 'back';
              const frontType = Camera?.Constants?.Type?.front ?? 'front';
              const current = type || backType;
              setType(current === backType ? frontType : backType);
            }}>
            <Text style={styles.text}> Flip </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.captureButton, !cameraReady && { backgroundColor: '#999' }]} onPress={takePicture} disabled={!cameraReady}>
            <Text style={styles.text}>{cameraReady ? 'Take Photo' : 'Preparing...'}</Text>
          </TouchableOpacity>
        </View>
      </Camera>
      <Modal visible={previewVisible} animationType="slide" transparent={true}>
        <View style={styles.previewContainer}>
          <View style={styles.previewContent}>
            {capturedUri ? (
              <Image source={{ uri: capturedUri }} style={styles.previewImage} />
            ) : (
              <ActivityIndicator size="large" />
            )}

            <View style={styles.previewButtons}>
              <TouchableOpacity style={styles.smallButton} onPress={handleSaveToGallery} disabled={isSaving}>
                <Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.smallButton} onPress={handleEdit}>
                <Text style={styles.buttonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.smallButton} onPress={handleUpload}>
                <Text style={styles.buttonText}>Upload</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.smallButton} onPress={handleShare}>
                <Text style={styles.buttonText}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.retakeButton} onPress={() => setPreviewVisible(false)}>
              <Text style={styles.buttonText}>Retake</Text>
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
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    margin: 20,
    justifyContent: 'space-between',
  },
  button: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 8,
  },
  captureButton: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
  },
  text: {
    fontSize: 18,
    color: 'white',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 400,
    borderRadius: 8,
    marginBottom: 10,
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  smallButton: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  retakeButton: {
    backgroundColor: 'gray',
    padding: 8,
    borderRadius: 8,
  },
});
