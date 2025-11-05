import React, { useState, useEffect, useRef } from "react";
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const { width } = Dimensions.get("window");

export default function ProfileScreen() {
  const [tab, setTab] = useState("posts");
  const [showSettings, setShowSettings] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [friends, setFriends] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // { userId: count }
  const flatListRef = useRef(null);

  const currentUid = auth.currentUser?.uid;

  // Lấy thông tin người dùng
  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchProfile();
      } else {
        setProfile(null);
        setFriends([]);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Cập nhật vị trí
  useEffect(() => {
    const getLocationAndUpdate = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({});
        const user = auth.currentUser;
        if (user && profile) {
          await updateDoc(doc(db, "users", user.uid), {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            location: `Lat: ${loc.coords.latitude.toFixed(4)}, Lng: ${loc.coords.longitude.toFixed(4)}`,
          });
        }
      } catch (error) {
        console.error("Lỗi lấy vị trí:", error);
      }
    };
    if (profile) getLocationAndUpdate();
  }, [profile]);

  // Chọn ảnh đại diện
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

  // Lưu chỉnh sửa hồ sơ
  const handleSaveProfile = async (newData) => {
    try {
      setUpdating(true);
      const user = auth.currentUser;
      if (!user) return;

      let avatarUrl = profile.avatar;
      if (newData.newAvatarUri) {
        const storage = getStorage();
        const fileName = `avatars/${user.uid}_${Date.now()}.jpg`;
        const imageRef = ref(storage, fileName);
        const response = await fetch(newData.newAvatarUri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        avatarUrl = await getDownloadURL(imageRef);
      }

      await updateDoc(doc(db, "users", user.uid), {
        name: newData.name || "",
        bio: newData.bio || "",
        avatar: avatarUrl,
        updatedAt: new Date(),
      });

      setProfile((prev) => ({
        ...prev,
        name: newData.name,
        bio: newData.bio,
        avatar: avatarUrl,
      }));

      Alert.alert("Thành công", "Hồ sơ đã được cập nhật!");
      setShowEdit(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      Alert.alert("Lỗi", "Không thể lưu thay đổi: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Lấy danh sách bạn bè + theo dõi tin nhắn mới (realtime)
  useEffect(() => {
    if (!profile || !currentUid || tab !== "friends") {
      setFriends([]);
      return;
    }

    const fetchFriends = async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUid));
        if (!snap.exists()) return;

        const followingList = snap.data()?.following || [];
        if (!Array.isArray(followingList) || followingList.length === 0) {
          setFriends([]);
          return;
        }

        const friendDocs = await Promise.all(
          followingList.map((id) => getDoc(doc(db, "users", id)))
        );

        const list = friendDocs
          .filter((d) => d.exists())
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(user => user.id); // Ensure user has valid ID

        setFriends(list);
      } catch (err) {
        console.error("Lỗi tải danh sách bạn bè:", err);
        setFriends([]);
      }
    };

    fetchFriends();

    // Theo dõi tất cả các chat có currentUser
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const counts = {};

      snapshot.docs.forEach((chatDoc) => {
        const data = chatDoc.data();
        const otherUserId = data.participants.find((id) => id !== currentUid);
        if (!otherUserId) return;

        // Tìm tin nhắn chưa đọc (người khác gửi, chưa được đánh dấu)
        const lastRead = data.lastRead?.[currentUid] || 0;
        const lastMessageTime = data.lastMessageTime?.toMillis() || 0;

        if (lastMessageTime > lastRead && data.lastMessageSender !== currentUid) {
          counts[otherUserId] = (counts[otherUserId] || 0) + 1;
        }
      });

      setUnreadCounts(counts);

      // Sắp xếp lại danh sách bạn bè: người có tin nhắn mới lên đầu
      setFriends((prev) => {
        const sorted = [...prev].sort((a, b) => {
          const countA = counts[a.id] || 0;
          const countB = counts[b.id] || 0;
          return countB - countA;
        });
        return sorted;
      });
    });

    return () => unsub();
  }, [profile, tab, currentUid]);

  // Gửi tin nhắn
  const sendMessage = async () => {
    if (!chatUser || !input.trim()) return;
    const currentUid = auth.currentUser.uid;
    let cid = chatId;

    if (!cid) {
      const q = query(
        collection(db, "chats"),
        where("participants", "in", [
          [currentUid, chatUser.id],
          [chatUser.id, currentUid],
        ])
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        cid = snap.docs[0].id;
      } else {
        const newRef = doc(collection(db, "chats"));
        await setDoc(newRef, {
          participants: [currentUid, chatUser.id],
          createdAt: serverTimestamp(),
          lastRead: { [currentUid]: serverTimestamp(), [chatUser.id]: serverTimestamp() },
        });
        cid = newRef.id;
      }
      setChatId(cid);
    }

    const msgRef = collection(db, "chats", cid, "messages");
    await addDoc(msgRef, {
      senderId: currentUid,
      text: input,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "chats", cid), {
      lastMessage: input,
      lastMessageTime: serverTimestamp(),
      lastMessageSender: currentUid,
      [`lastRead.${currentUid}`]: serverTimestamp(),
    });

    setInput("");
  };

  // Lắng nghe tin nhắn trong chat hiện tại
  useEffect(() => {
    if (!chatUser || !currentUid) return;

    let unsub = () => {};

    const loadChat = async () => {
      const q = query(
        collection(db, "chats"),
        where("participants", "in", [
          [currentUid, chatUser.id],
          [chatUser.id, currentUid],
        ])
      );
      const snap = await getDocs(q);
      let cid;
      if (!snap.empty) {
        cid = snap.docs[0].id;
      } else {
        const newRef = doc(collection(db, "chats"));
        await setDoc(newRef, {
          participants: [currentUid, chatUser.id],
          createdAt: serverTimestamp(),
          lastRead: { [currentUid]: serverTimestamp(), [chatUser.id]: serverTimestamp() },
        });
        cid = newRef.id;
      }
      setChatId(cid);

      // Đánh dấu đã đọc khi mở chat
      await updateDoc(doc(db, "chats", cid), {
        [`lastRead.${currentUid}`]: serverTimestamp(),
      });

      const msgRef = collection(db, "chats", cid, "messages");
      const qq = query(msgRef, orderBy("createdAt", "asc"));
      unsub = onSnapshot(qq, (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });
    };

    loadChat();

    return () => {
      unsub();
      setMessages([]);
      setChatId(null);
    };
  }, [chatUser, currentUid]);

  // Loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 12, color: "#555" }}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Không tìm thấy hồ sơ người dùng.</Text>
      </View>
    );
  }

  const Header = () => (
    <View style={styles.headerContainer}>
      <View style={styles.topBar}>
        <Text style={styles.headerUsername}>{profile.username || "@user"}</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowEdit(true)}>
          <Image
            source={{
              uri: profile.avatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
            }}
            style={styles.avatar}
          />
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{profile.name || "Người dùng mới"}</Text>
          <Text style={styles.bio}>{profile.bio || "Chưa có tiểu sử"}</Text>
          <Text style={styles.location}>
            Location: {profile.location || "Đang xác định vị trí..."}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile.postCount || 0}</Text>
          <Text>Bài đăng</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile.followers || 0}</Text>
          <Text>Người theo dõi</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile.likeCount || 0}</Text>
          <Text>Đã thả tim</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {[
          { id: "posts", label: "Bài đăng" },
          { id: "friends", label: "Bạn bè" },
          { id: "liked", label: "Đã thả tim" },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabButton, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const EditProfileModal = () => {
    const [name, setName] = useState(profile.name || "");
    const [bio, setBio] = useState(profile.bio || "");
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
              <Text style={{ textAlign: "center", color: "#2196F3", marginTop: 8 }}>
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
                onPress={() => handleSaveProfile({ name, bio, newAvatarUri })}
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

  const renderTabContent = () => {
    if (tab === "friends") {
      if (!Array.isArray(friends)) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Đang tải...</Text>
          </View>
        );
      }

      return friends.length > 0 ? (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.friendsListContainer}
          renderItem={({ item }) => {
            const unread = unreadCounts[item.id] || 0;
            return (
              <View style={styles.friendItem}>
                <View style={styles.friendInfo}>
                  <Image
                    source={{
                      uri: item.avatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
                    }}
                    style={styles.friendAvatar}
                  />
                  <View style={styles.friendTextContainer}>
                    <Text style={styles.friendName}>{item.name || "Ẩn danh"}</Text>
                    <Text style={styles.friendBio}>
                      {item.bio || "Chưa có mô tả..."}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.messageBtn}
                    onPress={() => setChatUser(item)}
                  >
                    <Text style={styles.messageIcon}>💬</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Bạn chưa theo dõi ai</Text>
        </View>
      );
    }

    if (tab === "posts") {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có bài đăng</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Chưa thả tim bài nào</Text>
      </View>
    );
  };

  return (
    <>
      <FlatList
        ListHeaderComponent={<Header />}
        ListFooterComponent={renderTabContent}
        data={[]}
        renderItem={null}
        keyExtractor={() => "dummy"}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: "#f2f9ff" }}
      />

      <EditProfileModal />

      {/* CHAT MODAL */}
      <Modal visible={!!chatUser} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f9ff" }}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Chat với {chatUser?.name}</Text>
            <TouchableOpacity
              style={styles.closeChatBtn}
              onPress={() => {
                setChatUser(null);
                setMessages([]);
                setChatId(null);
                setInput("");
              }}
            >
              <Text style={styles.closeChatText}>Đóng</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageBubble,
                  item.senderId === currentUid ? styles.myMessage : styles.theirMessage,
                ]}
              >
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            )}
            contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={80}
          >
            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Nhập tin nhắn..."
                value={input}
                onChangeText={setInput}
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                <Text style={styles.sendText}>Gửi</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* SETTINGS MODAL */}
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
    </>
  );
}

// ==================== STYLES ====================
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
    marginTop: 20,
  },
  headerUsername: { fontSize: 18, fontWeight: "600" },
  menuIcon: { fontSize: 26, color: "#2196F3" },

  header: { flexDirection: "row", padding: 16, alignItems: "center" },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#2196F3",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  profileInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: "bold", color: "#222" },
  bio: { fontSize: 14, color: "#555", marginTop: 4 },
  location: { fontSize: 14, color: "#888", marginTop: 2 },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "bold", color: "#333" },

  tabRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#e3f2fd",
    paddingVertical: 8,
    borderRadius: 10,
    marginHorizontal: 16,
  },
  tabButton: { flex: 1, alignItems: "center", paddingVertical: 6 },
  tabActive: { backgroundColor: "#2196F3", borderRadius: 8 },
  tabText: { fontSize: 14, color: "#555" },
  tabTextActive: { color: "#fff", fontWeight: "bold" },

  friendsListContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexGrow: 1,
  },
  friendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    marginVertical: 8,
    padding: 14,
    borderRadius: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  friendInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  friendAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 14 },
  friendTextContainer: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: "600", color: "#222" },
  friendBio: { fontSize: 13, color: "#777", marginTop: 2 },
  messageBtn: {
    padding: 10,
    backgroundColor: "#2196F3",
    borderRadius: 50,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  messageIcon: { fontSize: 18, color: "#fff" },

  badge: {
    backgroundColor: "#e74c3c",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginRight: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  settingsPanel: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    width: "82%",
    alignItems: "center",
  },
  settingsTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  settingsItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    width: "100%",
    alignItems: "center",
  },
  logoutText: { color: "#e74c3c", fontWeight: "600", fontSize: 16 },
  closeButton: { marginTop: 16 },
  closeText: { color: "#2196F3", fontWeight: "600" },

  editBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    width: "88%",
    alignItems: "center",
  },
  editAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    fontSize: 15,
    width: "100%",
    backgroundColor: "#fafafa",
  },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#222",
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    width: "100%",
  },
  saveBtn: { color: "#2196F3", fontWeight: "600", fontSize: 16 },
  cancelBtn: { color: "#888", fontSize: 16 },

  chatHeader: {
    backgroundColor: "#2196F3",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatTitle: { color: "#fff", fontWeight: "bold", fontSize: 17 },
  closeChatBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  closeChatText: { color: "#2196F3", fontWeight: "bold", fontSize: 15 },
  messageBubble: {
    maxWidth: "72%",
    padding: 11,
    marginVertical: 5,
    borderRadius: 16,
  },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#DCF8C6" },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  messageText: { fontSize: 15, color: "#333" },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#f9f9f9",
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 22,
  },
  sendText: { color: "#fff", fontWeight: "bold" },
});