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
} from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove, getDoc, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { auth } from "../firebaseConfig";

import WhiteHeart from "../assets/tim.png";
import RedHeart from "../assets/redtim.png";
import Location from "../assets/location.png";
import Share from "../assets/share.png";

// Dynamic user list for stories - loaded from Profile following

// Component hiển thị user ngang
const UserCircle = ({ user, navigation }) => {
  const getActiveStatus = () => {
    const now = Date.now();
    const diffMinutes = Math.floor((now - user.lastActive) / 60000);

    if (diffMinutes < 3) {
      return { status: 'active', text: 'Đang hoạt động' };
    } else {
      return { status: 'inactive', text: `Không hoạt động ${diffMinutes} phút` };
    }
  };

  const activeStatus = getActiveStatus();

  const handlePress = () => {
    // Navigate to user's profile
    if (navigation) {
      console.log('Navigate to user profile:', user.id);
      navigation.navigate('Profile', { userId: user.id, userName: user.name });
    }
  };

  return (
    <TouchableOpacity style={styles.userItem} onPress={handlePress}>
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
        <View style={[styles.postBadge, activeStatus.status === 'active' && styles.activeBadge]}>
          <Text style={[styles.postCount, activeStatus.status === 'active' && styles.activeText]}>
            {user.postCount}
          </Text>
        </View>
        {activeStatus.status === 'active' && <View style={styles.onlineIndicator} />}
      </View>
      <Text style={styles.userName}>{user.name.split(" ")[0]}</Text>
      <Text style={[styles.activeStatus, activeStatus.status === 'inactive' && styles.inactiveStatus]}>
        {activeStatus.status === 'active' ? '●' : activeStatus.text}
      </Text>
    </TouchableOpacity>
  );
};

// Component hiển thị từng ảnh
const PhotoCard = ({ item, currentUserId }) => {
  const [liked, setLiked] = useState(item.likedBy?.includes(currentUserId) || false);
  const [likeCount, setLikeCount] = useState(item.likes || 0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [following, setFollowing] = useState(false); // TODO: Check from Firebase

  const scaleAnim = useState(new Animated.Value(1))[0];
  const isOwnPost = item.author?.id === currentUserId;

  const toggleLike = async () => {
    const newLiked = !liked;
    const currentLikes = item.likes || 0;

    // Always update local state first for immediate UI feedback
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

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
      console.log('🔥 Home: Attempting to like post:', item.id);
      const postRef = doc(db, 'posts', item.id);

      // Check if document exists first
      const docSnap = await getDoc(postRef);
      if (!docSnap.exists()) {
        console.log('🔥 Home: Post document does not exist, using local state only:', item.id);
        return;
      }

      if (currentUserId) {
        if (newLiked) {
          // Add like
          await updateDoc(postRef, {
            likes: currentLikes + 1,
            likedBy: arrayUnion(currentUserId)
          });
          console.log('🔥 Home: Added like to post:', item.id);
        } else {
          // Remove like
          await updateDoc(postRef, {
            likes: Math.max(0, currentLikes - 1),
            likedBy: arrayRemove(currentUserId)
          });
          console.log('🔥 Home: Removed like from post:', item.id);
        }
      } else {
        console.log('🔥 Home: No currentUserId, skipping Firebase update');
      }

    } catch (error) {
      console.error('Error toggling like:', error);
      // Local state already updated, so UI remains responsive
    }
  };

  const handleDeletePost = async () => {
    Alert.alert(
      'Xóa bài viết',
      'Bạn có chắc muốn xóa bài viết này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const postRef = doc(db, 'posts', item.id);
              await deleteDoc(postRef);
              console.log('🔥 Home: Deleted post:', item.id);
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Lỗi', 'Không thể xóa bài viết');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const toggleFollow = async () => {
    try {
      // TODO: Implement follow/unfollow logic with Firebase
      setFollowing(!following);
    } catch (error) {
      console.error('Error toggling follow:', error);
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
          <Image source={{ uri: item.author?.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }} style={styles.avatar} defaultSource={require('../assets/favicon.png')} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{item.author?.name || 'Người dùng'}</Text>
            <TouchableOpacity
              style={[styles.followButton, following && styles.followingButton]}
              onPress={toggleFollow}
            >
              <Text style={[styles.followText, following && styles.followingText]}>
                {following ? '✓ Đang theo dõi' : '+ Theo dõi'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Image source={{ uri: item.image || 'https://via.placeholder.com/300x300?text=No+Image' }} style={styles.image} />
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
             <Text style={styles.count}>{item.shares || 0}</Text>
           </TouchableOpacity>

           <TouchableOpacity style={styles.actionButton} onPress={() => setShowLocationModal(true)}>
             <Image source={Location} style={styles.iconImage} resizeMode="contain" />
             <Text style={styles.count}>{item.maps || 0}</Text>
           </TouchableOpacity>

           {isOwnPost && (
             <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeletePost}>
               <MaterialIcons name="delete" size={20} color="white" />
               <Text style={styles.buttonText}>Xóa</Text>
             </TouchableOpacity>
           )}
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
              <TouchableOpacity style={styles.shareOptionBtn} onPress={shareToFriends}>
                <Text style={styles.shareIcon}>👥</Text>
                <Text style={styles.shareLabel}>Bạn bè</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareOptionBtn}>
                <Text style={styles.shareIcon}>📘</Text>
                <Text style={styles.shareLabel}>Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareOptionBtn}>
                <Text style={styles.shareIcon}>📸</Text>
                <Text style={styles.shareLabel}>Instagram</Text>
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
export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userList, setUserList] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    // Get current user
    const user = auth.currentUser;
    if (user) {
      setCurrentUserId(user.uid);
    }

    // Listen to posts from Firebase
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData = [];
      querySnapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() });
      });

      // Filter posts based on followed users
      if (currentUserId) {
        const filteredPosts = postsData.filter(post =>
          post.author?.id === currentUserId || // Show own posts
          userList.some(user => user.id === post.author?.id) // Show posts from followed users
        );
        console.log('🔥 Home: Filtered posts for feed:', filteredPosts.length, 'from', postsData.length, 'total');
        console.log('🔥 Home: Current user ID:', currentUserId);
        console.log('🔥 Home: Sample post authors:', postsData.slice(0, 3).map(p => p.author?.id));
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
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        if (userDoc.exists()) {
          const followingList = userDoc.data()?.following || [];
          if (followingList.length > 0) {
            const friendDocs = await Promise.all(
              followingList.map(id => getDoc(doc(db, 'users', id)))
            );

            const friendsData = friendDocs
              .filter(doc => doc.exists())
              .map(doc => ({
                id: doc.id,
                ...doc.data(),
                lastActive: doc.data()?.lastActive || Date.now() - 300000, // Default to 5 min ago
                postCount: doc.data()?.postCount || 0
              }));

            setUserList(friendsData);
            console.log('🔥 Home: Loaded friends for stories:', friendsData.length);
          } else {
            setUserList([]);
          }
        }
      } catch (error) {
        console.error('Error loading friends:', error);
        setUserList([]);
      }
    };

    loadFriends();
  }, [currentUserId]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 10 }}>Loading posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📸 CheckinPhoto</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userScroll}>
        {userList.map((user) => (
          <UserCircle key={user.id} user={user} navigation={navigation} />
        ))}
      </ScrollView>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PhotoCard item={item} currentUserId={currentUserId} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>Chưa có bài đăng nào</Text>
          </View>
        }
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