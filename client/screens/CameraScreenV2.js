import React, { useState } from "react";
import { Button, Platform, StyleSheet, Text, View, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";

// Appwrite SDK
import { ID } from "react-native-appwrite";
import { AppwriteClientFactory } from "../appwrite.config";

const storage = AppwriteClientFactory.getInstance().storage;

// ======= App chính =======
export default function App() {
  const [currentImageUrl, setCurrentImageUrl] = useState(null);

  // Chuẩn bị file native từ asset
  const prepareNativeFile = async (asset) => {
    try {
      const url = new URL(asset.uri);
      return {
        name: url.pathname.split("/").pop(),
        size: asset.fileSize,
        type: asset.mimeType,
        uri: url.href,
      };
    } catch (error) {
      console.error("[prepareNativeFile] error:", error);
      throw error;
    }
  };

  // Upload ảnh lên Appwrite Storage
  const uploadImageAsync = async (asset) => {
    try {
      const fileResponse = await storage.createFile(
        process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
        ID.unique(),
        Platform.OS === "web" ? asset.file : await prepareNativeFile(asset)
      );

      console.log("[file uploaded] =>", fileResponse);

      const fileUrl = storage.getFileView(
        process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
        fileResponse.$id
      );

      setCurrentImageUrl(fileUrl.href);
      Alert.alert("Upload thành công!", "Ảnh đã được lưu lên Appwrite Storage.");
    } catch (error) {
      console.error("[uploadImageAsync] error:", error);
      Alert.alert("Upload thất bại", String(error));
    }
  };

  // Mở thư viện ảnh
  const pickImage = async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log("Picker result:", pickerResult);

    if (!pickerResult.canceled && pickerResult.assets.length > 0) {
      await uploadImageAsync(pickerResult.assets[0]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={{ marginBottom: 10 }}>📸 Upload ảnh lên Appwrite Storage</Text>
      <StatusBar style="auto" />
      <Button onPress={pickImage} title="Chọn ảnh từ thư viện" />
      {currentImageUrl && (
        <View style={{ marginTop: 20 }}>
          <Text>✅ URL ảnh:</Text>
          <Text style={{ color: "blue" }}>{currentImageUrl}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
