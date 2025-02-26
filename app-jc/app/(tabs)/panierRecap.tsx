import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../FirebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

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
  nomadd: string;
  tourneeid: string;
  commentaire?: string;
}

interface Totals {
  familial: number;
  oeuf: number;
  simple: number;
}

const PanierRecap = () => {
  const params = useLocalSearchParams();
  const villeNom = params.villeNom as string;
  const jour = params.jour as string;

  const [paniers, setPaniers] = useState<PanierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals>({
    familial: 0,
    oeuf: 0,
    simple: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchPaniers = async () => {
      try {
        setLoading(true);
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
            nomadd: data.nomadd,
            tourneeid: data.tourneeid,
            commentaire: data.commentaire,
          };
        });

        if (isMounted) {
          if (filteredDocs.length === 0) {
            setError(`Aucun panier à livrer pour ${villeNom} le ${jour}`);
          } else {
            setPaniers(filteredDocs);
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
  }, [villeNom, jour]);

  const handleStatusUpdate = async (panierId: string, newStatus: string) => {
    try {
      const panierRef = doc(db, "Panier", panierId);
      await updateDoc(panierRef, {
        statut: newStatus,
      });

      setPaniers((current) =>
        current.map((panier) =>
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

  const handleNextStep = () => {
    router.push({
      pathname: '/(tabs)/deliveryDepot',
      params: { villeNom, jour }
    });
  };

  const renderHeader = () => (
    <View className="flex-row items-center justify-between mb-4 pt-10">
      <TouchableOpacity onPress={() => router.back()} className="p-3">
        <Ionicons name="arrow-back" size={24} color="#3B82F6" />
      </TouchableOpacity>
      <Text className="text-2xl font-bold text-blue-700 text-center flex-1 pr-11">
        Panier - {villeNom}
      </Text>
    </View>
  );

  const renderTotals = () => (
    <View className="bg-blue-100 p-4 rounded-lg mb-4">
      <Text className="text-xl font-bold text-blue-800 mb-3">Récapitulatif</Text>
      <View className="my-2">
        {totals.familial > 0 && (
          <Text className="text-blue-800 text-lg">
            {totals.familial} Panier{totals.familial > 1 ? 's' : ''} Familial{totals.familial > 1 ? 's' : ''}
          </Text>
        )}
        {totals.oeuf > 0 && (
          <Text className="text-blue-800 text-lg">
            {totals.oeuf} Boîte{totals.oeuf > 1 ? 's' : ''} d'Œufs
          </Text>
        )}
        {totals.simple > 0 && (
          <Text className="text-blue-800 text-lg">
            {totals.simple} Panier{totals.simple > 1 ? 's' : ''} Simple{totals.simple > 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );

  const renderStatusButton = (panier: PanierData) => (
    <TouchableOpacity
      className={`px-4 py-2 rounded-full ${
        panier.statut === "Livré"
          ? 'bg-green-100'
          : panier.statut === "En cours"
          ? 'bg-yellow-200'
          : 'bg-blue-100'
      } items-center justify-center`}
      onPress={() => {
        Alert.alert(
          'Mise à jour du statut',
          'Choisir le nouveau statut',
          [
            {
              text: 'En attente',
              onPress: () => handleStatusUpdate(panier.id, 'En attente'),
            },
            {
              text: 'En cours',
              onPress: () => handleStatusUpdate(panier.id, 'En cours'),
            },
            {
              text: 'Livré',
              onPress: () => handleStatusUpdate(panier.id, 'Livré'),
            },
            {
              text: 'Annuler',
              style: 'cancel',
            },
          ]
        );
      }}
    >
      <Text className={`font-semibold ${
        panier.statut === "Livré"
          ? 'text-teal-800'
          : panier.statut === "En cours"
          ? 'text-yellow-800'
          : 'text-blue-800'
      }`}>
        {panier.statut}
      </Text>
    </TouchableOpacity>
  );

  const renderPaniersList = () => (
    <View className="my-4">
      {paniers.map((panier) => (
        <View key={panier.id} className="bg-white p-4 rounded-lg mb-3 shadow-sm shadow-blue-500/50 ...">
          <View className="flex-row justify-between items-start mb-3">
            <Text className="text-lg font-semibold text-gray-800 flex-1">
              {panier.nomadd}
            </Text>
            {renderStatusButton(panier)}
          </View>
          <View className="mb-3">
            {panier.panier.familial > 0 && (
              <Text className="text-gray-600 text-lg">
                {panier.panier.familial} Panier{panier.panier.familial > 1 ? 's' : ''} Familial{panier.panier.familial > 1 ? 's' : ''}
              </Text>
            )}
            {panier.panier.oeuf > 0 && (
              <Text className="text-gray-600 text-lg">
                {panier.panier.oeuf} Boîte{panier.panier.oeuf > 1 ? 's' : ''} d'Œufs
              </Text>
            )}
            {panier.panier.simple > 0 && (
              <Text className="text-gray-600 text-lg">
                {panier.panier.simple} Panier{panier.panier.simple > 1 ? 's' : ''} Simple{panier.panier.simple > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {panier.commentaire && (
            <Text className="mt-2 text-gray-600 italic">
              Note: {panier.commentaire}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  const renderNextButton = () => (
    <TouchableOpacity
      onPress={handleNextStep}
      className="bg-blue-600 rounded-lg py-4 items-center mb-6"
    >
      <Text className="text-white font-bold text-lg">
        Suivant: Livraison par dépôt
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-white p-4">
        {renderHeader()}
        <View className="flex-1 justify-center items-center">
          <Text className="text-red-600 text-xl text-center mb-4">
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-blue-600 py-3 px-6 rounded-lg"
          >
            <Text className="text-white font-semibold">
              Retour
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="p-4">
        {renderHeader()}
        {renderTotals()}
        {renderPaniersList()}
        {renderNextButton()}
      </View>
    </ScrollView>
  );
};

export default PanierRecap;