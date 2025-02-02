import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "../../FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { router } from "expo-router";
interface Livreurs {
  nom: string;
  prenom: string;
  email: string;
}


  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth); // Déconnexion de Firebase
      router.replace("/"); // Redirection vers la page de connexion
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };


const Profile = () => {
  const [livreur, setLivreur] = useState<Livreurs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    // ✅ Écouteur en temps réel pour détecter la connexion / déconnexion
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Utilisateur connecté UID:", user.uid);

        try {
          const livreurRef = doc(db, "Livreur", user.uid);
          const livreurSnapshot = await getDoc(livreurRef);

          if (livreurSnapshot.exists()) {
            setLivreur(livreurSnapshot.data() as Livreurs);
          } else {
            console.log("Aucune donnée trouvée pour cet utilisateur !");
            setLivreur(null);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des données :", error);
          setLivreur(null);
        }
      } else {
        console.log("Aucun utilisateur connecté !");
        setLivreur(null);
      }
      setLoading(false);
    });

    return () => unsubscribe(); 
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : livreur ? (
        <View>
          <Text className="text-2xl font-bold text-black">Bienvenue, {livreur.nom} {livreur.prenom}</Text>
          <Text className="text-lg text-gray-500">{livreur.email}</Text>
        </View>
      ) : (
        <Text className="text-red-500">Informations du livreur non disponibles.</Text>
      )}
      <TouchableOpacity onPress={handleLogout} className="bg-red-500 p-4 rounded-lg mt-4"
            >
          <Text className="text-white font-semibold">Se Déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Profile;
