import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Linking,
} from "react-native";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ID } from "react-native-appwrite";
import { AppwriteClientFactory } from "../appwrite.config";

// helper to prepare native file objects for Appwrite (same pattern as CameraScreenV2)
const prepareNativeFile = async (uri, filename = `avatar_${Date.now()}.jpg`) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return {
      name: filename,
      size: fileInfo.size || 0,
      type: 'image/jpeg',
      uri,
    };
  } catch (err) {
    console.error('prepareNativeFile error', err);
    throw err;
  }
};

export default function EditProfileScreen({ navigation }) {
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [gender, setGender] = useState('Không có');
  const [birthday, setBirthday] = useState('../../....');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [interests, setInterests] = useState([]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [showMaritalModal, setShowMaritalModal] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [tempAvatarUri, setTempAvatarUri] = useState(null); // preview before upload

  const maritalOptions = [
    'Độc thân',
    'Hẹn hò',
    'Đã kết hôn',
    'Ly thân',
    'Ly hôn',
    'Góa',
    'Khác'
  ];

  const interestOptions = [
    'Thể thao', 'Âm nhạc', 'Du lịch', 'Đọc sách', 
    'Nấu ăn', 'Công nghệ', 'Thời trang', 'Nhiếp ảnh',
    'Yoga', 'Gaming', 'Nghệ thuật', 'Học ngoại ngữ'
  ];
  
  const formatBirthday = (text) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return numbers.slice(0, 2) + '/' + numbers.slice(2);
    return numbers.slice(0, 2) + '/' + numbers.slice(2, 4) + '/' + numbers.slice(4, 8);
  };

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
          const userData = snap.data();
          setProfile(userData);
          // Initialize all profile fields with existing data or defaults
          setGender(userData.gender || 'Không có');
          setBirthday(userData.birthday || '../../....');
          setMaritalStatus(userData.maritalStatus || '');
          setHeight(userData.height || '');
          setWeight(userData.weight || '');
          setInterests(Array.isArray(userData.interests) ? userData.interests : []);
        } else {
          setProfile(null);
          // Reset all fields to defaults if no profile exists
          setGender('Không có');
          setBirthday('../../....');
          setMaritalStatus('');
          setHeight('');
          setWeight('');
          setInterests([]);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
        try {
          const storage = AppwriteClientFactory.getInstance().storage;
          const file = await prepareNativeFile(newData.newAvatarUri, 'avatar_' + user.uid + '_' + Date.now() + '.jpg');
          const res = await storage.createFile(
            process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
            ID.unique(),
            file
          );

          // Build the file view URL directly using the Appwrite endpoint and file ID
          const client = AppwriteClientFactory.getInstance();
          const endpoint = client.config.endpoint;
          const projectId = client.config.projectId;
          
          // Construct direct file view URL using Appwrite's standard URL pattern
          avatarUrl = `${endpoint}/storage/buckets/${process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID}/files/${res.$id}/view?project=${projectId}`;
          
          // Store both the file ID and URL for future reference
          console.log('Stored avatar URL:', avatarUrl);
        } catch (e) {
          console.error('Appwrite avatar upload failed:', e);
        }
      }

      // Build update object only with fields provided (avoid overwriting existing fields with empty values)
      const updateObj = { updatedAt: serverTimestamp() };
      if (newData.name !== undefined) updateObj.name = newData.name;
      if (newData.bio !== undefined) updateObj.bio = newData.bio;
      if (newData.gender !== undefined) updateObj.gender = newData.gender;
      if (newData.birthday !== undefined) updateObj.birthday = newData.birthday;
      if (newData.maritalStatus !== undefined) updateObj.maritalStatus = newData.maritalStatus;
      if (newData.height !== undefined) updateObj.height = newData.height;
      if (newData.weight !== undefined) updateObj.weight = newData.weight;
      if (newData.interests !== undefined) updateObj.interests = Array.isArray(newData.interests) ? newData.interests : [];
      if (avatarUrl) updateObj.avatar = avatarUrl;

      await updateDoc(doc(db, "users", user.uid), updateObj);

      setTempAvatarUri(null);

      setProfile((prev) => ({
        ...prev,
        ...(updateObj.name !== undefined ? { name: updateObj.name } : {}),
        ...(updateObj.bio !== undefined ? { bio: updateObj.bio } : {}),
        ...(updateObj.gender !== undefined ? { gender: updateObj.gender } : {}),
        ...(updateObj.birthday !== undefined ? { birthday: updateObj.birthday } : {}),
        ...(updateObj.maritalStatus !== undefined ? { maritalStatus: updateObj.maritalStatus } : {}),
        ...(updateObj.height !== undefined ? { height: updateObj.height } : {}),
        ...(updateObj.weight !== undefined ? { weight: updateObj.weight } : {}),
        ...(updateObj.interests !== undefined ? { interests: updateObj.interests } : {}),
        ...(updateObj.avatar ? { avatar: updateObj.avatar } : {}),
      }));

      Alert.alert("Thành công", "Hồ sơ đã được cập nhật!");
    } catch (err) {
      console.error("Error updating profile:", err);
      Alert.alert("Lỗi", "Không thể lưu thay đổi: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={async () => {
            const uri = await pickImage();
            if (uri) {
              // preview locally and defer upload until Save is pressed
              setTempAvatarUri(uri);
              setProfile(prev => ({ ...prev, avatar: uri }));
            }
          }}
        >
          <Image
            source={{
              uri: profile.avatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
            }}
            style={styles.avatar}
          />
          {updating && (
            <View style={styles.avatarOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
          <Text style={styles.changeAvatarText}>Đổi ảnh đại diện</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tên hiển thị</Text>
            <TextInput
              style={styles.input}
              value={profile.name}
              onChangeText={(text) => setProfile(prev => ({...prev, name: text}))}
              placeholder="Nhập tên của bạn"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tiểu sử</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={profile.bio}
              onChangeText={(text) => setProfile(prev => ({...prev, bio: text}))}
              placeholder="Viết gì đó về bạn..."
              multiline
            />
          </View>

          <View style={styles.selectContainer}>
            <Text style={styles.label}>Giới tính</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowGenderModal(true)}
            >
              <Text style={styles.dropdownButtonText}>
                {gender || "Chọn giới tính"}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            <Modal
              visible={showGenderModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowGenderModal(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowGenderModal(false)}
              >
                <View style={styles.dropdownModal}>
                  {['Nam', 'Nữ', 'Không có'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownOption,
                        gender === option && styles.dropdownOptionSelected
                      ]}
                      onPress={() => {
                        setGender(option);
                        setShowGenderModal(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        gender === option && styles.dropdownOptionTextSelected
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ngày sinh</Text>
            <TextInput
              style={styles.birthdayInput}
              placeholder="DD/MM/YYYY"
              value={birthday}
              onChangeText={(text) => setBirthday(formatBirthday(text))}
              maxLength={10}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.selectContainer}>
            <Text style={styles.label}>Tình trạng hôn nhân</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowMaritalModal(true)}
            >
              <Text style={styles.dropdownButtonText}>
                {maritalStatus || "Chọn tình trạng"}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            <Modal
              visible={showMaritalModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowMaritalModal(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowMaritalModal(false)}
              >
                <View style={styles.dropdownModal}>
                  {maritalOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownOption,
                        maritalStatus === option && styles.dropdownOptionSelected
                      ]}
                      onPress={() => {
                        setMaritalStatus(option);
                        setShowMaritalModal(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        maritalStatus === option && styles.dropdownOptionTextSelected
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Chiều cao (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 170"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Cân nặng (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 65"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.selectContainer}>
            <Text style={styles.label}>Sở thích</Text>
            <TouchableOpacity
              style={styles.interestsButton}
              onPress={() => setShowInterestsModal(true)}
            >
              <Text style={styles.interestsButtonText}>
                {Array.isArray(interests) && interests.length > 0 
                  ? 'Đã chọn ' + interests.length + ' sở thích' 
                  : "Chọn sở thích"}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            <View style={styles.interestTags}>
              {Array.isArray(interests) && interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestTagText}>{interest}</Text>
                  <TouchableOpacity
                    onPress={() => setInterests(prev => 
                      Array.isArray(prev) ? prev.filter(i => i !== interest) : []
                    )}
                  >
                    <Text style={styles.removeTag}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <Modal
              visible={showInterestsModal}
              transparent
              animationType="slide"
              onRequestClose={() => setShowInterestsModal(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowInterestsModal(false)}
              >
                <View style={[styles.dropdownModal, { width: '90%' }]}>
                  <Text style={styles.modalTitle}>Chọn sở thích</Text>
                  <ScrollView style={styles.interestsScrollView}>
                    {interestOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownOption,
                          interests.includes(option) && styles.dropdownOptionSelected
                        ]}
                        onPress={() => {
                          if (interests.includes(option)) {
                            setInterests(prev => prev.filter(i => i !== option));
                          } else {
                            setInterests(prev => [...prev, option]);
                          }
                        }}
                      >
                        <Text style={[
                          styles.dropdownOptionText,
                          interests.includes(option) && styles.dropdownOptionTextSelected
                        ]}>
                          {option}
                        </Text>
                        {interests.includes(option) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => setShowInterestsModal(false)}
                  >
                    <Text style={styles.doneButtonText}>Xong</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.bottomButton, styles.feedbackButton]}
          onPress={() => {
            Alert.prompt(
              "Gửi phản hồi",
              "Hãy chia sẻ ý kiến của bạn về ứng dụng",
              [
                {
                  text: "Hủy",
                  style: "cancel"
                },
                {
                  text: "Gửi",
                  onPress: async (feedback) => {
                    if (!feedback?.trim()) return;
                    
                    try {
                      const user = auth.currentUser;
                      const userInfo = user ? user.email + ' (' + (profile?.name || 'No name') + ')' : 'Anonymous';
                      
                      const mailtoUrl = 'mailto:duong1701.work@gmail.com?subject=Phản hồi từ người dùng&body=Người dùng: ' + 
                        userInfo + '%0D%0A%0D%0APhản hồi: ' + encodeURIComponent(feedback);
                      
                      // On native platforms this will open the mail app
                      await Linking.openURL(mailtoUrl);
                      
                      Alert.alert(
                        "Cảm ơn bạn!",
                        "Phản hồi của bạn rất quan trọng với chúng tôi."
                      );
                    } catch (err) {
                      console.error("Error sending feedback:", err);
                      Alert.alert(
                        "Lỗi",
                        "Không thể gửi phản hồi. Vui lòng thử lại sau."
                      );
                    }
                  }
                }
              ],
              "plain-text"
            );
          }}
        >
          <Text style={styles.feedbackButtonText}>Gửi phản hồi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomButton, styles.saveButton]}
          onPress={async () => {
            try {
              setSavingInfo(true);
              await handleSaveProfile({
                name: profile.name,
                bio: profile.bio,
                gender,
                birthday,
                maritalStatus,
                height: height || '',
                weight: weight || '',
                interests: Array.isArray(interests) ? interests : [],
                newAvatarUri: tempAvatarUri,
              });

              Alert.alert("Thành công", "Thông tin đã được cập nhật!");
              navigation.goBack();
            } catch (err) {
              console.error("Error saving info:", err);
              Alert.alert("Lỗi", "Không thể lưu thông tin: " + (err?.message || err));
            } finally {
              setSavingInfo(false);
            }
          }}
          disabled={savingInfo}
        >
          <Text style={styles.saveButtonText}>
            {savingInfo ? "Đang lưu..." : "Lưu thay đổi"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f9ff',
  },
  bottomButtons: {
    padding: 16,
    gap: 12,
  },
  bottomButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  feedbackButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  feedbackButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#2196F3',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#2196F3',
  },
  avatarOverlay: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeAvatarText: {
    color: '#2196F3',
    fontSize: 16,
  },
  form: {
    padding: 16,
  },
  // Personal info styles
  selectContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    color: '#444',
    marginBottom: 10,
    fontWeight: '500',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownIcon: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    width: '80%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownOptionTextSelected: {
    color: '#2196F3',
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  birthdayInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
    letterSpacing: 1,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  interestsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  interestsButtonText: {
    fontSize: 16,
    color: '#333',
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  interestTagText: {
    color: '#2196F3',
    fontSize: 14,
    marginRight: 4,
  },
  removeTag: {
    color: '#2196F3',
    fontSize: 18,
    marginLeft: 2,
  },
  interestsScrollView: {
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  doneButton: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    margin: 16,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  checkmark: {
    color: '#2196F3',
    fontSize: 18,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    margin: 16,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});