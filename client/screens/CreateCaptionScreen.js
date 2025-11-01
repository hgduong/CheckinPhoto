import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  Image,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import CONFIG from "../config";

export default function CreateCaptionScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [image, setImage] = useState(route.params?.image || null);
  const [location, setLocation] = useState(route.params?.location || null);
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (image && !aiSuggestion) {
      analyzeImage();
    }
  }, [image]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setImage(result.assets[0].uri);
      // Lấy location hiện tại
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation({
            type: "Point",
            coordinates: [loc.coords.longitude, loc.coords.latitude],
          });
        }
      } catch (e) {
        console.warn("Could not get location:", e);
      }
    }
  };

  const analyzeImage = async () => {
    if (!image || CONFIG.OFFLINE_MODE) {
      // Fallback: tạo caption giả lập
      generateFallbackCaption();
      return;
    }

    setAnalyzing(true);
    try {
      // Đọc ảnh dưới dạng base64
      const base64 = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const imageUri = `data:image/jpeg;base64,${base64}`;

      const response = await fetch(`${CONFIG.API_BASE_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUri,
          latitude: location?.coordinates?.[1],
          longitude: location?.coordinates?.[0],
        }),
        timeout: CONFIG.TIMEOUT,
      });

      const data = await response.json();

      if (data.ai?.aiDescription) {
        setAiSuggestion(data.ai.aiDescription);
        setDescription(data.ai.aiDescription);
      } else {
        generateFallbackCaption();
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
      generateFallbackCaption();
    } finally {
      setAnalyzing(false);
    }
  };

  const generateFallbackCaption = () => {
    const captions = [
      "Hoàng hôn Hồ Tây - Ánh nắng cuối ngày tuyệt đẹp",
      "Khám phá vẻ đẹp núi rừng Tây Bắc",
      "Một ngày bình yên bên hồ",
      "Check-in giữa thiên nhiên hùng vĩ",
      "Khoảnh khắc đáng nhớ",
    ];
    const random = captions[Math.floor(Math.random() * captions.length)];
    setAiSuggestion(random);
    setDescription(random);
  };

  const handleSave = async () => {
    if (!image) {
      Alert.alert("Lỗi", "Vui lòng chọn ảnh");
      return;
    }

    setLoading(true);
    try {
      // Lưu vào local storage
      const APP_PHOTO_DIR = FileSystem.documentDirectory + "photos/";
      const dirInfo = await FileSystem.getInfoAsync(APP_PHOTO_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(APP_PHOTO_DIR, { intermediates: true });
      }

      const ts = Date.now();
      const filename = `photo_${ts}.jpg`;
      const dest = APP_PHOTO_DIR + filename;
      await FileSystem.copyAsync({ from: image, to: dest });

      const post = {
        id: `local_${ts}`,
        uri: dest,
        createdAt: ts,
        title: caption || "Untitled",
        description: description || aiSuggestion || "",
        aiDescription: aiSuggestion,
        location: location || null,
      };

      const raw = await AsyncStorage.getItem("LOCAL_POSTS");
      let arr = raw ? JSON.parse(raw) : [];
      arr.unshift(post);
      await AsyncStorage.setItem("LOCAL_POSTS", JSON.stringify(arr));

      Alert.alert("Thành công", "Đã lưu ảnh vào thư viện", [
        {
          text: "OK",
          onPress: () => {
            // Reset về Camera tab, sau đó navigate sang Gallery
            navigation.navigate("Camera", { screen: "CameraMain" });
            setTimeout(() => {
              navigation.navigate("Gallery");
            }, 100);
          }
        },
      ]);
    } catch (error) {
      console.error("Error saving:", error);
      Alert.alert("Lỗi", "Không thể lưu ảnh");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Tạo Caption cho Ảnh</Text>

        {!image ? (
          <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
            <Text style={styles.pickButtonText}>📷 Chọn ảnh từ thư viện</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Image source={{ uri: image }} style={styles.image} />

            {analyzing && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.analyzingText}>Đang phân tích ảnh...</Text>
              </View>
            )}

            {aiSuggestion && (
              <View style={styles.suggestionBox}>
                <Text style={styles.suggestionLabel}>💡 AI gợi ý:</Text>
                <Text style={styles.suggestionText}>{aiSuggestion}</Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Tiêu đề (tùy chọn)"
              value={caption}
              onChangeText={setCaption}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mô tả"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f9ff" },
  content: { padding: 20 },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  pickButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 50,
  },
  pickButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
  },
  analyzingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  analyzingText: { marginLeft: 10, color: "#666" },
  suggestionBox: {
    backgroundColor: "#e3f2fd",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  suggestionLabel: { fontSize: 14, fontWeight: "600", marginBottom: 5 },
  suggestionText: { fontSize: 14, color: "#333" },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: { color: "#666", fontWeight: "600" },
  saveButton: { backgroundColor: "#2196F3" },
  saveButtonText: { color: "#fff", fontWeight: "600" },
});
