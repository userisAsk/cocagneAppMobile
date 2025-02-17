import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";

const ChooseRole = () => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Decorative shapes at the top */}
      <View className="absolute top-0 left-0 right-0">
        {/* Add your decorative shapes here */}
      </View>

      <View className="flex-1 p-5 justify-center">
        {/* Welcome text */}
        <Text className="text-2xl font-bold text-center mb-2">
          Bienvenue !
        </Text>

        <Text className="text-base text-center mb-10">
          Choisissez votre profil pour continuer
        </Text>

        {/* Client Button */}
        <Link href="/(auth)/clientLogin" asChild>
          <TouchableOpacity 
            className="bg-blue-500 p-4 rounded-full items-center mb-5"
          >
            <Text className="text-white text-base">
              Je suis un Client
            </Text>
          </TouchableOpacity>
        </Link>

        {/* Delivery Person Button */}
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity 
            className="bg-blue-700 p-4 rounded-full items-center"
          >
            <Text className="text-white text-base">
              Je suis un Livreur
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
};

export default ChooseRole;