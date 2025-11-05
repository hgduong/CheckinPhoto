import React, { useEffect, useState, useRef } from "react";
import * as Location from "expo-location";
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
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export default function MapScreen() {
  const mapRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState(null);

  // Lấy vị trí hiện tại và zoom đến đó
  useEffect(() => {
    const fetchAndCenter = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission not granted");
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        const { latitude, longitude } = position.coords;
        const region = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        if (mapRef.current && mapRef.current.animateToRegion) {
          mapRef.current.animateToRegion(region, 1000);
        }
      } catch (error) {
        console.error("Lỗi lấy vị trí:", error);
      }
    };

    fetchAndCenter();
  }, []);

  // Lấy UID hiện tại và danh sách following
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUid(user.uid);
        const followUnsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) {
            setFollowedUsers(snap.data().following || []);
          }
        });
        return followUnsub;
      }
    });
    return unsub;
  }, []);

  // Lấy danh sách người dùng
  useEffect(() => {
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

    return () => unsubscribe();
  }, []);

  // Follow/Unfollow
  const handleFollow = async (targetId) => {
    if (targetId === currentUid) return;
    try {
      const currentRef = doc(db, "users", currentUid);
      const targetRef = doc(db, "users", targetId);

      const currentSnap = await getDoc(currentRef);
      const targetSnap = await getDoc(targetRef);
      if (!currentSnap.exists() || !targetSnap.exists()) return;

      const currentFollowing = currentSnap.data().following || [];
      const isFollowed = currentFollowing.includes(targetId);

      if (isFollowed) {
        await updateDoc(currentRef, {
          following: arrayRemove(targetId),
        });
        await updateDoc(targetRef, {
          followers: Math.max((targetSnap.data().followers || 1) - 1, 0),
        });
      } else {
        await updateDoc(currentRef, {
          following: arrayUnion(targetId),
        });
        await updateDoc(targetRef, {
          followers: (targetSnap.data().followers || 0) + 1,
        });
      }

      const updatedSnap = await getDoc(targetRef);
      if (updatedSnap.exists()) {
        setSelectedUser((prev) => ({
          ...prev,
          followers: updatedSnap.data().followers,
        }));
      }
    } catch (error) {
      console.error("❌ Lỗi khi follow:", error);
    }
  };

  // Center map to user's current location
  const centerOnUser = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission not granted");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const { latitude, longitude } = position.coords;
      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      if (mapRef.current && mapRef.current.animateToRegion) {
        mapRef.current.animateToRegion(region, 800);
      } else if (mapRef.current && mapRef.current.animateCamera) {
        mapRef.current.animateCamera({ center: { latitude, longitude } }, { duration: 800 });
      }
    } catch (err) {
      console.error("Error centering map:", err);
    }
  };

  // Bộ lọc người dùng
  const filteredUsers = users.filter((user) => {
    const matchName = user.name?.toLowerCase().includes(search.toLowerCase());
    const matchLocation = filterLocation
      ? user.location === filterLocation
      : true;
    return matchName && matchLocation;
  });

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
      {/* Tìm kiếm */}
      <View style={styles.searchBar}>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        >
          
        </ScrollView>
      </View>

      {/* Bản đồ */}
      <MapView
        ref={mapRef}
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

          const offsetLat = (Math.random() - 0.000001) * 0.00001;
          const offsetLng = (Math.random() - 0.000001) * 0.00001;

          return (
            <Marker
              key={user.id}
              coordinate={{
                latitude: user.latitude + offsetLat,
                longitude: user.longitude + offsetLng,
              }}
              onPress={() => {
                setSelectedUser(user);
                setModalVisible(true);
              }}
            >
              <Image
                source={{
                  uri:
                    user.avatar ||
                    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                }}
                style={styles.avatar}
              />
            </Marker>
          );
        })}
      </MapView>

      {/* Recenter button */}
      <TouchableOpacity style={styles.recenterButton} onPress={centerOnUser}>
        <Text style={styles.recenterText}>⤢</Text>
      </TouchableOpacity>

      {/* Modal thông tin người dùng */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedUser && (
              <>
                <Image
                  source={{
                    uri:
                      selectedUser.avatar ||
                      "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                  }}
                  style={styles.modalAvatar}
                />
                <Text style={styles.modalName}>{selectedUser.name}</Text>
                <Text>Khu vực: {selectedUser.location}</Text>
                <Text>Số bài đăng: {selectedUser.postCount || 0}</Text>
                <Text>Người theo dõi: {selectedUser.followers || 0}</Text>

                {selectedUser.id !== currentUid && (
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      followedUsers.includes(selectedUser.id) &&
                        styles.followed,
                    ]}
                    onPress={() => handleFollow(selectedUser.id)}
                  >
                    <Text style={styles.followText}>
                      {followedUsers.includes(selectedUser.id)
                        ? "Đã follow"
                        : "Follow"}
                    </Text>
                  </TouchableOpacity>
                )}

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
};
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
  filterRow: { flexDirection: "row" },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#eee",
    borderRadius: 20,
    marginRight: 8,
    fontSize: 14,
  },
  activeFilter: { backgroundColor: "#2196F3", color: "#fff" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fafafaff",
    position: "absolute"
    
    
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
  modalName: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
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
  followed: { backgroundColor: "#aaa" },
  followText: { color: "#fff", fontWeight: "bold" },
  closeText: { color: "#2196F3", marginTop: 10 },
  recenterButton: {
    position: "absolute",
    bottom: 140,
    right: 16,
    backgroundColor: "#fff",
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
  },
  recenterText: { fontSize: 22, color: "#2196F3" },
});
