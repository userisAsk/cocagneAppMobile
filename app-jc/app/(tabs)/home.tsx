import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";

interface UserData {
  nom: string;
  prenom: string;
}

const Home = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, "Livreur", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setUser(userSnap.data() as UserData);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des données :", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View className="flex-1 bg-white p-6">
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <View>
          <Text className="text-2xl font-bold text-gray-800 pt-20">
            Bonjour, {user ? `${user.prenom}` : "Utilisateur"} 👋
          </Text>

          <View className="mt-6">
            <Text className="text-lg text-gray-600">Bienvenue sur l'application.</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default Home;
