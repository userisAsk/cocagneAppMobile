import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../FirebaseConfig';
import { collection, query, where, getDocs, DocumentData, updateDoc, doc } from 'firebase/firestore';

// Types
interface Panier {
  familial: number;
  oeuf: number;
  simple: number;
}

interface PanierData {
  id: string;
  panier: Panier;
  statut: string;
  ville: string;
  adresse: string;
  tourneeid: string;
  commentaire?: string;
}

interface RouteParams {
  villeNom: string;
  jour: string;
}

interface Totals {
  familial: number;
  oeuf: number;
  simple: number;
}

const PanierRecap = () => {
  // Navigation & Route
  const navigation = useNavigation();
  const route = useRoute();
  const { villeNom, jour } = route.params as RouteParams;

  // States
  const [paniers, setPaniers] = useState<PanierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals>({
    familial: 0,
    oeuf: 0,
    simple: 0
  });

  // Fetch data
  useEffect(() => {
    let isMounted = true;
  
    const fetchPaniers = async () => {
      try {
        setLoading(true);
  
        // 🔥 Optimisation : on filtre directement côté Firestore avec where()
        const q = query(
          collection(db, "Panier"),
          where("ville", "==", villeNom.trim()), 
          where("tourneeid", "==", jour.toLowerCase().trim())
        );
  
        const snapshot = await getDocs(q);
        const filteredDocs: PanierData[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            panier: {
              familial: Number(data.panier?.familial) || 0,
              oeuf: Number(data.panier?.oeuf) || 0,
              simple: Number(data.panier?.simple) || 0,
            },
            statut: data.statut || "En attente",
            ville: data.ville,
            adresse: data.adresse || "Adresse non spécifiée",
            tourneeid: data.tourneeid,
            commentaire: data.commentaire,
          };
        });
  
        if (isMounted) {
          if (filteredDocs.length === 0) {
            setError(`Aucun panier à livrer pour ${villeNom} le ${jour}`);
          } else {
            setPaniers(filteredDocs);
            // Mise à jour des totaux
            setTotals({
              familial: filteredDocs.reduce((sum, p) => sum + p.panier.familial, 0),
              oeuf: filteredDocs.reduce((sum, p) => sum + p.panier.oeuf, 0),
              simple: filteredDocs.reduce((sum, p) => sum + p.panier.simple, 0),
            });
          }
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Erreur Firestore:", error);
          setError("Une erreur est survenue lors du chargement des paniers.");
          setLoading(false);
        }
      }
    };
  
    fetchPaniers();
  
    return () => {
      isMounted = false;
    };
  }, [villeNom, jour]); // Dépendances
  

  // Handlers
  const handleStatusUpdate = async (panierId: string, newStatus: string) => {
    try {
      const panierRef = doc(db, "Panier", panierId);
      await updateDoc(panierRef, {
        statut: newStatus
      });

      // Update local state
      setPaniers(current =>
        current.map(panier =>
          panier.id === panierId
            ? { ...panier, statut: newStatus }
            : panier
        )
      );

      Alert.alert('Succès', 'Statut mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  // Render Header
  const renderHeader = () => (
    <View className="flex-row items-center justify-between mb-6">
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="p-2"
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
      <Text className="text-xl font-bold flex-1 ml-3">
        {villeNom}
      </Text>
    </View>
  );

  // Render Summary
  const renderTotals = () => (
    <View className="bg-blue-100 p-4 rounded-lg mb-6">
      <Text className="text-xl font-bold text-blue-800 mb-3">
        Récapitulatif
      </Text>
      <View className="space-y-2">
        {totals.familial > 0 && (
          <Text className="text-blue-700 font-medium">
            {totals.familial} Panier{totals.familial > 1 ? 's' : ''} Familial{totals.familial > 1 ? 's' : ''}
          </Text>
        )}
        {totals.oeuf > 0 && (
          <Text className="text-blue-700 font-medium">
            {totals.oeuf} Boîte{totals.oeuf > 1 ? 's' : ''} d'Œufs
          </Text>
        )}
        {totals.simple > 0 && (
          <Text className="text-blue-700 font-medium">
            {totals.simple} Panier{totals.simple > 1 ? 's' : ''} Simple{totals.simple > 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );

  // Render Status Button
  const renderStatusButton = (panier: PanierData) => (
    <TouchableOpacity
      className={`px-4 py-2 rounded-lg ${
        panier.statut === "Livré" 
          ? "bg-green-100" 
          : panier.statut === "En cours" 
          ? "bg-orange-100"
          : "bg-gray-100"
      }`}
      onPress={() => {
        Alert.alert(
          'Mise à jour du statut',
          'Choisir le nouveau statut',
          [
            {
              text: 'En attente',
              onPress: () => handleStatusUpdate(panier.id, 'En attente')
            },
            {
              text: 'En cours',
              onPress: () => handleStatusUpdate(panier.id, 'En cours')
            },
            {
              text: 'Livré',
              onPress: () => handleStatusUpdate(panier.id, 'Livré')
            },
            {
              text: 'Annuler',
              style: 'cancel'
            }
          ]
        );
      }}
    >
      <Text className={`font-medium ${
        panier.statut === "Livré" 
          ? "text-green-700" 
          : panier.statut === "En cours" 
          ? "text-orange-700"
          : "text-gray-700"
      }`}>
        {panier.statut}
      </Text>
    </TouchableOpacity>
  );

  // Render Paniers List
  const renderPaniersList = () => (
    <View className="space-y-4">
      {paniers.map((panier) => (
        <View key={panier.id} className="bg-white p-4 rounded-lg shadow-sm">
          <View className="flex-row justify-between items-start mb-3">
            <Text className="text-lg font-semibold flex-1">
              {panier.adresse}
            </Text>
            {renderStatusButton(panier)}
          </View>
          
          <View className="space-y-1">
            {panier.panier.familial > 0 && (
              <Text className="text-gray-600">
                {panier.panier.familial} Panier{panier.panier.familial > 1 ? 's' : ''} Familial{panier.panier.familial > 1 ? 's' : ''}
              </Text>
            )}
            {panier.panier.oeuf > 0 && (
              <Text className="text-gray-600">
                {panier.panier.oeuf} Boîte{panier.panier.oeuf > 1 ? 's' : ''} d'Œufs
              </Text>
            )}
            {panier.panier.simple > 0 && (
              <Text className="text-gray-600">
                {panier.panier.simple} Panier{panier.panier.simple > 1 ? 's' : ''} Simple{panier.panier.simple > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {panier.commentaire && (
            <Text className="mt-2 text-gray-500 italic">
              Note: {panier.commentaire}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  // Loading State
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View className="flex-1 bg-white p-4">
        {renderHeader()}
        <View className="flex-1 justify-center items-center">
          <Text className="text-red-500 text-lg text-center mb-4">
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">
              Retour
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main Render
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {renderHeader()}
        {renderTotals()}
        {renderPaniersList()}
      </View>
    </ScrollView>
  );
};

export default PanierRecap;