/********************************************************************
 *  ProfileScreen – CHỈ 2 TAB: Posts + Đã thích
 *  MỚI:
 *    • Icon mũi tên (top-left) → chuyển tài khoản
 *    • 3 gạch (top-right) → mở Modal Settings từ bên phải
 *    • Modal Settings: Settings, Switch Account, Logout
 *    • Tối ưu layout, animation mượt
 ********************************************************************/

import React, { useState, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
  TextInput,
  Alert,
} from "react-native";

import WhiteHeart from "../assets/tim.png";
import RedHeart from "../assets/redtim.png";
import Share from "../assets/share.png";

const { width, height } = Dimensions.get("window");

/* ==================== DỮ LIỆU MOCK ==================== */
const userProfile = {
  id: "u1",
  name: "Nguyễn Văn A",
  username: "@nguyenvana",
  avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  bio: "Yêu thích nhiếp ảnh và du lịch | CheckinPhoto enthusiast",
  posts: 128,
  followers: 1567,
  following: 234,
  isFollowing: false,
};

const storiesData = [
  { id: "s1", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=100", isActive: true },
  { id: "s2", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", isActive: false },
  { id: "s3", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100", isActive: false },
];

const postsGridData = [
  { id: "p1", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=150" },
  { id: "p2", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
  { id: "p3", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150" },
  { id: "p4", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=150" },
  { id: "p5", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
  { id: "p6", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150" },
];

const likedPostsData = [
  { id: "l1", author: "Nguyễn Văn A", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb", title: "Hoàng hôn Hồ Tây", likes: 128 },
  { id: "l2", author: "Trần Thị B", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", title: "Đồi chè Mộc Châu", likes: 98 },
];

/* ==================== COMPONENTS ==================== */
const StoryCircle = ({ story }) => {
  const scale = new Animated.Value(1);
  const onPress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <Animated.View style={[styles.storyCircle, { transform: [{ scale }] }]}>
        <Image source={{ uri: story.image }} style={styles.storyImage} />
        {story.isActive && <View style={styles.activeBorder} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

const GridPost = ({ image }) => <Image source={{ uri: image }} style={styles.gridImage} />;

const LikedPostCard = ({ item }) => {
  const [liked, setLiked] = useState(true);
  const [count, setCount] = useState(item.likes);

  const toggleLike = () => {
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);
  };

  return (
    <View style={styles.likedCard}>
      <Text style={styles.likedAuthor}>{item.author}</Text>
      <Image source={{ uri: item.image }} style={styles.likedImage} />
      <Text style={styles.likedTitle}>{item.title}</Text>
      <TouchableOpacity onPress={toggleLike} style={styles.likeRow}>
        <Image source={liked ? RedHeart : WhiteHeart} style={styles.heartIcon} />
        <Text style={styles.likeCount}>{count}</Text>
      </TouchableOpacity>
    </View>
  );
};

/* ==================== MODALS ==================== */
const AvatarModal = ({ visible, onClose, avatar }) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <Image source={{ uri: avatar }} style={styles.fullAvatar} resizeMode="contain" />
    </TouchableOpacity>
  </Modal>
);

const EditProfileModal = ({ visible, onClose, onSave }) => {
  const [name, setName] = useState(userProfile.name);
  const [bio, setBio] = useState(userProfile.bio);

  const save = () => {
    onSave({ name, bio });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.editModalBox}>
          <Text style={styles.modalTitle}>Chỉnh sửa Profile</Text>
          <Text style={styles.inputLabel}>Tên</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput style={[styles.input, { height: 80 }]} value={bio} onChangeText={setBio} multiline />
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={save}><Text style={styles.saveBtn}>Lưu</Text></TouchableOpacity>
            <TouchableOpacity onPress={onClose}><Text style={styles.cancelBtn}>Hủy</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ==================== SETTINGS MODAL (từ bên phải) ==================== */
const SettingsModal = ({ visible, onClose }) => {
  const slideAnim = useRef(new Animated.Value(width)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleAction = (action) => {
  onClose();

  if (action === "Logout") {
    setTimeout(() => {
      signOut(auth)
        .then(() => {
          Alert.alert("Đã đăng xuất");
        })
        .catch((error) => {
          Alert.alert("Lỗi", error.message);
        });
    }, 300);
  } else {
    setTimeout(() => {
      Alert.alert("Thông báo", `Bạn chọn: ${action}`);
    }, 300);
  }
};


  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.settingsPanel, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Tài khoản</Text>
          </View>
          <TouchableOpacity style={styles.settingsItem} onPress={() => handleAction("Settings")}>
            <Text style={styles.settingsText}>Cài đặt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => handleAction("Switch Account")}>
            <Text style={styles.settingsText}>Chuyển tài khoản</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingsItem, styles.logoutItem]} onPress={() => handleAction("Logout")}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

/* ==================== MAIN SCREEN ==================== */
export default function ProfileScreen() {
  const [tab, setTab] = useState("posts");
  const [showAvatar, setShowAvatar] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profile, setProfile] = useState(userProfile);
  const [following, setFollowing] = useState(userProfile.isFollowing);

  const toggleFollow = () => setFollowing(!following);
  const saveProfile = (upd) => setProfile({ ...profile, ...upd });

  /* ---- Header (ListHeaderComponent) ---- */
  const Header = () => (
    <View style={styles.headerContainer}>
      {/* Top Bar: Mũi tên + 3 gạch */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => Alert.alert("Chuyển tài khoản", "Chưa có tài khoản khác")}>
          <Text style={styles.arrowIcon}>Chuyển tài khoản ↓</Text>
        </TouchableOpacity>
        <Text style={styles.headerUsername}>{profile.username}</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowAvatar(true)}>
          <Image source={{ uri: profile.avatar }} style={styles.avatar} />
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => setShowEdit(true)}>
          <Text style={styles.editBtnText}>Chỉnh sửa</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}><Text style={styles.statNumber}>{profile.posts}</Text><Text>Posts</Text></View>
        <View style={styles.statItem}><Text style={styles.statNumber}>{profile.followers}</Text><Text>Followers</Text></View>
        <View style={styles.statItem}><Text style={styles.statNumber}>{profile.following}</Text><Text>Following</Text></View>
      </View>

      <TouchableOpacity style={[styles.followBtn, following && styles.unfollowBtn]} onPress={toggleFollow}>
        <Text style={[styles.followBtnText, following && { color: "#2196F3" }]}>
          {following ? "Đang theo dõi" : "Theo dõi"}
        </Text>
      </TouchableOpacity>


      <View style={styles.tabsRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === "posts" && styles.activeTab]} onPress={() => setTab("posts")}>
          <Text style={[styles.tabText, tab === "posts" && styles.activeTabText]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === "liked" && styles.activeTab]} onPress={() => setTab("liked")}>
          <Text style={[styles.tabText, tab === "liked" && styles.activeTabText]}>Đã thích</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /* ---- Nội dung tab ---- */
  const renderTab = () => {
    if (tab === "posts") {
      return (
        <FlatList
          key="posts-grid"
          data={postsGridData}
          numColumns={3}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <GridPost image={item.image} />}
          contentContainerStyle={styles.gridContainer}
        />
      );
    }

    return (
      <FlatList
        key="liked-list"
        data={likedPostsData}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <LikedPostCard item={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    );
  };

  return (
    <>
      <FlatList
        ListHeaderComponent={<Header />}
        data={[]}
        renderItem={null}
        keyExtractor={() => "dummy"}
        ListFooterComponent={renderTab()}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: "#f2f9ff" }}
      />

      {/* Modals */}
      <AvatarModal visible={showAvatar} onClose={() => setShowAvatar(false)} avatar={profile.avatar} />
      <EditProfileModal visible={showEdit} onClose={() => setShowEdit(false)} onSave={saveProfile} />
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}

/* ==================== STYLES ==================== */
const gridItemSize = (width - 48) / 3;

const styles = StyleSheet.create({
  headerContainer: { paddingBottom: 12 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    marginTop:20
  },
  arrowIcon: { fontSize: 15, fontWeight: "bold", color: "#333" },
  headerUsername: { fontSize: 18, fontWeight: "600", color: "#333" },
  menuIcon: { fontSize: 24, color: "#333" },

  header: { flexDirection: "row", padding: 16, alignItems: "center" },
  avatar: { width: 80, height: 80, borderRadius: 40, marginRight: 16 },
  profileInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: "bold", color: "#333" },
  name: { fontSize: 14, color: "#666", marginTop: 2 },
  bio: { fontSize: 14, color: "#666", marginTop: 4 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#2196F3", borderRadius: 6 },
  editBtnText: { color: "#fff", fontWeight: "600" },

  statsRow: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 16, marginBottom: 12 },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "bold", color: "#333" },

  followBtn: { backgroundColor: "#2196F3", paddingVertical: 10, marginHorizontal: 16, borderRadius: 8, alignItems: "center", marginBottom: 12 },
  unfollowBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#2196F3" },
  followBtnText: { color: "#fff", fontWeight: "600" },

  storiesContainer: { paddingHorizontal: 16, marginBottom: 12 },
  storyCircle: { width: 60, height: 60, borderRadius: 30, marginRight: 12, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  storyImage: { width: 52, height: 52, borderRadius: 26 },
  activeBorder: { position: "absolute", width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: "#ff385c" },

  tabsRow: { flexDirection: "row", justifyContent: "space-around", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 8, marginHorizontal: 16 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#2196F3" },
  tabText: { fontSize: 14, color: "#666" },
  activeTabText: { color: "#2196F3", fontWeight: "600" },

  gridContainer: { paddingHorizontal: 4 },
  gridImage: { width: gridItemSize, height: gridItemSize, margin: 2 },

  likedCard: { backgroundColor: "#fff", marginVertical: 8, padding: 12, borderRadius: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1 },
  likedAuthor: { fontWeight: "600", color: "#333", marginBottom: 4 },
  likedImage: { width: "100%", height: 200, borderRadius: 8, marginBottom: 8 },
  likedTitle: { fontSize: 16, color: "#333", marginBottom: 8 },
  likeRow: { flexDirection: "row", alignItems: "center" },
  heartIcon: { width: 20, height: 20, marginRight: 6 },
  likeCount: { fontSize: 14, color: "#555" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  fullAvatar: { width: 280, height: 280, borderRadius: 140 },

  editModalBox: { backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 16 },
  inputLabel: { marginTop: 12, fontWeight: "600", color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginTop: 4, fontSize: 16 },
  modalButtons: { flexDirection: "row", justifyContent: "space-around", marginTop: 20 },
  saveBtn: { color: "#2196F3", fontWeight: "600", fontSize: 16 },
  cancelBtn: { color: "#666", fontSize: 16 },

  // Settings Modal
  settingsPanel: {
    position: "absolute",
    top: 0,
    right: 0,
    width: width * 0.75,
    height: "100%",
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingHorizontal: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
  },
  settingsHeader: { marginBottom: 30 },
  settingsTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  settingsItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  settingsText: { fontSize: 16, color: "#333" },
  logoutItem: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 16 },
  logoutText: { fontSize: 16, color: "#e74c3c", fontWeight: "600" },
});