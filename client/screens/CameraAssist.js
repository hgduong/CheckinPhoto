import React, { useState } from "react";
import { View, Text, Button, Image, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function CameraAssist() {
  const [image, setImage] = useState(null);
  const [poseSuggestion, setPoseSuggestion] = useState("");

  const pickImage = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled) {
      setImage(result.uri);
      suggestPose(result.uri);
    }
  };

  const suggestPose = (imageUri) => {
    // Giả lập AI gợi ý dáng chụp
    const suggestions = [
      "Quay lưng giơ tay",
      "Ngồi thiền giữa thiên nhiên",
      "Đứng dang tay đón nắng",
      "Nhảy lên tạo dáng năng động",
    ];
    const random = Math.floor(Math.random() * suggestions.length);
    setPoseSuggestion(suggestions[random]);
  };

  return (
    <View style={styles.container}>
      <Button title="Chụp ảnh" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={styles.image} />}
      {poseSuggestion && (
        <Text style={styles.suggestion}>💡 Gợi ý dáng: {poseSuggestion}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: 300, height: 300, marginTop: 20 },
  suggestion: { marginTop: 20, fontSize: 16, fontWeight: "600" },
});
