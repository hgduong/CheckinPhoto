// client/screens/CreateCaptionScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, ScrollView, SafeAreaView, StyleSheet, KeyboardAvoidingView, Platform
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAICaption } from "../services/caption";

export default function CreateCaptionScreen({ route, navigation }) {
  const params = route?.params || {};
  const imageUri = params.uri || params.localUri || params.image;
  const location = params.location || null;
  const address = params.address || {};
  const createdAt = params.createdAt ? Number(params.createdAt) : Date.now();

  const [caption, setCaption] = useState('');
  const [aiCaption, setAiCaption] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (imageUri) handleGenerateAICaption();
    else Alert.alert('Lỗi', 'Không tìm thấy ảnh');
  }, [imageUri]);

  // === GỌI AI SERVICE ===
  const handleGenerateAICaption = async () => {
    setAnalyzing(true);
    try {
      const aiText = await generateAICaption(imageUri, {
        full: address?.full || address?.district || address?.city || 'Việt Nam',
        createdAt,
      });
      setAiCaption(aiText);
      setCaption(aiText);
    } catch (err) {
      console.warn('AI lỗi:', err);
      const fallback = `Khoảnh khắc đáng nhớ lúc ${new Date(createdAt).toLocaleTimeString('vi-VN')} tại ${address?.city || 'Việt Nam'}`;
      setAiCaption(fallback);
      setCaption(fallback);
    } finally {
      setAnalyzing(false);
    }
  };

  // === LƯU BÀI VIẾT ===
  const handlePost = async () => {
    if (!imageUri) {
      Alert.alert('Lỗi', 'Không có ảnh để đăng');
      return;
    }
    setPosting(true);
    try {
      // ✅ Bước 1: tạo thư mục posts
      const dir = FileSystem.documentDirectory + 'posts/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

      // ✅ Bước 2: đảm bảo file ảnh có thể đọc được (vì đôi khi imageUri là "content://")
      const tempPath = FileSystem.cacheDirectory + `temp_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: imageUri, to: tempPath });

      // ✅ Bước 3: copy sang thư mục posts
      const filename = `post_${Date.now()}.jpg`;
      const dest = dir + filename;
      await FileSystem.copyAsync({ from: tempPath, to: dest });

      // ✅ Bước 4: lưu bài viết vào AsyncStorage
      const post = {
        id: `post_${Date.now()}`,
        uri: dest,
        caption: caption.trim() || 'Không có chú thích',
        createdAt: Date.now(),
        location,
        address,
      };

      const raw = await AsyncStorage.getItem('LOCAL_POSTS');
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(post);
      await AsyncStorage.setItem('LOCAL_POSTS', JSON.stringify(list));

      Alert.alert('✅ Thành công!', 'Bài viết đã được đăng.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.log('❌ Lỗi khi đăng bài:', e);
      Alert.alert('❌ Lỗi', 'Không thể đăng bài. Ảnh có thể không đọc được.');
    } finally {
      setPosting(false);
    }
  };

  const formatTime = () =>
    new Date(createdAt).toLocaleString('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Tạo bài viết</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ẢNH */}
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee' }]}>
              <Text style={{ color: '#999' }}>Không có ảnh</Text>
            </View>
          )}

          {/* THÔNG TIN */}
          <View style={styles.info}>
            <Text style={styles.time}>⏰ {formatTime()}</Text>
            {address?.full && <Text style={styles.location}>📍 {address.full}</Text>}
          </View>

          {/* AI GỢI Ý */}
          {analyzing ? (
            <View style={styles.aiLoading}>
              <ActivityIndicator size="small" color="#2196F3" />
              <Text style={styles.aiText}>AI đang sáng tạo...</Text>
            </View>
          ) : (
            aiCaption !== '' && (
              <View style={styles.aiBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.aiLabel}>AI gợi ý:</Text>
                  {/* 🔁 Nút tạo lại caption */}
                  <TouchableOpacity onPress={handleGenerateAICaption}>
                    <Text style={{ color: '#1976d2', fontWeight: '600' }}>Tạo lại 🔁</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.aiCaption}>{aiCaption}</Text>

                <TouchableOpacity style={styles.useBtn} onPress={() => setCaption(aiCaption)}>
                  <Text style={styles.useText}>Dùng ngay</Text>
                </TouchableOpacity>
              </View>
            )
          )}

          {/* INPUT */}
          <TextInput
            style={styles.captionInput}
            placeholder="Viết caption của bạn..."
            value={caption}
            onChangeText={setCaption}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        {/* NÚT ĐĂNG */}
        <TouchableOpacity
          style={[styles.postBtn, (!imageUri || posting) && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!imageUri || posting}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postText}>Đăng bài</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontSize: 28, color: '#666' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  image: { width: '100%', height: 380, backgroundColor: '#f0f0f0' },
  info: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  time: { fontSize: 14, color: '#555', fontWeight: '500' },
  location: { fontSize: 14, color: '#555', fontWeight: '500' },
  aiLoading: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f0f8ff', marginHorizontal: 16, borderRadius: 12, marginBottom: 12 },
  aiText: { marginLeft: 8, color: '#2196F3', fontWeight: '500' },
  aiBox: { backgroundColor: '#e3f2fd', padding: 16, margin: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#2196F3' },
  aiLabel: { fontSize: 15, fontWeight: 'bold', color: '#1976d2', marginBottom: 6 },
  aiCaption: { fontSize: 15, color: '#333', lineHeight: 22, marginVertical: 10 },
  useBtn: { alignSelf: 'flex-start', backgroundColor: '#2196F3', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  useText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  captionInput: { backgroundColor: '#f9f9f9', marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 12, height: 110, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
  postBtn: { backgroundColor: '#2196F3', marginHorizontal: 16, marginBottom: 20, padding: 16, borderRadius: 16, alignItems: 'center', elevation: 3 },
  postBtnDisabled: { backgroundColor: '#90caf9', elevation: 0 },
  postText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
