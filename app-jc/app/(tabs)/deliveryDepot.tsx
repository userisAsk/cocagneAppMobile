import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../FirebaseConfig";
import { doc, getDoc, DocumentData, getDocs, where, collection, query } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Styles natifs pour Map et les éléments qui pourraient poser problème
const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: 300,
  },
});

// Interfaces
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Depot {
  adresse: string;
  horaire: string;
  coordonnées: Coordinates;
  num_depot: string[];
  ordre?: number; 
  isDelivered?: boolean;
}

const DeliveryDepot: React.FC = () => {
  // États
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [deliveredAddresses, setDeliveredAddresses] = useState<string[]>([]);

  // Paramètres
  const params = useLocalSearchParams();
  const villeNom = params.villeNom as string;
  const jour = params.jour as string;
  const depotOrdre = params.depotOrdre ? parseInt(params.depotOrdre as string, 10) : null;

  // Fonctions
  const validateCoordinates = (coords: any): Coordinates => {
    const lat = Number(coords.latitude);
    const lng = Number(coords.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error("Coordonnées invalides");
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error("Coordonnées hors limites");
    }

    return { latitude: lat, longitude: lng };
  };

  const calculateRegion = (depotsArray: Depot[]): Region => {
    if (depotsArray.length === 0) {
      return {
        latitude: 46.603354,  // Centre de la France
        longitude: 1.888334,
        latitudeDelta: 10,
        longitudeDelta: 10,
      };
    }

    const coords = depotsArray.map(depot => depot.coordonnées);
    const minLat = Math.min(...coords.map(c => c.latitude));
    const maxLat = Math.max(...coords.map(c => c.latitude));
    const minLng = Math.min(...coords.map(c => c.longitude));
    const maxLng = Math.max(...coords.map(c => c.longitude));

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Ajouter une marge pour une meilleure visualisation
    const latDelta = Math.max(0.02, (maxLat - minLat) * 1.5);
    const lngDelta = Math.max(0.02, (maxLng - minLng) * 1.5);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const checkDeliveredDepots = async () => {
    try {
      console.log(`Recherche des paniers livrés pour jour=${jour.toLowerCase()}, ville=${villeNom}`);
      
      const basketsRef = collection(db, "Panier");
      const q = query(
        basketsRef,
        where("tourneeid", "==", jour.toLowerCase()),
        where("ville", "==", villeNom),
        where("statut", "==", "Livré")
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`Nombre de paniers livrés trouvés: ${querySnapshot.size}`);
      
      // Définir le type explicitement
      const deliveredDepotIds: string[] = [];
      
      querySnapshot.forEach((doc) => {
        const basketData = doc.data();
        console.log(`Panier ID: ${doc.id}, Data:`, basketData);
        
        if (basketData.adresse) {
          deliveredDepotIds.push(basketData.adresse);
          console.log(`ID de dépôt trouvé: ${basketData.adresse}`);
        } else {
          console.log(`⚠️ Panier ${doc.id} n'a pas d'adresse`);
        }
      });
      
      console.log("IDs des dépôts livrés:", deliveredDepotIds);
      
      // Mettre à jour le nom de la variable dans AsyncStorage
      await AsyncStorage.setItem(
        `deliveredDepotIds_${jour}_${villeNom}`, 
        JSON.stringify(deliveredDepotIds)
      );
      
      return deliveredDepotIds;
    } catch (error) {
      console.error("Erreur lors de la vérification des dépôts livrés:", error);
      return [];
    }
  };

  const fetchDepots = async (ignoreCache = false) => {
    try {
      setError(null);
      
      // Charger d'abord les adresses des dépôts livrés (si pas encore chargées)
      let addresses = deliveredAddresses;
      if (addresses.length === 0 || ignoreCache) {
        addresses = await checkDeliveredDepots();
      }
      
      const tourneeRef = doc(db, "Tournee", jour.toLowerCase());
      const tourneeSnap = await getDoc(tourneeRef);

      if (!tourneeSnap.exists()) {
        throw new Error("Données de tournée non trouvées");
      }

      const tourneeData = tourneeSnap.data() as DocumentData;
      const villeDepots = tourneeData.villes[villeNom];

      if (!villeDepots) {
        throw new Error(`Aucun dépôt trouvé pour ${villeNom}`);
      }

      // Transformer en tableau avec ordre et statut livré basé sur l'identifiant
      const depotsArray = Object.entries(villeDepots)
        .map(([depotId, depot]: [string, any]) => {
          try {
            // Vérifier si ce dépôt est livré en utilisant son identifiant
            const isDelivered = addresses.includes(depotId);
            
            return {
              ...depot,
              depotId, // Ajouter l'identifiant du dépôt
              coordonnées: validateCoordinates(depot.coordonnées),
              isDelivered: isDelivered
            };
          } catch (e) {
            console.error(`Erreur de validation des coordonnées pour ${depot.adresse}:`, e);
            throw e;
          }
        })
        .sort((a, b) => a.ordre - b.ordre);

      console.log('Dépôts chargés avec statut de livraison:', JSON.stringify(depotsArray, null, 2));
      setDepots(depotsArray);
      
      // Sélection intelligente du dépôt
      selectAppropriateDepot(depotsArray, depotOrdre);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement des données";
      setError(errorMessage);
      Alert.alert("Erreur", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const selectAppropriateDepot = (depotsArray: Depot[], requestedOrder: number | null) => {
    if (depotsArray.length === 0) return;
    
    // Si un ordre spécifique est demandé, on essaie de le sélectionner
    if (requestedOrder) {
      const requestedDepot = depotsArray.find(d => d.ordre === requestedOrder);
      if (requestedDepot) {
        setSelectedDepot(requestedDepot);
        console.log(`Dépôt #${requestedOrder} sélectionné comme demandé`);
        return;
      }
    }
    
    // Sinon, on cherche le premier dépôt non livré
    const firstUndeliveredDepot = depotsArray.find(d => !d.isDelivered);
    if (firstUndeliveredDepot) {
      setSelectedDepot(firstUndeliveredDepot);
      console.log(`Premier dépôt non livré #${firstUndeliveredDepot.ordre} sélectionné automatiquement`);
      return;
    }
    
    // Si tous sont livrés, sélectionner le premier
    setSelectedDepot(depotsArray[0]);
    console.log("Tous les dépôts sont livrés, sélection du premier dépôt");
  };

  // Effect pour le chargement initial
  useEffect(() => {
    // Charger d'abord les adresses de dépôts livrés depuis AsyncStorage
    const loadInitialState = async () => {
      try {
        const cachedDeliveredAddresses = await AsyncStorage.getItem(`deliveredAddresses_${jour}_${villeNom}`);
        if (cachedDeliveredAddresses) {
          setDeliveredAddresses(JSON.parse(cachedDeliveredAddresses));
        }
      } catch (e) {
        console.error("Erreur lors du chargement des adresses de dépôts livrés:", e);
      }
      
      // Puis charger les dépôts
      fetchDepots();
    };
    
    loadInitialState();
  }, [villeNom, jour, depotOrdre]);

  // Fonction de rafraîchissement
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDepots(true);
  }, [villeNom, jour, depotOrdre]);

  // Trouver le prochain dépôt
  const getNextDepot = (currentDepot: Depot | null): Depot | null => {
    if (!currentDepot || depots.length <= 1) return null;
    
    const currentIndex = depots.findIndex(d => d.ordre === currentDepot.ordre);
    if (currentIndex === -1 || currentIndex === depots.length - 1) return null;
    
    return depots[currentIndex + 1];
  };

  const navigateBack = () => {
    router.push({
      pathname: '/(tabs)/panierRecap',
      params: { villeNom, jour }
    });
  };

  // Composant pour le marqueur personnalisé avec état livré
  const CustomMarker = ({ depot, isSelected }: { depot: Depot, isSelected: boolean }) => (
    <Marker
      coordinate={depot.coordonnées}
      title={`${depot.ordre}. ${depot.adresse}`}
      description={depot.horaire + (depot.isDelivered ? " (Livré)" : "")}
      tracksViewChanges={false}
    >
      <View className={`
        w-[30px] h-[30px] bg-blue-500 rounded-full justify-center items-center border-2 border-white
        ${isSelected ? 'w-[36px] h-[36px] bg-blue-600 border-yellow-300' : ''}
        ${depot.isDelivered ? 'bg-emerald-500' : ''}
      `}>
        <Text className="text-white font-bold text-sm">{depot.ordre}</Text>
      </View>
    </Marker>
  );

  // Rendu de la carte avec tous les dépôts
  const renderMap = () => {
    if (!selectedDepot || depots.length === 0) return null;
  
    const region = calculateRegion(depots);
    const nextDepot = getNextDepot(selectedDepot);
  
    return (
      <View className="m-4 rounded-xl overflow-hidden bg-white shadow-md">
        <MapView
          style={styles.map}
          initialRegion={region}
        >
          {/* Afficher tous les marqueurs de dépôt */}
          {depots.map((depot) => (
            <CustomMarker 
              key={depot.ordre ? depot.ordre.toString() : Math.random().toString()}
              depot={depot} 
              isSelected={selectedDepot && depot.ordre === selectedDepot.ordre}
            />
          ))}
          
          {/* Ligne reliant tous les dépôts dans l'ordre */}
          {depots.length > 1 && (
            <Polyline
              coordinates={depots
                .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
                .map(depot => depot.coordonnées)
              }
              strokeColor="#9CA3AF"
              strokeWidth={1.5}
            />
          )}
          
          {/* Ligne mettant en évidence le trajet du dépôt courant au suivant */}
          {nextDepot && (
            <Polyline
              coordinates={[selectedDepot.coordonnées, nextDepot.coordonnées]}
              strokeColor="#3B82F6"
              strokeWidth={3}
            />
          )}
        </MapView>
      </View>
    );
  };

  const renderHeader = () => (
    <View className="flex-row items-center justify-between pt-10 px-4 pb-4 bg-white border-b border-gray-200">
      <TouchableOpacity 
  className="p-2" 
  onPress={navigateBack}
>
  <Ionicons name="arrow-back" size={24} color="#3B82F6" />
</TouchableOpacity>
      <Text className="text-xl font-bold text-blue-500 flex-1 text-center">Dépôts - {villeNom}</Text>
      <TouchableOpacity 
        className="p-2" 
        onPress={onRefresh}
      >
        <Ionicons name="refresh" size={24} color="#3B82F6" />
      </TouchableOpacity>
    </View>
  );

  // Rendu des informations du dépôt avec état de livraison
  const renderDepotInfo = () => (
    <View className="m-4 p-4 rounded-xl bg-white shadow-md">
      <Text className="text-lg font-bold mb-2 text-gray-800">
        Point de dépôt #{selectedDepot?.ordre}
        {selectedDepot?.isDelivered && " (Livré)"}
      </Text>
      <Text className="text-base mb-1 text-gray-700">{selectedDepot?.adresse}</Text>
      <Text className="text-sm mb-1 text-gray-500">Horaire: {selectedDepot?.horaire}</Text>
      {selectedDepot?.num_depot && (
        <Text className="text-sm text-gray-500">
          Numéros de dépôt: {selectedDepot.num_depot.join(", ")}
        </Text>
      )}
    </View>
  );

  // Bouton de scan conditionnel (désactivé si déjà livré)
  const renderScanButton = () => {
    if (!selectedDepot) return null;
    
    if (selectedDepot.isDelivered) {
      return (
        <View className="mx-4 my-4 p-4 rounded-xl bg-gray-400 flex-row items-center justify-center">
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text className="text-white ml-2">Déjà livré</Text>
        </View>
      );
    }
    
    return (
      <TouchableOpacity 
        className="mx-4 my-4 p-4 rounded-xl bg-blue-500 flex-row items-center justify-center"
        onPress={handleScanPress}
      >
        <Ionicons name="qr-code-outline" size={24} color="white" />
        <Text className="text-white ml-2">Scanner le QR code</Text>
      </TouchableOpacity>
    );
  };

  const handleScanPress = () => {
    if (selectedDepot && selectedDepot.num_depot) {
      console.log("🚀 Dépôt sélectionné :", selectedDepot.ordre, selectedDepot.adresse);
      console.log("📦 Depot ID envoyé :", selectedDepot.num_depot[0]);
  
      router.push({
        pathname: "/(tabs)/scanValidation",
        params: { 
          depotId: selectedDepot.num_depot[0],
          villeNom: villeNom,
          jour: jour
        }
      });
    } else {
      Alert.alert("Erreur", "Impossible de scanner ce dépôt");
    }
  };

  // Rendu pour l'écran de chargement
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text>Chargement des dépôts...</Text>
      </View>
    );
  }

  // Rendu pour les erreurs
  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-4 bg-white">
        <Text className="text-base text-red-600 text-center mb-4">{error}</Text>
        <TouchableOpacity 
          className="bg-blue-500 py-3 px-6 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white text-base font-semibold">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Rendu principal
  return (
    <View className="flex-1 bg-gray-100">
      {renderHeader()}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3B82F6"]}
          />
        }
      >
        {renderMap()}
        {selectedDepot && renderDepotInfo()}
        {selectedDepot && renderScanButton()}
      </ScrollView>
    </View>
  );
};

export default DeliveryDepot;