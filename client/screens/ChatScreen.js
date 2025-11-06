import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Image, FlatList,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  doc, collection, query, where, orderBy,
  getDocs, onSnapshot, setDoc, updateDoc, addDoc, serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { callGemini } from "../services/gemini"; // Đảm bảo đúng đường dẫn

export default function ChatScreen({ route, navigation }) {
  const { chatUser } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(""); 
  const [chatId, setChatId] = useState(null);
  const flatListRef = useRef(null);
  const currentUid = auth.currentUser?.uid;

  const sendMessage = async () => {
    if (!chatUser || !input.trim()) return;
    let cid = chatId;

    if (!cid) {
      const q = query(collection(db, "chats"), where("participants", "in", [
        [currentUid, chatUser.id], [chatUser.id, currentUid]
      ]));
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

    await handleBotReply(input, cid);

    setInput("");
  };

  const handleBotReply = async (userMessage, cid) => {
  if (!cid || !userMessage.trim()) return;

  console.log("📡 Gọi Gemini với:", userMessage);

  const reply = await callGemini(userMessage);

  console.log("🤖 Phản hồi từ Gemini:", reply);

  if (reply) {
    const msgRef = collection(db, "chats", cid, "messages");
    await addDoc(msgRef, {
      senderId: "chatbot",
      text: reply,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "chats", cid), {
      lastMessage: reply,
      lastMessageTime: serverTimestamp(),
      lastMessageSender: "chatbot",
    });
  }
};


  useEffect(() => {
    if (!chatUser || !currentUid) return;
    let unsub = () => {};

    const loadChat = async () => {
      const q = query(collection(db, "chats"), where("participants", "in", [
        [currentUid, chatUser.id], [chatUser.id, currentUid]
      ]));
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Image source={{ uri: chatUser?.avatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png" }} style={styles.avatar} />
          <Text style={styles.headerTitle}>{chatUser?.name || "Chat"}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => (
          <View style={[
            styles.messageBubble,
            item.senderId === currentUid
              ? styles.myMessage
              : item.senderId === "chatbot"
              ? styles.botMessage
              : styles.theirMessage,
          ]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim()}
          >
            <Text style={styles.sendButtonText}>📩</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f9ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2196F3',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  messagesList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#2196F3',
    borderRadius: 24,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  botMessage: {
  alignSelf: 'flex-start',
  backgroundColor: '#e0f7fa',
  borderWidth: 1,
  borderColor: '#b2ebf2',
}
});