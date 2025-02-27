import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, SafeAreaView } from "react-native";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "../../FirebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface Utilisateur {
  nom: string;
  prenom: string;
  email: string;
  isLivreur?: boolean;
  isClient?: boolean;
}

// Variable globale pour suivre l'état de déconnexion
// Cela permettra à d'autres composants de vérifier cet état
export let isLoggingOut = false;

const handleLogout = async () => {
  const auth = getAuth();
  try {
    // Marquer que la déconnexion est en cours
    isLoggingOut = true;
    
    // Attendre un court instant pour laisser le temps aux listeners de vérifier l'état
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Déconnexion
    await signOut(auth);
    
    // Réinitialiser l'état après déconnexion
    isLoggingOut = false;
    
    // Redirection immédiate après la déconnexion
    router.replace("/"); 
  } catch (error) {
    // Réinitialiser l'état en cas d'erreur
    isLoggingOut = false;
    
    console.error("Erreur lors de la déconnexion:", error);
    
    // Gestion plus détaillée de l'erreur
    if (error instanceof Error) {
      alert(`Erreur de déconnexion : ${error.message}`);
    } else {
      alert("Une erreur est survenue lors de la déconnexion.");
    }
    
    // Tenter une redirection de secours
    try {
      router.replace("/");
    } catch (routerError) {
      console.error("Erreur de redirection:", routerError);
    }
  }
};

const Profile = () => {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("onAuthStateChanged called"); // Vérifie si cette fonction est appelée
      if (user) {
        console.log("User is authenticated:", user.email); // Log de l'email de l'utilisateur
        
        try {
          const livreursRef = collection(db, "Livreur");
          const clientsRef = collection(db, "Client");

          console.log("Searching for user with email:", user.email); // Log 2

          const livreurQuery = query(livreursRef, where("email", "==", user.email));
          const clientQuery = query(clientsRef, where("email", "==", user.email));

          const livreurSnapshot = await getDocs(livreurQuery);
          console.log("Livreur snapshot empty?", livreurSnapshot.empty); // Log 3
          
          if (!livreurSnapshot.empty) {
            const livreurData = livreurSnapshot.docs[0].data();
            console.log("Livreur data found:", livreurData); // Log 4
            setUtilisateur({
              nom: livreurData.nom,
              prenom: livreurData.prenom,
              email: livreurData.email,
              isLivreur: true,
            });
          } else {
            const clientSnapshot = await getDocs(clientQuery);
            console.log("Client snapshot empty?", clientSnapshot.empty); // Log 5
            
            if (!clientSnapshot.empty) {
              const clientData = clientSnapshot.docs[0].data();
              console.log("Client data found:", clientData); // Log 6
              setUtilisateur({
                nom: clientData.nom,
                prenom: clientData.prenom,
                email: clientData.email,
                isClient: true,
              });
            } else {
              console.log("No user found in either collection"); // Log 7
              setUtilisateur(null);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error); // Log 8
          setUtilisateur(null);
        }
      } else {
        console.log("No authenticated user"); // Log 9
        setUtilisateur(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  console.log("Current state - Loading:", loading, "User:", utilisateur); // Log 10

  return (
    <SafeAreaView className="flex-1 bg-sky-50">
      <View className="py-4 px-5 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="chevron-back" size={24} color="#0284c7" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : utilisateur ? (
        <View className="flex-1 px-5 py-4">
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-sky-600 justify-center items-center mb-4">
              <Text className="text-white text-3xl font-bold">
                {utilisateur.prenom[0]}{utilisateur.nom[0]}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-indigo-800 mb-2">
              {utilisateur.prenom} {utilisateur.nom}
            </Text>
            <Text className="text-lg text-slate-500">{utilisateur.email}</Text>
            
            {utilisateur.isLivreur && (
              <Text className="text-green-600 text-lg font-semibold">Statut : Livreur</Text>
            )}
            {utilisateur.isClient && (
              <Text className="text-yellow-600 text-lg font-semibold">Statut : Client</Text>
            )}
          </View>

          <TouchableOpacity
            className="bg-sky-600 flex-row items-center justify-center p-4 rounded-xl mt-auto"
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" className="mr-2" />
            <Text className="text-white text-lg font-semibold">Se Déconnecter</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-red-500 text-lg font-medium text-center">
            Informations de l'utilisateur non disponibles.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Profile;