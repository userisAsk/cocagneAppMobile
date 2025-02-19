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
  Dimensions,
} from "react-native";
import MapView, { Marker, Polyline, Region, Callout } from "react-native-maps";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../FirebaseConfig";
import { doc, getDoc, DocumentData } from "firebase/firestore";

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
}

interface VilleDepots {
  [key: string]: {
    [key: string]: Depot;
  };
}

// Composant de marqueur numéroté
const NumberedMarker: React.FC<{
  number: number;
  isSelected: boolean;
}> = ({ number, isSelected }) => (
  <View style={[
    styles.markerContainer,
    isSelected ? styles.selectedMarker : styles.normalMarker
  ]}>
    <Text style={styles.markerText}>{number}</Text>
  </View>
);

// Styles
const styles = StyleSheet.create({
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
  markerContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedMarker: {
    backgroundColor: "#3B82F6",
  },
  normalMarker: {
    backgroundColor: "#EF4444",
  },
  markerText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
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
  otherDepotsContainer: {
    margin: 16,
  },
  otherDepotsTitle: {
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
  calloutContainer: {
    padding: 8,
    minWidth: 150,
  },
  calloutText: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 4,
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

  // Paramètres
  const params = useLocalSearchParams();
  const villeNom = params.villeNom as string;
  const jour = params.jour as string;

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
        latitude: 46.603354,
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
    
    const latDelta = Math.max(0.02, (maxLat - minLat) * 1.5);
    const lngDelta = Math.max(0.02, (maxLng - minLng) * 1.5);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const fetchDepots = async (ignoreCache = false) => {
    try {
      setError(null);
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

      const depotsArray = Object.values(villeDepots).map((depot: any) => {
        try {
          return {
            ...depot,
            coordonnées: validateCoordinates(depot.coordonnées),
          };
        } catch (e) {
          console.error(`Erreur de validation des coordonnées pour ${depot.adresse}:`, e);
          throw e;
        }
      });

      setDepots(depotsArray);
      setSelectedDepot(depotsArray[0]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement des données";
      setError(errorMessage);
      Alert.alert("Erreur", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Effect pour le chargement initial
  useEffect(() => {
    fetchDepots();
  }, [villeNom, jour]);

  // Fonction de rafraîchissement
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDepots(true);
  }, [villeNom, jour]);

  // Render functions
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

  const renderMap = () => {
    if (!selectedDepot || depots.length === 0) return null;

    const region = calculateRegion(depots);

    return (
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={region}
          onMapReady={() => setMapReady(true)}
        >
          {depots.map((depot, index) => (
            <Marker
              key={index}
              coordinate={depot.coordonnées}
              tracksViewChanges={false}
              onPress={() => setSelectedDepot(depot)}
            >
              <NumberedMarker
                number={index + 1}
                isSelected={depot === selectedDepot}
              />
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutText}>{depot.adresse}</Text>
                  <Text style={styles.calloutText}>{depot.horaire}</Text>
                </View>
              </Callout>
            </Marker>
          ))}
          {depots.length > 1 && (
            <Polyline
              coordinates={depots.map(depot => depot.coordonnées)}
              strokeColor="#3B82F6"
              strokeWidth={2}
            />
          )}
        </MapView>
      </View>
    );
  };

  const renderDepotInfo = () => (
    <View style={styles.depotInfo}>
      <Text style={styles.depotTitle}>Point de dépôt</Text>
      <Text style={styles.depotAddress}>
        {depots.findIndex(d => d === selectedDepot) + 1}. {selectedDepot?.adresse}
      </Text>
      <Text style={styles.depotHoraire}>Horaire: {selectedDepot?.horaire}</Text>
      {selectedDepot?.num_depot && (
        <Text style={styles.depotNumbers}>
          Numéros de dépôt: {selectedDepot.num_depot.join(", ")}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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

        {depots.length > 1 && (
          <View style={styles.otherDepotsContainer}>
            <Text style={styles.otherDepotsTitle}>
              Autres points de dépôt
            </Text>
            {depots.map((depot, index) =>
              depot !== selectedDepot ? (
                <TouchableOpacity
                  key={index}
                  style={styles.depotCard}
                  onPress={() => setSelectedDepot(depot)}
                >
                  <Text style={styles.depotAddress}>
                    {index + 1}. {depot.adresse}
                  </Text>
                  <Text style={styles.depotHoraire}>{depot.horaire}</Text>
                </TouchableOpacity>
              ) : null
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default DeliveryDepot;