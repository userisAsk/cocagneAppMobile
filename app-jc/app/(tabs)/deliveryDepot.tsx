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
    ordre?: number; // Nouvel attribut pour l'ordre
  }

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

        // Transformer en tableau avec ordre
        const depotsArray = Object.entries(villeDepots)
    .map(([key, depot]: [string, any]) => {
      try {
        return {
          ...depot,
          coordonnées: validateCoordinates(depot.coordonnées),
        };
      } catch (e) {
        console.error(`Erreur de validation des coordonnées pour ${depot.adresse}:`, e);
        throw e;
      }
    })
    .sort((a, b) => a.ordre - b.ordre);

        console.log('Dépôts chargés:', JSON.stringify(depotsArray, null, 2));
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

    // Trouver le prochain dépôt
    const getNextDepot = (currentDepot: Depot | null): Depot | null => {
      if (!currentDepot || depots.length <= 1) return null;
      
      const currentIndex = depots.findIndex(d => d.ordre === currentDepot.ordre);
      if (currentIndex === -1 || currentIndex === depots.length - 1) return null;
      
      return depots[currentIndex + 1];
    };

    // Composant pour le marqueur personnalisé
    const CustomMarker = ({ depot, isSelected }: { depot: Depot, isSelected: boolean }) => (
      <Marker
        coordinate={depot.coordonnées}
        title={`${depot.ordre}. ${depot.adresse}`}
        description={depot.horaire}
        tracksViewChanges={false}
      >
        <View style={[
          styles.markerContainer,
          isSelected && styles.selectedMarkerContainer
        ]}>
          <Text style={styles.markerText}>{depot.ordre}</Text>
        </View>
      </Marker>
    );

    // Rendu du header
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

    // Rendu de la carte
    const renderMap = () => {
      if (!selectedDepot || depots.length === 0) return null;

      const region = calculateRegion(depots);
      const nextDepot = getNextDepot(selectedDepot);

      return (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={region}
            onMapReady={() => setMapReady(true)}
          >
            {/* Marqueur pour le dépôt sélectionné */}
            <CustomMarker depot={selectedDepot} isSelected={true} />
            
            {/* Marqueur pour le prochain dépôt (si disponible) */}
            {nextDepot && (
              <CustomMarker depot={nextDepot} isSelected={false} />
            )}
            
            {/* Ligne reliant le dépôt courant au suivant */}
            {nextDepot && (
              <Polyline
                coordinates={[selectedDepot.coordonnées, nextDepot.coordonnées]}
                strokeColor="#3B82F6"
                strokeWidth={2}
              />
            )}
          </MapView>
        </View>
      );
    };

    // Rendu des informations du dépôt
    const renderDepotInfo = () => (
      <View style={styles.depotInfo}>
        <Text style={styles.depotTitle}>Point de dépôt #{selectedDepot?.ordre}</Text>
        <Text style={styles.depotAddress}>{selectedDepot?.adresse}</Text>
        <Text style={styles.depotHoraire}>Horaire: {selectedDepot?.horaire}</Text>
        {selectedDepot?.num_depot && (
          <Text style={styles.depotNumbers}>
            Numéros de dépôt: {selectedDepot.num_depot.join(", ")}
          </Text>
        )}
      </View>
    );

    // Rendu du prochain dépôt
    const renderNextDepot = () => {
      const nextDepot = getNextDepot(selectedDepot);
      if (!nextDepot) return null;

      return (
        <View style={styles.nextDepotContainer}>
          <Text style={styles.nextDepotTitle}>
            Prochain point de dépôt
          </Text>
          <TouchableOpacity
            style={styles.depotCard}
            onPress={() => setSelectedDepot(nextDepot)}
          >
            <Text style={styles.depotTitle}>Point #{nextDepot.ordre}</Text>
            <Text style={styles.depotAddress}>{nextDepot.adresse}</Text>
            <Text style={styles.depotHoraire}>{nextDepot.horaire}</Text>
          </TouchableOpacity>
        </View>
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
    


    const renderScanButton = () => (
      <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
        <Ionicons name="qr-code-outline" size={24} color="white" />
        <Text style={styles.scanButton}>Scanner le QR code</Text>
      </TouchableOpacity>
    );

    // Gestion des états de chargement et d'erreur
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
          {renderNextDepot()}
        </ScrollView>
      </View>
    );
  };

  export default DeliveryDepot;