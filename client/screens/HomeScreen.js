import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Modal,
} from "react-native";

import WhiteHeart from "../assets/tim.png";
import RedHeart from "../assets/redtim.png";
import Location from "../assets/location.png";
import Share from "../assets/share.png";

// Dữ liệu user đăng bài
const userList = [
  { id: "u1", name: "Nguyễn Văn A", avatar: "https://randomuser.me/api/portraits/men/32.jpg", postCount: 3 },
  { id: "u2", name: "Trần Thị B", avatar: "https://randomuser.me/api/portraits/women/65.jpg", postCount: 5 },
  { id: "u3", name: "Lê Văn C", avatar: "https://randomuser.me/api/portraits/men/45.jpg", postCount: 2 },
  { id: "u4", name: "Phạm Thị D", avatar: "https://randomuser.me/api/portraits/women/12.jpg", postCount: 4 },
  { id: "u5", name: "Nguyễn Văn E", avatar: "https://randomuser.me/api/portraits/men/33.jpg", postCount: 1 },
  { id: "u6", name: "Trần Thị F", avatar: "https://randomuser.me/api/portraits/women/66.jpg", postCount: 2 },
];

// Dữ liệu bài đăng
const photoData = [
  {
    id: "1",
    author: userList[0],
    title: "Hoàng hôn Hồ Tây",
    description: "Ánh nắng cuối ngày tuyệt đẹp",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    likes: 128,
    comments: 34,
    shares: 12,
    maps: 1,
  },
  {
    id: "2",
    author: userList[1],
    title: "Đồi chè Mộc Châu",
    description: "Xanh mướt cả một vùng trời",
    image: "https://tse2.mm.bing.net/th/id/OIP.AfvuTpNdj7_PikIqIjaqzQHaEc?pid=Api&P=0&h=220",
    likes: 98,
    comments: 21,
    shares: 8,
    maps: 1,
  },
  {
    id: "3",
    author: userList[1],
    title: "Đồi chè Mộc Châu",
    description: "Xanh mướt cả một vùng trời",
    image: "https://tse2.mm.bing.net/th/id/OIP.AfvuTpNdj7_PikIqIjaqzQHaEc?pid=Api&P=0&h=220",
    likes: 98,
    comments: 21,
    shares: 8,
    maps: 1,
  },
  {
    id: "4",
    author: userList[1],
    title: "Đồi chè Mộc Châu",
    description: "Xanh mướt cả một vùng trời",
    image: "https://tse2.mm.bing.net/th/id/OIP.AfvuTpNdj7_PikIqIjaqzQHaEc?pid=Api&P=0&h=220",
    likes: 98,
    comments: 21,
    shares: 8,
    maps: 1,
  },
  {
    id: "5",
    author: userList[1],
    title: "Đồi chè Mộc Châu",
    description: "Xanh mướt cả một vùng trời",
    image: "https://tse2.mm.bing.net/th/id/OIP.AfvuTpNdj7_PikIqIjaqzQHaEc?pid=Api&P=0&h=220",
    likes: 98,
    comments: 21,
    shares: 8,
    maps: 1,
  },
];

// Component hiển thị user ngang
const UserCircle = ({ user }) => (
  <View style={styles.userItem}>
    <View style={styles.avatarWrapper}>
      <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
      <View style={styles.postBadge}>
        <Text style={styles.postCount}>{user.postCount}</Text>
      </View>
    </View>
    <Text style={styles.userName}>{user.name.split(" ")[0]}</Text>
  </View>
);

// Component hiển thị từng ảnh
const PhotoCard = ({ item }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const scaleAnim = useState(new Animated.Value(1))[0];

  const toggleLike = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.5,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const copyToClipboard = () => {
    alert("Đã sao chép liên kết: " + item.image);
    setShowShareModal(false);
  };

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <View style={styles.authorRow}>
          <Image source={{ uri: item.author.avatar }} style={styles.avatar} />
          <Text style={styles.authorName}>{item.author.name}</Text>
        </View>
        <Image source={{ uri: item.image }} style={styles.image} />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={toggleLike}>
            <Animated.Image
              source={liked ? RedHeart : WhiteHeart}
              style={[styles.heartIcon, { transform: [{ scale: scaleAnim }] }]}
              resizeMode="contain"
            />
            <Text style={styles.count}>{likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowShareModal(true)}>
            <Image source={Share} style={styles.iconImage} resizeMode="contain" />
            <Text style={styles.count}>{item.shares}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowLocationModal(true)}>
            <Image source={Location} style={styles.iconImage} resizeMode="contain" />
            <Text style={styles.count}>{item.maps}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Chia sẻ */}
      <Modal visible={showShareModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Chia sẻ bài viết</Text>
            <Text style={styles.modalSubtitle}>Liên kết ảnh:</Text>
            <View style={styles.linkContainer}>
              <Text style={styles.linkText} numberOfLines={1}>
                {item.image}
              </Text>
            </View>

            <View style={styles.shareOptionsRow}>
              <TouchableOpacity style={styles.shareOptionBtn}>
                <Text style={styles.shareIcon}>📘</Text>
                <Text style={styles.shareLabel}>Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareOptionBtn}>
                <Text style={styles.shareIcon}>📸</Text>
                <Text style={styles.shareLabel}>Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareOptionBtn}>
                <Text style={styles.shareIcon}>💬</Text>
                <Text style={styles.shareLabel}>Zalo</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
              <Text style={styles.copyButtonText}>📋 Sao chép liên kết</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowShareModal(false)}>
              <Text style={styles.modalClose}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Bản đồ */}
      <Modal visible={showLocationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.mapModalBox}>
            <Text style={styles.modalTitle}>Vị trí Check-in</Text>
            <Text style={styles.locationCaption}>{item.title}</Text>

            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapText}>🗺️</Text>
              <Text style={styles.mapLabel}>Hiển thị bản đồ Google Maps</Text>
              <Text style={styles.mapCoords}>21.0285° N, 105.8342° E</Text>
            </View>

            <TouchableOpacity style={styles.openMapButton}>
              <Text style={styles.openMapButtonText}>Mở trong Google Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <Text style={styles.modalClose}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Màn hình chính
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>📸 CheckinPhoto</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userScroll}>
        {userList.map((user) => (
          <UserCircle key={user.id} user={user} />
        ))}
      </ScrollView>
      <FlatList
        data={photoData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PhotoCard item={item} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// Style
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f9ff",
    paddingTop: 40,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#333",
  },
  userScroll: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  userItem: {
    alignItems: "center",
    marginRight: 16,
  },
  avatarWrapper: {
    position: "relative",
    borderWidth: 2,
    borderColor: "#2196F3",
    borderRadius: 40,
    padding: 2,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  postBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#2196F3",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  postCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  userName: {
    fontSize: 12,
    marginTop: 4,
    color: "#333",
  },
  cardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    color: "#333",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  actionButton: {
    alignItems: "center",
  },
  heartIcon: {
    width: 24,
    height: 24,
    marginBottom: 2,
  },
  iconImage: {
    width: 24,
    height: 24,
    marginBottom: 2,
  },
  count: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },

  // Modal chung
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal chia sẻ
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "85%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  linkContainer: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    marginBottom: 16,
  },
  linkText: {
    fontSize: 13,
    color: "#1a0dab",
    fontFamily: "monospace",
  },
  shareOptionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 16,
  },
  shareOptionBtn: {
    alignItems: "center",
  },
  shareIcon: {
    fontSize: 28,
  },
  shareLabel: {
    fontSize: 13,
    color: "#333",
    marginTop: 4,
  },
  copyButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  copyButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

  // Modal bản đồ
  mapModalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "85%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  locationCaption: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  mapPlaceholder: {
    width: "100%",
    height: 180,
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  mapText: {
    fontSize: 48,
    marginBottom: 8,
  },
  mapLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2e7d32",
  },
  mapCoords: {
    fontSize: 12,
    color: "#555",
    fontFamily: "monospace",
    marginTop: 4,
  },
  openMapButton: {
    backgroundColor: "#34A853",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  openMapButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  modalClose: {
    marginTop: 16,
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "600",
  },
});