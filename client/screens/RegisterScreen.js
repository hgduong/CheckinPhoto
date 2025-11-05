import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebaseConfig"; // import db
import { doc, setDoc } from "firebase/firestore"; // thêm Firestore

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirm.trim();

    if (!trimmedEmail || !trimmedPassword || !trimmedConfirm) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      Alert.alert("Lỗi", "Mật khẩu không khớp.");
      return;
    }

    if (trimmedPassword.length < 6 || trimmedPassword.length > 12) {
      Alert.alert("Lỗi", "Mật khẩu phải từ 6 đến 12 ký tự.");
      return;
    }

    if (/\s/.test(trimmedPassword)) {
      Alert.alert("Lỗi", "Mật khẩu không được chứa khoảng trắng.");
      return;
    }

    try {
      // 1. Tạo tài khoản trong Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );
      const user = userCredential.user;

      // 2. Tạo document Firestore users/{uid}
      await setDoc(doc(db, "users", user.uid), {
        name: "Người dùng mới",
        username: "@" + trimmedEmail.split("@")[0],
        avatar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZ67WnVe0-3PrCFinHDd58Jm--CH0NyPOIuP0RS0uygOo4RYHO_lP6tVoIegZWwNXRXpc&usqp=CAU",
        bio: "Chào mừng đến với CheckinPhoto!",
        location: "Việt Nam",
        followers: 0,
        following: [],
        likeCount: 0,
        postCount: 0,
        likedPosts: [],
        lastActive: Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      Alert.alert("Thành công", "Tài khoản đã được tạo.");
      navigation.replace("Main");
    } catch (error) {
      Alert.alert("Lỗi đăng ký", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng ký tài khoản</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Xác nhận mật khẩu"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Đăng ký</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  link: { marginTop: 12, textAlign: "center", color: "#2196F3" },
});
