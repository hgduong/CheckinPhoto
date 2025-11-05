import React, { useState, useRef } from "react";
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
import { analyzeImage, formatErrorMessage } from "../utils/api";

const storage = AppwriteClientFactory.getInstance().storage;

export default function CameraScreenWithGallery() {
  // === SỬA TẠI ĐÂY: Dùng MediaLibrary.useMediaLibraryPermissions() ===
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] =
    useForegroundPermissions();

  // Camera
  const [facing, setFacing] = useState("back");
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);

  // Preview
  const [previewVisible, setPreviewVisible] = useState(false);
  const [capturedUri, setCapturedUri] = useState(null);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [aiDescription, setAiDescription] = useState("");
  const [addressInfo, setAddressInfo] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const navigation = useNavigation();

  // === CHỤC NĂNG CHỤP ẢNH ===
  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady) return;

    if (!locationPermission?.granted) {
      const { status } = await requestLocationPermission();
      if (status !== "granted") {
        Alert.alert(
          "Cần vị trí",
          "Cho phép truy cập vị trí để gắn địa chỉ vào ảnh."
        );
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
          console.warn("Không lấy được vị trí:", e);
        }
      }
      openPreview(photo.uri, loc);
    } catch (error) {
      console.error("Lỗi chụp ảnh:", error);
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  };

  // === CHỤC NĂNG LẤY ẢNH TỪ THƯ VIỆN ===
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
      openPreview(result.assets[0].uri, null);
    }
  };

  // === MỞ PREVIEW ===
  const openPreview = (uri, location) => {
    setCapturedUri(uri);
    setCapturedLocation(location);
    setPreviewVisible(true);
    setAiDescription("");
    setAddressInfo(null);

    setTimeout(() => {
      analyzeImageAndLocation(uri, location).catch(console.warn);
    }, 300);
  };

  // === PHÂN TÍCH ẢNH + ĐỊA CHỈ ===
  const analyzeImageAndLocation = async (imageUri, location) => {
    setAnalyzing(true);
    try {
      let addressData = null;
      if (location?.coords) {
        const { latitude, longitude } = location.coords;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyAsC1F-paj-AZzDUqgPnoaRrDiHCDdf1KA`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          const data = await response.json();

          if (data.results?.[0]) {
            const r = data.results[0];
            const c = r.address_components || [];
            addressData = {
              formatted: r.formatted_address,
              ward:
                c.find((i) => i.types.includes("sublocality"))?.long_name || "",
              district:
                c.find((i) => i.types.includes("locality"))?.long_name ||
                c.find((i) => i.types.includes("administrative_area_level_2"))
                  ?.long_name ||
                "",
              city:
                c.find((i) => i.types.includes("administrative_area_level_1"))
                  ?.long_name || "",
              country:
                c.find((i) => i.types.includes("country"))?.long_name || "",
              coordinates: [longitude, latitude],
            };
          }
        } catch (e) {
          console.warn("Lỗi geocoding:", e);
          addressData = {
            formatted: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(
              4
            )}`,
          };
        }
      }

      // AI Analysis
      let aiResult = { ai: { aiDescription: "Không thể phân tích ảnh" } };
      try {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const imageData = `data:image/jpeg;base64,${base64}`;
        aiResult = await analyzeImage(
          imageData,
          location?.coords?.latitude,
          location?.coords?.longitude
        );
      } catch (e) {
        aiResult.ai.aiDescription = formatErrorMessage(e);
      }

      setAddressInfo(addressData);
      setAiDescription(aiResult.ai.aiDescription || "Không có mô tả");
    } catch (error) {
      setAiDescription(formatErrorMessage(error));
    } finally {
      setAnalyzing(false);
    }
  };

  // === UPLOAD LÊN APPWRITE ===
  const prepareNativeFile = async (
    uri,
    filename = `photo_${Date.now()}.jpg`
  ) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return {
        name: filename,
        size: fileInfo.size,
        type: "image/jpeg",
        uri: uri,
      };
    } catch (error) {
      console.error("Lỗi chuẩn bị file:", error);
      throw error;
    }
  };

  const uploadToAppwrite = async () => {
    if (!capturedUri) return;
    setUploading(true);

    try {
      const file =
        Platform.OS === "web"
          ? { uri: capturedUri, name: "photo.jpg", type: "image/jpeg" }
          : await prepareNativeFile(capturedUri);

      const fileResponse = await storage.createFile(
        process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
        ID.unique(),
        file
      );

      const fileUrl = storage.getFileView(
        process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
        fileResponse.$id
      ).href;

      const post = {
        id: fileResponse.$id,
        uri: fileUrl,
        localUri: capturedUri,
        createdAt: Date.now(),
        address: addressInfo,
        location: capturedLocation
          ? {
              type: "Point",
              coordinates: [
                capturedLocation.coords.longitude,
                capturedLocation.coords.latitude,
              ],
            }
          : null,
        aiDescription: aiDescription,
      };

      const raw = await AsyncStorage.getItem("APPWRITE_POSTS");
      let arr = raw ? JSON.parse(raw) : [];
      arr.unshift(post);
      await AsyncStorage.setItem("APPWRITE_POSTS", JSON.stringify(arr));

      Alert.alert("Thành công!", "Ảnh đã được upload lên Appwrite!", [
        { text: "OK", onPress: () => closePreview() },
      ]);
    } catch (error) {
      console.error("Upload thất bại:", error);
      Alert.alert("Lỗi", `Upload thất bại: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const closePreview = () => {
    setPreviewVisible(false);
    setCapturedUri(null);
    setCapturedLocation(null);
    setAiDescription("");
    setAddressInfo(null);
  };

  const handleShare = async () => {
    if (!capturedUri) return;
    try {
      await Share.share({ url: capturedUri });
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chia sẻ");
    }
  };

  // === QUYỀN TRUY CẬP ===
  if (hasPermission === null)
    return <ActivityIndicator style={styles.container} />;
  if (!hasPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={{ textAlign: "center", marginBottom: 16 }}>
          Cần quyền truy cập camera
        </Text>
        <Button onPress={requestPermission} title="Cấp quyền" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
        onCameraReady={() => setCameraReady(true)}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={pickImageFromGallery}
        >
          <Text style={styles.text}>Thư viện</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, !cameraReady && { opacity: 0.5 }]}
          onPress={takePicture}
          disabled={!cameraReady}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
        >
          <Text style={styles.text}>Flip</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent={false} visible={previewVisible}>
        <View style={styles.container}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />

          <View style={styles.analysisContainer}>
            {analyzing ? (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.analyzingText}>Đang phân tích...</Text>
              </View>
            ) : (
              <>
                {addressInfo && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Địa chỉ:</Text>
                    <Text style={styles.infoText}>
                      {addressInfo.ward && `${addressInfo.ward}, `}
                      {addressInfo.district}, {addressInfo.city}
                    </Text>
                  </View>
                )}
                {aiDescription && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>AI phân tích:</Text>
                    <Text style={styles.infoText}>{aiDescription}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.previewButtons}>
            <Button title="Hủy" onPress={closePreview} />
            <Button title="Chia sẻ" onPress={handleShare} />
            <Button
              title={uploading ? "Đang upload..." : "Upload Appwrite"}
              onPress={uploadToAppwrite}
              disabled={uploading || analyzing}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// === STYLES ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  camera: { flex: 1 },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 40,
    paddingBottom: 60,
  },
  button: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  galleryButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    borderWidth: 5,
    borderColor: "#ccc",
  },
  text: { fontSize: 16, color: "white" },
  previewImage: { flex: 1, resizeMode: "contain" },
  analysisContainer: { padding: 15, backgroundColor: "rgba(0,0,0,0.8)" },
  analyzingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  analyzingText: { marginLeft: 10, color: "#fff", fontSize: 14 },
  infoBox: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2196F3",
    marginBottom: 4,
  },
  infoText: { fontSize: 14, color: "#fff", lineHeight: 18 },
  previewButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: "black",
  },
});
