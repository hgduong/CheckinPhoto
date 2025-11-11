// client/screens/CameraScreen.js
import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  Button,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useForegroundPermissions } from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

// Appwrite
import { ID } from "react-native-appwrite";
import { AppwriteClientFactory } from "../appwrite.config";
const storage = AppwriteClientFactory.getInstance().storage;

// === KEY HARD-CODE ===
const APPWRITE_BUCKET_ID = "690a2f03001de6dba700";

const getAddressFromLocation = async (location) => {
  try {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    return {
      district: place.district || place.subregion,
      city: place.city || place.region,
      country: place.country,
      full: [place.district || place.subregion, place.city || place.region, place.country]
        .filter(Boolean)
        .join(', ') || 'Không xác định'
    };
  } catch (e) {
    return { district: null, city: null, country: null, full: 'Không lấy được địa chỉ' };
  }
};

export default function CameraScreen() {
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = useForegroundPermissions();

  const [facing, setFacing] = useState("back");
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [capturedUri, setCapturedUri] = useState(null);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [uploading, setUploading] = useState(false);

  const navigation = useNavigation();

  const fetchLocationAndAddress = async () => {
    if (!locationPermission?.granted) return;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCapturedLocation(loc);
      const addr = await getAddressFromLocation(loc);
      setAddress(addr);
    } catch (e) {
      console.warn("Lỗi vị trí:", e);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    if (!locationPermission?.granted) {
      const { status } = await requestLocationPermission();
      if (status !== "granted") {
        Alert.alert("Cần vị trí", "Cho phép truy cập vị trí để gắn địa chỉ.");
        return;
      }
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setCapturedUri(photo.uri);
      setPreviewVisible(true);
      setAddress(null);
      fetchLocationAndAddress();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Cần quyền", "Cần quyền truy cập thư viện ảnh");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]) {
      setCapturedUri(result.assets[0].uri);
      setPreviewVisible(true);
      setAddress(null);
      if (locationPermission?.granted) fetchLocationAndAddress();
    }
  };

  const uploadToAppwrite = async () => {
    if (!capturedUri) return;
    setUploading(true);

    try {
      const file = Platform.OS === "web"
        ? { uri: capturedUri, name: "photo.jpg", type: "image/jpeg" }
        : await prepareNativeFile(capturedUri);

      const fileResponse = await storage.createFile(APPWRITE_BUCKET_ID, ID.unique(), file);
      const fileUrl = storage.getFileView(APPWRITE_BUCKET_ID, fileResponse.$id).href;

      const post = {
        id: fileResponse.$id,
        uri: fileUrl,
        localUri: capturedUri,
        createdAt: Date.now(),
        location: capturedLocation ? {
          type: "Point",
          coordinates: [capturedLocation.coords.longitude, capturedLocation.coords.latitude],
        } : null,
        address: address ? {
          district: address.district,
          city: address.city,
          country: address.country,
          full: address.full,
        } : null,
      };

      const raw = await AsyncStorage.getItem("APPWRITE_POSTS");
      let arr = raw ? JSON.parse(raw) : [];
      arr.unshift(post);
      await AsyncStorage.setItem("APPWRITE_POSTS", JSON.stringify(arr));

      Alert.alert("Thành công!", "Ảnh + vị trí đã được lưu", [
        { text: "OK", onPress: closePreview },
      ]);
    } catch (error) {
      Alert.alert("Lỗi", `Upload thất bại: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const prepareNativeFile = async (uri, filename = `photo_${Date.now()}.jpg`) => {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return { name: filename, size: fileInfo.size, type: "image/jpeg", uri };
  };

  const closePreview = () => {
    setPreviewVisible(false);
    setCapturedUri(null);
    setCapturedLocation(null);
    setAddress(null);
  };

  if (hasPermission === null) return <ActivityIndicator style={styles.container} />;
  if (!hasPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={{ textAlign: "center", marginBottom: 16 }}>Cần quyền truy cập camera</Text>
        <Button onPress={requestPermission} title="Cấp quyền" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} onCameraReady={() => setCameraReady(true)} />

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
          <Text style={styles.text}>Tải ảnh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.captureButton, !cameraReady && { opacity: 0.5 }]}
          onPress={takePicture}
          disabled={!cameraReady}
        />
        <TouchableOpacity style={styles.button} onPress={() => setFacing(f => f === "back" ? "front" : "back")}>
          <Text style={styles.text}>Flip</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent={false} visible={previewVisible}>
        <View style={styles.container}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />
          {address ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Vị trí:</Text>
              <Text style={styles.infoText}>{address.full}</Text>
            </View>
          ) : capturedLocation ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Đang lấy địa chỉ...</Text>
            </View>
          ) : null}
          <View style={styles.previewButtons}>
            <Button title="Hủy" onPress={closePreview} />
            <Button title={uploading ? "Đang lưu..." : "Lưu ảnh"} onPress={uploadToAppwrite} disabled={uploading} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  permissionContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  camera: { flex: 1 },
  buttonContainer: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 40, paddingBottom: 60 },
  button: { backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  galleryButton: { backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#fff", borderWidth: 5, borderColor: "#ccc" },
  text: { fontSize: 16, color: "white" },
  previewImage: { flex: 1, resizeMode: "contain" },
  infoBox: { backgroundColor: "rgba(255,255,255,0.1)", padding: 10, borderRadius: 8, marginHorizontal: 20, marginTop: 20 },
  infoLabel: { fontSize: 12, fontWeight: "bold", color: "#2196F3", marginBottom: 4 },
  infoText: { fontSize: 14, color: "#fff", lineHeight: 18 },
  previewButtons: { flexDirection: "row", justifyContent: "space-around", padding: 20, backgroundColor: "black" },
});