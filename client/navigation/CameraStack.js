import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
// import CameraScreen from '../screens/CameraScreen';
import CameraScreen from '../screens/CameraScreenV2';
import CreateCaptionScreen from '../screens/CreateCaptionScreen';

const Stack = createStackNavigator();

export default function CameraStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
       <Stack.Screen name="CameraMain" component={CameraScreen} />
      <Stack.Screen 
        name="CreateCaptionScreen" 
        component={CreateCaptionScreen}
        options={{
          headerShown: true,
          title: 'Tạo Caption',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </Stack.Navigator>
  );
}

