import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../FirebaseConfig";
import { doc, getDoc, DocumentData, getDocs, where, collection, query } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Styles
const styles = StyleSheet.create({
  deliveredMarkerContainer: {
    backgroundColor: '#10B981', // Vert pour les dépôts livrés
    borderColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  map: {
    width: "100%",
    height: 300,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3B82F6",
    flex: 1,
    textAlign: "center",
  },
  iconButton: {
    padding: 8,
  },
  mapContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  depotInfo: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  depotTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1F2937",
  },
  depotAddress: {
    fontSize: 16,
    marginBottom: 4,
    color: "#4B5563",
  },
  depotHoraire: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  depotNumbers: {
    fontSize: 14,
    color: "#6B7280",
  },
  nextDepotContainer: {
    margin: 16,
  },
  nextDepotTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1F2937",
  },
  depotCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  markerContainer: {
    width: 30,
    height: 30,
    backgroundColor: "#3B82F6",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  selectedMarkerContainer: {
    backgroundColor: "#2563EB",
    borderColor: "#FBBF24",
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  markerText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  scanButton: {
    backgroundColor: "#3B82F6",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});

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

      // Transformer en tableau avec ordre et statut livré basé sur l'adresse
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

  // Composant pour le marqueur personnalisé avec état livré
  const CustomMarker = ({ depot, isSelected }: { depot: Depot, isSelected: boolean }) => (
    <Marker
      coordinate={depot.coordonnées}
      title={`${depot.ordre}. ${depot.adresse}`}
      description={depot.horaire + (depot.isDelivered ? " (Livré)" : "")}
      tracksViewChanges={false}
    >
      <View style={[
        styles.markerContainer,
        isSelected && styles.selectedMarkerContainer,
        depot.isDelivered && styles.deliveredMarkerContainer
      ]}>
        <Text style={styles.markerText}>{depot.ordre}</Text>
      </View>
    </Marker>
  );

  // Rendu de la carte avec tous les dépôts
  const renderMap = () => {
    if (!selectedDepot || depots.length === 0) return null;
  
    const region = calculateRegion(depots);
    const nextDepot = getNextDepot(selectedDepot);
  
    return (
      <View style={styles.mapContainer}>
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
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.iconButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#3B82F6" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Dépôts - {villeNom}</Text>
      <TouchableOpacity 
        style={styles.iconButton} 
        onPress={onRefresh}
      >
        <Ionicons name="refresh" size={24} color="#3B82F6" />
      </TouchableOpacity>
    </View>
  );

  // Rendu des informations du dépôt avec état de livraison
  const renderDepotInfo = () => (
    <View style={styles.depotInfo}>
      <Text style={styles.depotTitle}>
        Point de dépôt #{selectedDepot?.ordre}
        {selectedDepot?.isDelivered && " (Livré)"}
      </Text>
      <Text style={styles.depotAddress}>{selectedDepot?.adresse}</Text>
      <Text style={styles.depotHoraire}>Horaire: {selectedDepot?.horaire}</Text>
      {selectedDepot?.num_depot && (
        <Text style={styles.depotNumbers}>
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
        <View style={[styles.scanButton, { backgroundColor: '#9CA3AF' }]}>
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={{ color: 'white', marginLeft: 8 }}>Déjà livré</Text>
        </View>
      );
    }
    
    return (
      <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
        <Ionicons name="qr-code-outline" size={24} color="white" />
        <Text style={{ color: 'white', marginLeft: 8 }}>Scanner le QR code</Text>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text>Chargement des dépôts...</Text>
      </View>
    );
  }

  // Rendu pour les erreurs
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Rendu principal
  return (
    <View style={styles.container}>
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