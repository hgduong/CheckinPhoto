import React, { useState } from "react";
import { View, Text, Button, Image, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function CreateCaptionScreen() {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled) {
      setImage(result.uri);
      generateCaption(result.uri);
    }
  };

  const generateCaption = (imageUri) => {
    // Giả lập AI tạo caption
    const captions = [
      "Hoàng hôn Hồ Tây - Ánh nắng cuối ngày tuyệt đẹp",
      "Khám phá vẻ đẹp núi rừng Tây Bắc",
      "Một ngày bình yên bên hồ",
      "Check-in giữa thiên nhiên hùng vĩ",
    ];
    const random = Math.floor(Math.random() * captions.length);
    setCaption(captions[random]);
  };

  return (
    <View style={styles.container}>
      <Button title="Chọn ảnh từ thư viện" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={styles.image} />}
      {caption && (
        <Text style={styles.caption}>📝 Caption gợi ý: {caption}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: 300, height: 300, marginTop: 20 },
  caption: { marginTop: 20, fontSize: 16, fontWeight: "600" },
});
