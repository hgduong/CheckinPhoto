// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import BottomTabs from "./navigation/BottomTabs"; // Import điều hướng tab

export default function App() {
  return (
    <NavigationContainer>
      <BottomTabs />
    </NavigationContainer>
  );
}
