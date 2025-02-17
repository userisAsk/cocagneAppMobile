import { Stack } from "expo-router";
import { useEffect } from "react";
import { useSegments, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../FirebaseConfig";

export default function AuthLayout() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const inAuthGroup = segments[0] === "(auth)";
      
      if (user && inAuthGroup) {
        // Rediriger vers l'accueil si l'utilisateur est connecté
        router.replace("/(tabs)/home");
      }
    });

    return unsubscribe;
  }, [segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: "white" }
      }}
    >
      <Stack.Screen name="chooseRole" options={{ gestureEnabled: false }} />
      <Stack.Screen name="clientLogin" options={{ gestureEnabled: false }} />
    </Stack>
  );
}