import React from "react";
import { Image } from "react-native"; // ✅ Bổ sung import Image
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import CameraScreen from "../screens/CameraScreen";
import MapScreen from "../screens/MapScreen";
import GalleryScreen from "../screens/GalleryScreen";
import CreateCaptionScreen from "../screens/CreateCaptionScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CameraAssist from "../screens/CameraAssist";
import HomeIMG from "../assets/home.png"; // ✅ Ảnh icon tùy chỉnh
import Icon from "react-native-vector-icons/Ionicons";
import Lib from "../assets/lib.png";
import Cam from "../assets/cam.png";
import Maps from "../assets/maps.png";
import Profile from "../assets/pro5.png";
// Tạo bottom tab navigator
const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#ccc",
          height: 75,
        },
        tabBarActiveTintColor: "#2196F3",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      {/* Trang chủ */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Trang chủ",
          tabBarIcon: ({ color, size }) => (
            <Image
              source={HomeIMG}
              style={{ tintColor: color, width: size, height: size }}
              resizeMode="contain"
            />
          ),
        }}
      />

      {/* Camera - Đáng nhẽ cái này là thư viện này*/}
      <Tab.Screen
        name="Camera"
        component={HomeScreen}
        options={{
          tabBarLabel: "Thư viện",
          tabBarIcon: ({ color, size }) => (
            <Image
              source={Lib}
              style={{ tintColor: color, width: size, height: size }}
              resizeMode="contain"
            />
          ),
        }}
      />

      {/* Bản đồ - Đáng nhẽ cái này là Camera */}
      <Tab.Screen
        name="Map"
        component={HomeScreen}
        options={{
          tabBarLabel: "Camera",
          tabBarIcon: ({ color, size }) => (
            <Image
              source={Cam}
              style={{ tintColor: color, width: size, height: size }}
              resizeMode="contain"
            />
          ),
        }}
      />

      {/* Thư viện ảnh - Đáng nhẽ phải là MAP */}
      <Tab.Screen
        name="Gallery"
        component={MapScreen}
        options={{
          tabBarLabel: "Maps",
          
          tabBarIcon: ({ color, size }) => (
            <Image
              source={Maps}
              style={{ tintColor: color, width: size, height: size }}
              resizeMode="contain"
            />
          ),
        }}
      />

      {/* Cá nhân */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Cá nhân",
          tabBarIcon: ({ color, size }) => (
            <Image
              source={Profile}
              style={{ tintColor: color, width: size, height: size }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
