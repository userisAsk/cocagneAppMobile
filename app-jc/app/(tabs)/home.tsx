import { useState, useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface UserData {
  nom: string;
  prenom: string;
}

interface Ville {
  [key: string]: {
    adresse: string;
    horaire: string;
    nom: string;
    numero_depot: string[];
  };
}

interface Tournee {
  active: boolean;
  infos: string;
  jour: string;
  ordre_semaine: number;
  type: string;
  villes: {
    [key: string]: Ville;
  };
}

const SearchBar = ({
  searchText,
  setSearchText
}: {
  searchText: string;
  setSearchText: (text: string) => void;
}) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);

  const renderPlaceholder = () => {
    if (focused || searchText) {
      return null;
    }
    return (
      <View className="absolute left-2 flex-row"> 
        <Text className="text-black text-xl font-medium">
          Chercher
        </Text>
        <Text className="text-gray-400 text-xl font-medium">
          {' une ville'}
        </Text>
      </View>
    );
  };


  

  return (
    <TouchableOpacity
      className="flex-row items-center p-3"
      activeOpacity={1}
      onPress={() => {
        setFocused(true);
        inputRef.current?.focus();
      }}
    >
      <Ionicons name="search" size={20} color="#333" />
      <View className="flex-1">
        {renderPlaceholder()}
        <TextInput
          ref={inputRef}
          placeholder=" "
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 ml-2 text-xl text-black"
          style={{
            borderWidth: 0,
            padding: 0,
            margin: 0,
            outline: 'none'
          }}
        />
      </View>
    </TouchableOpacity>
  );
};


type RootStackParamList = {
  Home: undefined;
  PanierRecap: {
    villeNom: string;
    jour: string;
  };
};

const Home = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tourneeJour, setTourneeJour] = useState<Tournee | null>(null);
  const [searchText, setSearchText] = useState("");

  const getJourSemaine = () => "mardi";

  useEffect(() => {
    const auth = getAuth();
    const jour = getJourSemaine();

    const loadData = async () => {
      try {
        const tourneeRef = doc(db, "Tournee", jour);
        const tourneeSnap = await getDoc(tourneeRef);

        if (tourneeSnap.exists()) {
          setTourneeJour(tourneeSnap.data() as Tournee);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de la tournée:", error);
      }
    };

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

          await loadData();
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

  const renderTournee = () => {
    if (!tourneeJour || !tourneeJour.active) {
      return (
        <View className="mt-4">
          <Text className="text-gray-600">No delivery route for today</Text>
        </View>
      );
    }

    const filteredVilles = Object.keys(tourneeJour.villes).filter((ville) =>
      ville.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
      <View className="mt-4">
        {tourneeJour.infos && (
          <View className="mb-4 p-4 bg-yellow-100 rounded-lg self-center">
            <Text className="text-amber-800 text-center">{tourneeJour.infos}</Text>
          </View>
        )}

        <SearchBar searchText={searchText} setSearchText={setSearchText} />

        <View className="mt-4">
          <View className="flex-row flex-wrap justify-between">
            {filteredVilles.map((villeNom) => (
          <TouchableOpacity 
            key={villeNom} 
            className="bg-gray-100 p-4 rounded-lg mb-4 w-[30%]"
            onPress={() => {
              console.log('Navigation params:', {
                villeNom: villeNom,
                jour: tourneeJour.jour
              });
              router.push({
                pathname: "/(tabs)/panierRecap",
                params: {
                  villeNom: villeNom,
                  jour: tourneeJour.jour
                }
              });
            }}
              >
              <Text className="text-xl font-bold text-blue-400 text-center">{villeNom}</Text>
          </TouchableOpacity>
        ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white p-6">
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <ScrollView>
          <View className="flex-row justify-between items-center pt-20">
            <Text className="text-2xl font-bold text-gray-800">
              Bonjour, {user ? `${user.prenom}` : "Utilisateur"} 👋
            </Text>
            <TouchableOpacity
              onPress={() => {
                router.push("/profile"); 
              }}
            >
               <View className="w-12 h-12 rounded-full bg-sky-600 justify-center items-center">
                <Text className="text-white text-xl font-bold">
                  {user?.prenom[0]}{user?.nom[0]}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
  
          <View className="mt-6">
            <Text className="text-lg font-semibold text-gray-800">
              Tournée du {getJourSemaine()}
            </Text>
            {renderTournee()}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default Home;