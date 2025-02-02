import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const TabsLayout = () => {
  const windowWidth = Dimensions.get('window').width;

  return (
    <>
      <StatusBar style="auto" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 25,
            width: windowWidth * 0.8,
            backgroundColor: '#ffffff',
            borderRadius: 25,
            height: 60,
            marginLeft: 40,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            borderTopWidth: 0,
            shadowRadius: 3.5,
          },
          tabBarItemStyle: {
            marginTop: 5,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Accueil",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <Ionicons name="cube-outline" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
};

export default TabsLayout;