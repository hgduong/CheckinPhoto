import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker"; // ✅ để chọn ảnh trong thư viện
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const { width } = Dimensions.get("window");

export default function ProfileScreen() {
  const [tab, setTab] = useState("posts");
  const [showSettings, setShowSettings] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [profile, setProfile] = useState(null);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // ✅ Lấy thông tin người dùng
  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setFollowing(data.isFollowing || false);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchProfile();
      else setProfile(null);
    });

    return unsubscribe;
  }, []);

  // ✅ Khi mở màn hình → xin quyền & cập nhật vị trí
  useEffect(() => {
    const getLocationAndUpdate = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };

        const user = auth.currentUser;
        if (user) {
          await updateDoc(doc(db, "users", user.uid), {
            latitude: coords.latitude,
            longitude: coords.longitude,
            location: `Lat: ${coords.latitude.toFixed(4)}, Lng: ${coords.longitude.toFixed(4)}`,
          });
          console.log("📍 Vị trí đã cập nhật:", coords);
        }
      } catch (error) {
        console.error("❌ Lỗi lấy vị trí:", error);
      }
    };

    getLocationAndUpdate();
  }, []);

  const toggleFollow = () => setFollowing(!following);

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 12, color: "#555" }}>
          Đang tải dữ liệu người dùng...
        </Text>
      </View>
    );
  }

  const Header = () => (
    <View style={styles.headerContainer}>
      <View style={styles.topBar}>
        <Text style={styles.headerUsername}>{profile.username || "@"}</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowEdit(true)}>
          <Image source={{ uri: profile.avatar }} style={styles.avatar} />
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
          <Text style={styles.location}>
            📍 {profile.location || "Đang xác định vị trí..."}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile.postCount || 0}</Text>
          <Text>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile.likeCount || 0}</Text>
          <Text>Likes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile.followers || 0}</Text>
          <Text>Followers</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.followBtn, following && styles.unfollowBtn]}
        onPress={toggleFollow}
      >
        <Text style={[styles.followBtnText, following && { color: "#2196F3" }]}>
          {following ? "Đang theo dõi" : "Theo dõi"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ✅ Chọn ảnh mới
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Quyền bị từ chối", "Không thể truy cập thư viện ảnh!");
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) return result.assets[0].uri;
    return null;
  };

  // ✅ Lưu chỉnh sửa
  const handleSaveProfile = async (newData) => {
    try {
      setUpdating(true);
      const user = auth.currentUser;
      if (!user) return;

      let avatarUrl = profile.avatar;

      // Nếu có ảnh mới, upload lên Firebase Storage
      if (newData.newAvatarUri) {
        const storage = getStorage();
        const imageRef = ref(storage, `avatars/${user.uid}.jpg`);
        const response = await fetch(newData.newAvatarUri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        avatarUrl = await getDownloadURL(imageRef);
      }

      await updateDoc(doc(db, "users", user.uid), {
        name: newData.name,
        bio: newData.bio,
        avatar: avatarUrl,
      });

      setProfile((prev) => ({
        ...prev,
        name: newData.name,
        bio: newData.bio,
        avatar: avatarUrl,
      }));

      Alert.alert("✅ Thành công", "Đã cập nhật hồ sơ!");
      setShowEdit(false);
    } catch (err) {
      Alert.alert("❌ Lỗi", "Không thể lưu thay đổi: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const EditProfileModal = () => {
    const [name, setName] = useState(profile.name);
    const [bio, setBio] = useState(profile.bio);
    const [preview, setPreview] = useState(profile.avatar);
    const [newAvatarUri, setNewAvatarUri] = useState(null);

    return (
      <Modal visible={showEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.editBox}>
            <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity
              onPress={async () => {
                const uri = await pickImage();
                if (uri) {
                  setNewAvatarUri(uri);
                  setPreview(uri);
                }
              }}
            >
              <Image source={{ uri: preview }} style={styles.editAvatar} />
              <Text style={{ textAlign: "center", color: "#2196F3" }}>
                Đổi ảnh đại diện
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Tên hiển thị"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Tiểu sử"
              multiline
              value={bio}
              onChangeText={setBio}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() =>
                  handleSaveProfile({ name, bio, newAvatarUri })
                }
                disabled={updating}
              >
                <Text style={styles.saveBtn}>
                  {updating ? "Đang lưu..." : "Lưu"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <Text style={styles.cancelBtn}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const SettingsModal = () => (
    <Modal visible={showSettings} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.settingsPanel}>
          <Text style={styles.settingsTitle}>Tùy chọn tài khoản</Text>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => {
              setShowSettings(false);
              signOut(auth)
                .then(() => Alert.alert("Đăng xuất thành công"))
                .catch((err) => Alert.alert("Lỗi đăng xuất", err.message));
            }}
          >
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowSettings(false)}
          >
            <Text style={styles.closeText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <FlatList
        ListHeaderComponent={<Header />}
        data={[]}
        renderItem={null}
        keyExtractor={() => "dummy"}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: "#f2f9ff" }}
      />

      <EditProfileModal />
      <SettingsModal />
    </>
  );
}

/* ==================== STYLE ==================== */
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f9ff",
  },
  headerContainer: { paddingBottom: 12 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    marginTop: 20,
  },
  headerUsername: { fontSize: 18, fontWeight: "600", color: "#333" },
  menuIcon: { fontSize: 24, color: "#333" },
  header: { flexDirection: "row", padding: 16, alignItems: "center" },
  avatar: { width: 90, height: 90, borderRadius: 45, marginRight: 16 },
  profileInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: "bold", color: "#333" },
  bio: { fontSize: 14, color: "#666", marginTop: 4 },
  location: { fontSize: 14, color: "#888", marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "bold", color: "#333" },
  followBtn: {
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  unfollowBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#2196F3" },
  followBtnText: { color: "#fff", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  editBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "85%",
  },
  editAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  saveBtn: { color: "#2196F3", fontWeight: "600", fontSize: 16 },
  cancelBtn: { color: "#666", fontSize: 16 },
  settingsPanel: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  settingsTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  settingsItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    width: "100%",
    alignItems: "center",
  },
  logoutText: { color: "#e74c3c", fontWeight: "600", fontSize: 16 },
  closeButton: { marginTop: 16 },
  closeText: { color: "#2196F3", fontWeight: "600" },
  modalTitle: { textAlign: "center", fontWeight: "bold", fontSize: 18 },
});
