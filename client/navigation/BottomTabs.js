import React from "react";
import { Image } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import CameraStack from "./CameraStack";
import MapScreen from "../screens/MapScreen";
import GalleryScreen from "../screens/GalleryScreen";
import ProfileScreen from "../screens/ProfileScreen";

import HomeIMG from "../assets/home.png";
import Lib from "../assets/lib.png";
import Cam from "../assets/cam.png";
import Maps from "../assets/maps.png";
import Profile from "../assets/pro5.png";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator initialRouteName="Profile"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#ccc", height: 75 },
        tabBarActiveTintColor: "#2196F3",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
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

      {/* Thư viện ảnh */}
      <Tab.Screen
        name="Gallery"
        component={GalleryScreen}
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

      {/* Camera - Sử dụng Stack Navigator */}
      <Tab.Screen
        name="Camera"
        component={CameraStack}
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

      {/* Bản đồ */}
      <Tab.Screen
        name="Map"
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
