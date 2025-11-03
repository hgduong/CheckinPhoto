import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function MapScreen() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
async function seedFakeUsers() {
  const fakeUsers = [
    {
      id: "test1",
      name: "Nguyễn Minh An",
      username: "@an123",
      avatar: "https://i.imgur.com/Qr6YFvH.jpg",
      bio: "Yêu du lịch và chụp ảnh.",
      latitude: 21.0356,
      longitude: 105.8302,
      location: "Hoàn Kiếm",
      postCount: 15,
      likeCount: 240,
      followers: 530,
      photo: "https://i.imgur.com/8NQ6Hpe.jpg",
    },
    {
      id: "test2",
      name: "Lê Thảo Vy",
      username: "@vyxinh",
      avatar: "https://i.imgur.com/NY5U9po.jpg",
      bio: "Food Blogger sống tại Hà Nội 🍜",
      latitude: 21.0285,
      longitude: 105.8412,
      location: "Ba Đình",
      postCount: 20,
      likeCount: 400,
      followers: 800,
      photo: "https://i.imgur.com/pQOa0qG.jpg",
    },
    {
      id: "test3",
      name: "Phạm Đức Long",
      username: "@longdev",
      avatar: "https://i.imgur.com/M9zOeY1.jpg",
      bio: "Lập trình viên thích check-in 😎",
      latitude: 21.0205,
      longitude: 105.8504,
      location: "Cầu Giấy",
      postCount: 10,
      likeCount: 180,
      followers: 200,
      photo: "https://i.imgur.com/G1pW5FJ.jpg",
    },
    {
      id: "test4",
      name: "Trần Khánh Ly",
      username: "@khanhly",
      avatar: "https://i.imgur.com/ExbWjJX.jpg",
      bio: "Thích cà phê sáng ☕ và sách.",
      latitude: 21.0461,
      longitude: 105.8309,
      location: "Kim Mã",
      postCount: 8,
      likeCount: 130,
      followers: 170,
      photo: "https://i.imgur.com/WBQ0f3U.jpg",
    },
    {
      id: "test5",
      name: "Hoàng Gia Bảo",
      username: "@hoangbao",
      avatar: "https://i.imgur.com/OP7WzVx.jpg",
      bio: "Designer trẻ, mê phong cảnh 🎨",
      latitude: 21.0377,
      longitude: 105.8534,
      location: "Hoàn Kiếm",
      postCount: 25,
      likeCount: 560,
      followers: 940,
      photo: "https://i.imgur.com/nL5lSgT.jpg",
    },
  ];

  for (const u of fakeUsers) {
    await setDoc(doc(db, "users", u.id), u);
    console.log("✅ Added:", u.name);
  }
}
  // Realtime listener
  useEffect(() => {
    seedFakeUsers();
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const userList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(userList);
        setLoading(false);
      },
      (error) => {
        console.error("Lỗi khi lấy dữ liệu người dùng:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe(); // 🔥 Hủy listener khi rời khỏi màn hình
  }, []);

  // ✅ Bộ lọc tìm kiếm
  const filteredUsers = users.filter((user) => {
    const matchName = user.name?.toLowerCase().includes(search.toLowerCase());
    const matchLocation = filterLocation
      ? user.location === filterLocation
      : true;
    return matchName && matchLocation;
  });

  const handleFollow = (userId) => {
    if (!followedUsers.includes(userId)) {
      setFollowedUsers([...followedUsers, userId]);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 8 }}>Đang tải vị trí người dùng...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Thanh tìm kiếm */}
      <View style={styles.searchBar}>
        <TextInput
          placeholder="🔍 Tìm kiếm người dùng..."
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        >
          {["", "Hoàn Kiếm", "Ba Đình", "Cầu Giấy", "Kim Mã"].map((loc) => (
            <Text
              key={loc}
              style={[
                styles.filterButton,
                filterLocation === loc && styles.activeFilter,
              ]}
              onPress={() => setFilterLocation(loc)}
            >
              {loc || "Tất cả"}
            </Text>
          ))}
        </ScrollView>
      </View>

      {/* Bản đồ */}
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 21.0285,
          longitude: 105.8542,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {filteredUsers.map((user) => {
          if (!user.latitude || !user.longitude) return null;
          return (
            <Marker
              key={user.id}
              coordinate={{
                latitude: user.latitude,
                longitude: user.longitude,
              }}
              onPress={() => {
                setSelectedUser(user);
                setModalVisible(true);
              }}
            >
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            </Marker>
          );
        })}
      </MapView>

      {/* Modal hiển thị thông tin người dùng */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedUser && (
              <>
                <Image
                  source={{ uri: selectedUser.avatar }}
                  style={styles.modalAvatar}
                />
                <Text style={styles.modalName}>{selectedUser.name}</Text>
                <Text>Khu vực: {selectedUser.location}</Text>
                <Text>Số bài đăng: {selectedUser.postCount}</Text>
                {selectedUser.photo && (
                  <Image
                    source={{ uri: selectedUser.photo }}
                    style={styles.modalPhoto}
                  />
                )}
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    followedUsers.includes(selectedUser.id) && styles.followed,
                  ]}
                  onPress={() => handleFollow(selectedUser.id)}
                >
                  <Text style={styles.followText}>
                    {followedUsers.includes(selectedUser.id)
                      ? "Đã follow"
                      : "Follow"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeText}>Đóng</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ==================== STYLE ==================== */
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    paddingTop: 40,
    padding: 10,
    backgroundColor: "#fff",
    elevation: 2,
  },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#eee",
    borderRadius: 20,
    marginRight: 8,
    fontSize: 14,
  },
  activeFilter: {
    backgroundColor: "#2196F3",
    color: "#fff",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "80%",
    alignItems: "center",
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  modalName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  modalPhoto: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginVertical: 10,
  },
  followButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 10,
  },
  followed: {
    backgroundColor: "#aaa",
  },
  followText: {
    color: "#fff",
    fontWeight: "bold",
  },
  closeText: {
    color: "#2196F3",
    marginTop: 10,
  },
});
