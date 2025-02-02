import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../FirebaseConfig";
import { Link, router } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";

const DecorativeShapes = () => {
  return (
    <View className="absolute top-0 left-0 w-full h-[300px] overflow-hidden">
      {/* Cercle bleu clair en arrière-plan */}
      <View className="absolute -top-[30px] left-[30px] w-[150px] h-[200px] rounded-full bg-blue-200 opacity-75"/>
      <View className="absolute -top-[100px] left-[70px] w-[200px] h-[200px] rounded-full bg-blue-200 opacity-75" />
      {/* Cercle bleu foncé au premier plan */}
      <View className="absolute -top-[150px] -left-[100px] w-[300px] h-[300px] rounded-full bg-blue-800" />
    </View>
  );
};

const BottomDecorativeShape = () => {
  return (
    <View className="absolute bottom-60 right-[-120px] w-[200px] h-[200px] rounded-full bg-blue-200 opacity-75" />
  );
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const signIn = async () => {
    try {
      const user = await signInWithEmailAndPassword(auth, email, password);
      if (user) router.replace("/(tabs)/home");
    } catch (error) {
      if (error instanceof Error) {
        alert("Connexion échouée : " + error.message);
      } else {
        alert("Connexion échouée : Une erreur inconnue s'est produite.");
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <DecorativeShapes />
      <BottomDecorativeShape />
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1">
          <View className="flex-1 p-6 justify-center">
            <Text className="text-3xl text-center font-bold text-gray-800 mb-2">
              Login
            </Text>
            <Text className="text-base text-center text-gray-500 mb-8">
              Content de te revoir !
            </Text>

            <View className="space-y-5">
              <View className="space-y-2">
                <Text className="text-sm font-medium text-gray-700 pl-1">
                  Email
                </Text>
                <TextInput
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-base text-gray-800"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="space-y-2">
                <Text className="text-sm font-medium text-gray-700 mt-5 pl-1">
                  Mot de passe
                </Text>
                <View className="relative">
                  <TextInput
                    className="w-full bg-gray-100 rounded-lg px-4 py-3 text-base text-gray-800 pr-12"
                    placeholder="Entrer votre mot de passe"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity 
                    className="absolute right-3 top-3"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 
                      <EyeOff size={24} color="#666666" /> : 
                      <Eye size={24} color="#666666" />
                    }
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                className="w-full bg-blue-600 rounded-full py-4 items-center mt-7"
                onPress={signIn}
              >
                <Text className="text-white text-base font-semibold">
                  Connexion
                </Text>
              </TouchableOpacity>

              <Link href="/" asChild>
                <TouchableOpacity className="py-4 items-center">
                  <Text className="text-gray-500 text-base font-medium">
                    Annuler
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}