import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
} from "react-native";
import { addDoc } from "firebase/firestore";

const { width } = Dimensions.get("window");
import { MaterialIcons } from "@expo/vector-icons";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  getDocs,
  deleteDoc,
  increment,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { auth } from "../firebaseConfig";

import WhiteHeart from "../assets/tim.png";
import RedHeart from "../assets/redtim.png";
import Location from "../assets/location.png";
import Share from "../assets/share.png";

// Dynamic user list for stories - loaded from Profile following

// Component hiển thị user ngang
const UserCircle = ({ user, onPress }) => {
  const getActiveStatus = () => {
    const now = Date.now();
    const diffMinutes = Math.floor((now - user.lastActive) / 60000);

    if (diffMinutes < 3) {
      return { status: "active", text: "Đang hoạt động" };
    } else {
      return {
        status: "inactive",
        text: `Không hoạt động ${diffMinutes} phút`,
      };
    }
  };

  const activeStatus = getActiveStatus();

  const handlePress = () => {
    if (onPress) {
      onPress(user);
    }
  };

  return (
    <TouchableOpacity style={styles.userItem} onPress={handlePress}>
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
        <View
          style={[
            styles.postBadge,
            activeStatus.status === "active" && styles.activeBadge,
          ]}
        >
          <Text
            style={[
              styles.postCount,
              activeStatus.status === "active" && styles.activeText,
            ]}
          >
            {user.postCount}
          </Text>
        </View>
        {activeStatus.status === "active" && (
          <View style={styles.onlineIndicator} />
        )}
      </View>
      <Text style={styles.userName}>{user.name.split(" ")[0]}</Text>
      <Text
        style={[
          styles.activeStatus,
          activeStatus.status === "inactive" && styles.inactiveStatus,
        ]}
      >
        {activeStatus.status === "active" ? "●" : activeStatus.text}
      </Text>
    </TouchableOpacity>
  );
};

// Component hiển thị từng ảnh
const PhotoCard = ({ item, currentUserId }) => {
  const [liked, setLiked] = useState(
    item.likedBy?.includes(currentUserId) || false
  );
  const [likeCount, setLikeCount] = useState(item.likes || 0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [following, setFollowing] = useState(false);
  const [checkingFollow, setCheckingFollow] = useState(true);
  const latitude = item.location?.coordinates?.[1];
  const longitude = item.location?.coordinates?.[0];

  const scaleAnim = useState(new Animated.Value(1))[0];
  const isOwnPost = item.author?.id === currentUserId;
  const [commentCount, setCommentCount] = useState(0);
  const [commentAuthors, setCommentAuthors] = useState([]);

  // Update local state when item changes from Firebase
  useEffect(() => {
    setLiked(item.likedBy?.includes(currentUserId) || false);
    setLikeCount(item.likes || 0);
  }, [item.likes, item.likedBy, currentUserId]);

  // Check if already following this user
  useEffect(() => {
    const checkFollowing = async () => {
      if (isOwnPost || !currentUserId || !item.author?.id) {
        setCheckingFollow(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUserId));
        if (userDoc.exists()) {
          const followingList = userDoc.data()?.following || [];
          setFollowing(followingList.includes(item.author.id));
        }
      } catch (err) {
        console.error("Error checking follow status:", err);
      } finally {
        setCheckingFollow(false);
      }
    };

    checkFollowing();
  }, [item.author?.id, currentUserId, isOwnPost]);

  const toggleLike = async () => {
    const newLiked = !liked;
    const currentLikes = item.likes || 0;
    const previousLiked = liked;
    const previousLikeCount = likeCount;

    // Always update local state first for immediate UI feedback
    setLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    // Animation
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

    try {
      console.log("🔥 Home: Attempting to like post:", item.id);
      const postRef = doc(db, "posts", item.id);

      // Check if document exists first
      const docSnap = await getDoc(postRef);
      if (!docSnap.exists()) {
        console.log(
          "🔥 Home: Post document does not exist, using local state only:",
          item.id
        );
        return;
      }

      if (currentUserId) {
        if (newLiked) {
          // Add like to post
          await updateDoc(postRef, {
            likes: currentLikes + 1,
            likedBy: arrayUnion(currentUserId),
          });
          console.log("🔥 Home: Added like to post:", item.id);

          // Add post to user's likedPosts and increment likeCount
          const userRef = doc(db, "users", currentUserId);
          await updateDoc(userRef, {
            likedPosts: arrayUnion(item.id),
            likeCount: increment(1),
          });
          console.log("🔥 Home: Added post to user likedPosts:", item.id);
          console.log("✅ Home: Like saved successfully to Firebase");
        } else {
          // Remove like from post
          await updateDoc(postRef, {
            likes: Math.max(0, currentLikes - 1),
            likedBy: arrayRemove(currentUserId),
          });
          console.log("🔥 Home: Removed like from post:", item.id);

          // Remove post from user's likedPosts and decrement likeCount
          const userRef = doc(db, "users", currentUserId);
          await updateDoc(userRef, {
            likedPosts: arrayRemove(item.id),
            likeCount: increment(-1),
          });
          console.log("🔥 Home: Removed post from user likedPosts:", item.id);
          console.log("✅ Home: Unlike saved successfully to Firebase");
        }
      } else {
        console.log("🔥 Home: No currentUserId, skipping Firebase update");
      }
    } catch (error) {
      console.error("❌ Error toggling like:", error);
      // Rollback local state on error
      setLiked(previousLiked);
      setLikeCount(previousLikeCount);
      Alert.alert("Lỗi", "Không thể cập nhật like. Vui lòng thử lại.");
    }
  };
  // modal cmt real time
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "posts", item.id, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setComments(data);
      setCommentCount(data.length);

      // Lấy tên người bình luận (không trùng lặp)
      const names = [...new Set(data.map((c) => c.authorName))];
      setCommentAuthors(names);
    });

    return () => unsubscribe();
  }, []);

  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, "posts", item.id, "comments"), {
        text: newComment,
        authorId: currentUserId,
        authorName: auth.currentUser.displayName || "Ẩn danh",
        createdAt: new Date(),
      });
      setNewComment("");
    } catch (err) {
      console.error("Lỗi gửi bình luận:", err);
      Alert.alert("Lỗi", "Không thể gửi bình luận");
    }
  };

  const handleDeletePost = async () => {
    Alert.alert(
      "Xóa bài viết",
      "Bạn có chắc muốn xóa bài viết này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const postRef = doc(db, "posts", item.id);
              await deleteDoc(postRef);
              console.log("🔥 Home: Deleted post:", item.id);
            } catch (error) {
              console.error("Error deleting post:", error);
              Alert.alert("Lỗi", "Không thể xóa bài viết");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const toggleFollow = async () => {
    if (isOwnPost || !item.author?.id || !currentUserId) return;

    const newFollowing = !following;
    setFollowing(newFollowing);

    try {
      const userRef = doc(db, "users", currentUserId);
      const authorRef = doc(db, "users", item.author.id);

      if (newFollowing) {
        await updateDoc(userRef, {
          following: arrayUnion(item.author.id),
        });
        await updateDoc(authorRef, {
          followers: increment(1),
        });
        console.log("✅ Home: Followed user:", item.author.id);
      } else {
        await updateDoc(userRef, {
          following: arrayRemove(item.author.id),
        });
        await updateDoc(authorRef, {
          followers: increment(-1),
        });
        console.log("✅ Home: Unfollowed user:", item.author.id);
      }
    } catch (error) {
      console.error("❌ Error toggling follow:", error);
      setFollowing(!newFollowing);
      Alert.alert("Lỗi", "Không thể cập nhật theo dõi");
    }
  };

  const copyToClipboard = () => {
    alert("Đã sao chép liên kết: " + item.image);
    setShowShareModal(false);
  };

  const shareToFriends = () => {
    // TODO: Implement sharing to friends within the app
    alert("Tính năng chia sẻ với bạn bè sẽ được phát triển sau");
    setShowShareModal(false);
  };

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <View style={styles.authorRow}>
          <Image
            source={{
              uri:
                item.author?.avatar ||
                "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
            }}
            style={styles.avatar}
            defaultSource={require("../assets/favicon.png")}
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>
              {item.author?.name || "Người dùng"}
            </Text>
            {!isOwnPost && !checkingFollow && (
              <TouchableOpacity
                style={[
                  styles.followButton,
                  following && styles.followingButton,
                ]}
                onPress={toggleFollow}
              >
                <Text
                  style={[styles.followText, following && styles.followingText]}
                >
                  {following ? "✓ Đang theo dõi" : "+ Theo dõi"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Image
          source={{
            uri:
              item.image || "https://via.placeholder.com/300x300?text=No+Image",
          }}
          style={styles.image}
        />
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

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowCommentModal(true)}>
  <Text style={{ fontSize: 21 }}>💬</Text>
  <Text style={styles.count}>{commentCount}</Text>
</TouchableOpacity>


          {/* <TouchableOpacity style={styles.actionButton} onPress={() => setShowLocationModal(true)}>
             <Image source={Location} style={styles.iconImage} resizeMode="contain" />
             <Text style={styles.count}>{item.maps || 0}</Text>
           </TouchableOpacity> */}

          {isOwnPost && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeletePost}
            >
              <MaterialIcons name="delete" size={20} color="white" />
              <Text style={styles.buttonText}>Xóa</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal CMT */}
      <Modal visible={showCommentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: "80%", width: "90%" }]}>
            <Text style={styles.modalTitle}>Bình luận</Text>

            <ScrollView style={{ width: "100%", marginBottom: 10 }}>
              {comments.length === 0 ? (
                <Text
                  style={{ color: "#666", textAlign: "center", marginTop: 10 }}
                >
                  Chưa có bình luận nào. Hãy là người đầu tiên!
                </Text>
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={{ marginBottom: 12 }}>
                    <Text style={{ fontWeight: "600", color: "#2196F3" }}>
                      {c.authorName}
                    </Text>
                    <Text style={{ color: "#333", marginBottom: 2 }}>
                      {c.text}
                    </Text>
                    {c.createdAt?.seconds && (
                      <Text style={{ fontSize: 11, color: "#999" }}>
                        {new Date(c.createdAt.seconds * 1000).toLocaleString()}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Viết bình luận..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />

            <TouchableOpacity
              style={[styles.copyButton, { marginTop: 10 }]}
              onPress={handleSendComment}
            >
              <Text style={styles.copyButtonText}>Gửi</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowCommentModal(false)}>
              <Text style={styles.modalClose}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Bản đồ */}
      {/* <Modal visible={showLocationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.mapModalBox}>
            <Text style={styles.modalTitle}>Vị trí Check-in</Text>
            <Text style={styles.locationCaption}>{item.title}</Text>

            <View style={styles.mapPlaceholder}>
  {latitude && longitude ? (
    <>
      <Text style={styles.mapText}>🗺️</Text>
      <Text style={styles.mapLabel}>Vị trí ảnh chụp:</Text>
      <Text style={styles.mapCoords}>
        {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
      </Text>
    </>
  ) : (
    <Text style={{ color: "#666", textAlign: "center" }}>
      Không có thông tin vị trí cho ảnh này
    </Text>
  )}
</View>


            <TouchableOpacity style={styles.openMapButton}>
              <Text style={styles.openMapButtonText}>Mở trong Google Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <Text style={styles.modalClose}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal> */}
    </View>
  );
};

// Màn hình chính
export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userList, setUserList] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    // Get current user
    const user = auth.currentUser;
    if (user) {
      setCurrentUserId(user.uid);
    }

    // Listen to posts from Firebase
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData = [];
      querySnapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() });
      });

      // Filter posts based on followed users
      if (currentUserId) {
        const filteredPosts = postsData.filter(
          (post) =>
            post.author?.id === currentUserId || // Show own posts
            userList.some((user) => user.id === post.author?.id) // Show posts from followed users
        );
        console.log(
          "🔥 Home: Filtered posts for feed:",
          filteredPosts.length,
          "from",
          postsData.length,
          "total"
        );
        console.log("🔥 Home: Current user ID:", currentUserId);
        console.log(
          "🔥 Home: Sample post authors:",
          postsData.slice(0, 3).map((p) => p.author?.id)
        );
        setPosts(filteredPosts);
      } else {
        // If no current user, show all posts (for demo purposes)
        setPosts(postsData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load friends from Profile following list
  useEffect(() => {
    if (!currentUserId) return;

    const loadFriends = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUserId));
        if (userDoc.exists()) {
          const followingList = userDoc.data()?.following || [];
          if (followingList.length > 0) {
            const friendDocs = await Promise.all(
              followingList.map((id) => getDoc(doc(db, "users", id)))
            );

            const friendsData = friendDocs
              .filter((doc) => doc.exists())
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
                lastActive: doc.data()?.lastActive || Date.now() - 300000, // Default to 5 min ago
                postCount: doc.data()?.postCount || 0,
              }));

            setUserList(friendsData);
            console.log(
              "🔥 Home: Loaded friends for stories:",
              friendsData.length
            );
          } else {
            setUserList([]);
          }
        }
      } catch (error) {
        console.error("Error loading friends:", error);
        setUserList([]);
      }
    };

    loadFriends();
  }, [currentUserId]);

  // User Profile Modal Component
  const UserProfileModal = () => {
    if (!selectedUser) return null;

    const [userPosts, setUserPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [following, setFollowing] = useState(false);
    const [checkingFollow, setCheckingFollow] = useState(true);

    useEffect(() => {
      const checkFollowing = async () => {
        if (!currentUserId || !selectedUser.id) {
          setCheckingFollow(false);
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, "users", currentUserId));
          if (userDoc.exists()) {
            const followingList = userDoc.data()?.following || [];
            setFollowing(followingList.includes(selectedUser.id));
          }
        } catch (err) {
          console.error("Error checking follow status:", err);
        } finally {
          setCheckingFollow(false);
        }
      };

      checkFollowing();
    }, [selectedUser.id, currentUserId]);

    useEffect(() => {
      const loadPosts = async () => {
        try {
          setLoadingPosts(true);
          const q = query(
            collection(db, "posts"),
            orderBy("createdAt", "desc")
          );
          const snapshot = await getDocs(q);
          const allPosts = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          const filtered = allPosts.filter(
            (post) => post.author?.id === selectedUser.id
          );
          setUserPosts(filtered);
        } catch (err) {
          console.error("Error loading user posts:", err);
        } finally {
          setLoadingPosts(false);
        }
      };

      loadPosts();
    }, [selectedUser.id]);

    const handleToggleFollow = async () => {
      if (!selectedUser.id || !currentUserId) return;

      const newFollowing = !following;
      setFollowing(newFollowing);

      try {
        const userRef = doc(db, "users", currentUserId);
        const authorRef = doc(db, "users", selectedUser.id);

        if (newFollowing) {
          await updateDoc(userRef, {
            following: arrayUnion(selectedUser.id),
          });
          await updateDoc(authorRef, {
            followers: increment(1),
          });
        } else {
          await updateDoc(userRef, {
            following: arrayRemove(selectedUser.id),
          });
          await updateDoc(authorRef, {
            followers: increment(-1),
          });
        }
      } catch (error) {
        console.error("Error toggling follow:", error);
        setFollowing(!newFollowing);
        Alert.alert("Lỗi", "Không thể cập nhật theo dõi");
      }
    };

    return (
      <Modal visible={showUserModal} transparent animationType="slide">
        <View style={styles.userModalOverlay}>
          <View style={styles.userModalContent}>
            <TouchableOpacity
              style={styles.userModalClose}
              onPress={() => setShowUserModal(false)}
            >
              <Text style={styles.userModalCloseText}>✕</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.userModalHeader}>
                <Image
                  source={{
                    uri:
                      selectedUser.avatar ||
                      "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
                  }}
                  style={styles.userModalAvatar}
                />
                <Text style={styles.userModalName}>
                  {selectedUser.name || "Người dùng"}
                </Text>
                <Text style={styles.userModalBio}>
                  {selectedUser.bio || "Chưa có tiểu sử"}
                </Text>
              </View>

              {/* Stats */}
              <View style={styles.userModalStats}>
                <View style={styles.userModalStatItem}>
                  <Text style={styles.userModalStatNumber}>
                    {userPosts.length}
                  </Text>
                  <Text style={styles.userModalStatLabel}>Bài đăng</Text>
                </View>
                <View style={styles.userModalStatItem}>
                  <Text style={styles.userModalStatNumber}>
                    {selectedUser.followers || 0}
                  </Text>
                  <Text style={styles.userModalStatLabel}>Người theo dõi</Text>
                </View>
                <View style={styles.userModalStatItem}>
                  <Text style={styles.userModalStatNumber}>
                    {selectedUser.likeCount || 0}
                  </Text>
                  <Text style={styles.userModalStatLabel}>Đã thả tim</Text>
                </View>
              </View>

              {/* Follow Button */}
              {!checkingFollow && (
                <TouchableOpacity
                  style={[
                    styles.userModalFollowBtn,
                    following && styles.userModalFollowingBtn,
                  ]}
                  onPress={handleToggleFollow}
                >
                  <Text
                    style={[
                      styles.userModalFollowText,
                      following && styles.userModalFollowingText,
                    ]}
                  >
                    {following ? "✓ Đang theo dõi" : "+ Theo dõi"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Posts Grid */}
              <Text style={styles.userModalSectionTitle}>Bài đăng</Text>
              {loadingPosts ? (
                <ActivityIndicator
                  size="large"
                  color="#2196F3"
                  style={{ marginTop: 20 }}
                />
              ) : userPosts.length > 0 ? (
                <View style={styles.userModalPostsGrid}>
                  {userPosts.map((post) => (
                    <Image
                      key={post.id}
                      source={{
                        uri: post.image || "https://via.placeholder.com/150",
                      }}
                      style={styles.userModalPostImage}
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.userModalEmptyText}>Chưa có bài đăng</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 10 }}>Loading posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Here You</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.userScroll}
      >
        {userList.map((user) => (
          <UserCircle
            key={user.id}
            user={user}
            onPress={(user) => {
              setSelectedUser(user);
              setShowUserModal(true);
            }}
          />
        ))}
      </ScrollView>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PhotoCard item={item} currentUserId={currentUserId} />
        )}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ padding: 10, alignItems: "center" }}>
            <Text style={{ color: "#666" }}>Chưa có bài đăng nào</Text>
          </View>
        }
      />

      <UserProfileModal />
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
    fontSize: 25,
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 10,
    color: "#FF6F61", // màu cam hồng nổi bật
    fontStyle: "italic",
    fontFamily: "serif", // hoặc dùng font tuỳ chỉnh như 'DancingScript'
    letterSpacing: 1.2,
    textShadowColor: "#fdd",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  userScroll: {
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  userItem: {
    alignItems: "center",
    marginRight: 2,
  },
  avatarWrapper: {
    position: "relative",
    borderWidth: 2,
    borderColor: "#f08c0aff",
    borderRadius: 40,
    padding: 2,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 30,
  },
  postBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,

    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  activeBadge: {
    backgroundColor: "#4CAF50",
  },
  postCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  activeText: {
    color: "#fff",
  },
  onlineIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
  },
  activeStatus: {
    fontSize: 8,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  inactiveStatus: {
    color: "#666",
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
  authorInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  followButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  followingButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  followText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  followingText: {
    color: "#2196F3",
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
    height: 30,
    marginBottom: 1,
  },
  iconImage: {
    width: 24,
    height: 24,
    marginBottom: 2,
  },
  count: {
    fontSize: 12,
    color: "#555"
    
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

  // User Profile Modal Styles
  userModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  userModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  userModalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  userModalCloseText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  userModalHeader: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userModalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#2196F3",
    marginBottom: 12,
  },
  userModalName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  userModalBio: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  userModalStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
    marginHorizontal: 20,
  },
  userModalStatItem: {
    alignItems: "center",
  },
  userModalStatNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  userModalStatLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  userModalFollowBtn: {
    backgroundColor: "#2196F3",
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
  },
  userModalFollowingBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  userModalFollowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  userModalFollowingText: {
    color: "#2196F3",
  },
  userModalSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  userModalPostsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 18,
  },
  userModalPostImage: {
    width: (width - 48) / 3,
    height: (width - 48) / 3,
    margin: 2,
    borderRadius: 8,
  },
  userModalEmptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 15,
    marginTop: 20,
    marginBottom: 40,
  },
});
