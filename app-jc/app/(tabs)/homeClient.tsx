import { Text, View, FlatList, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { auth, db } from '../../FirebaseConfig';
import { collection, query, where, getDocs, onSnapshot, orderBy, QueryDocumentSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { registerForPushNotifications } from '../service/notificationService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { isLoggingOut } from '..//(tabs)/profile';

// Define proper types for notifications and paniers
interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: Timestamp;
  data?: any;
}

interface PanierItem {
  id: string;
  statut?: string;
  panierCode?: { codeFamilial: string };
  nomadd?: string;
  tourneeid?: string; // Changé de tourneeId à tourneeid
  adresse?: string;
  depotid?: number;
  ville?: string;
  typePanier?: string;
  clientPanierInfo?: {
    familial?: number;
    simple?: number;
    jour?: string;
    oeuf?: boolean;
  };
}

const HomeClient = () => {
  // Extract email from local search params
  const { email } = useLocalSearchParams<{ email: string }>();
  const [prenom, setPrenom] = useState<string>('Utilisateur');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [paniers, setPaniers] = useState<PanierItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Référence pour stocker la fonction de nettoyage du listener Firestore
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Fetch user's first name and paniers on component mount
  useEffect(() => {
    const fetchUserDetailsAndPaniers = async () => {
      try {
        console.log("Email reçu:", email);
  
        if (email) {
          // Find the client document
          const clientsRef = collection(db, "Client");
          const clientQuery = query(clientsRef, where("email", "==", email));
          const clientSnapshot = await getDocs(clientQuery);
  
          if (!clientSnapshot.empty) {
            const clientDoc = clientSnapshot.docs[0];
            const userData = clientDoc.data();
            console.log("Données utilisateur récupérées:", userData);
  
            // Safely extract and set prenom
            const fetchedPrenom = userData?.prenom || userData?.nom || 'Utilisateur';
            setPrenom(fetchedPrenom);
  
            // Check if user has panier data
            if (userData?.panier) {
              const userPanierAddresses = Object.keys(userData.panier);
              console.log("Adresses de panier du client:", userPanierAddresses);
  
              if (userPanierAddresses.length > 0) {
                // Get all paniers that match any of the client's panier addresses
                const paniersRef = collection(db, 'Panier');
                const allClientPaniers = [];
  
                // Query each address separately for paniers
                for (const address of userPanierAddresses) {
                  const paniersQuery = query(
                    paniersRef, 
                    where('adresse', '==', address)
                  );
                  const paniersSnapshot = await getDocs(paniersQuery);
  
                  const addressPaniers = paniersSnapshot.docs.map(doc => {
                    const panierData = doc.data();
                    // Add the client's panier specifics for this address
                    const clientPanierInfo = userData.panier[address];
                    
                    return {
                      id: doc.id,
                      ...panierData,
                      clientPanierInfo: clientPanierInfo, // Add client's panier info
                      typePanier: clientPanierInfo?.familial === 1 ? 'Familial' : 
                                  clientPanierInfo?.simple === 1 ? 'Simple' : 'Standard'
                    };
                  });
                  
                  console.log(`Paniers trouvés pour adresse ${address}:`, addressPaniers.length);
                  allClientPaniers.push(...addressPaniers);
                }
  
                setPaniers(allClientPaniers);
              } else {
                console.log("Aucune adresse de panier trouvée pour cet utilisateur.");
              }
            } else {
              console.log("Aucune structure de panier trouvée pour cet utilisateur.");
            }
          } else {
            console.log("Aucun client trouvé avec cet email.");
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des détails utilisateur:", error);
        setPrenom('Utilisateur');
      } finally {
        setLoading(false);
      }
    };
  
    fetchUserDetailsAndPaniers();
  }, [email]);
  

  // Notification setup effect 
  useEffect(() => {
    let notificationListener: Notifications.Subscription;
    let responseListener: Notifications.Subscription;
    
    const authCheckInterval = setInterval(() => {
      if (isLoggingOut && unsubscribeRef.current) {
        console.log("Détection de déconnexion, nettoyage des listeners");
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }, 100);
    
    const setupNotifications = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email) {
          const clientsRef = collection(db, "Client");
          const clientQuery = query(clientsRef, where("email", "==", currentUser.email));
          const clientSnapshot = await getDocs(clientQuery);
          
          if (!clientSnapshot.empty) {
            const clientDoc = clientSnapshot.docs[0];
            await registerForPushNotifications(clientDoc.id);
            
            const unsubscribe = fetchNotifications(clientDoc.id);
            if (unsubscribe) {
              unsubscribeRef.current = unsubscribe;
            }
          }
        }
      } catch (error) {
        console.error("Error setting up notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchNotifications = (clientId: string): (() => void) | null => {
      try {
        const notificationsRef = collection(db, "Notifications");
        const notificationQuery = query(
          notificationsRef, 
          where("clientId", "==", clientId),
          orderBy("timestamp", "desc")
        );
        
        const unsubscribe = onSnapshot(notificationQuery, 
          (snapshot) => {
            if (isLoggingOut) {
              console.log("Réception de données ignorée car déconnexion en cours");
              return;
            }
            
            const notificationList: NotificationItem[] = [];
            snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
              notificationList.push({
                id: doc.id,
                ...doc.data()
              } as NotificationItem);
            });
            setNotifications(notificationList);
          }, 
          (error) => {
            if (error.code === 'permission-denied') {
              console.log("Permission denied - user likely signed out");
              if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
              }
            } else {
              console.error("Error in notification listener:", error);
            }
          }
        );
        
        return unsubscribe;
      } catch (error) {
        console.error("Error setting up notification listener:", error);
        setLoading(false);
        return null;
      }
    };

    notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in HomeClient:', notification);
    });

    responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped in HomeClient:', response);
    });

    setupNotifications();

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
      
      clearInterval(authCheckInterval);
      
      if (unsubscribeRef.current) {
        console.log("Nettoyage du listener Firestore au démontage du composant");
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Safely get the first letter for profile icon
  const getFirstLetter = () => {
    if (!prenom || prenom === 'Utilisateur') return 'U';
    return prenom[0].toUpperCase();
  };

  // Render panier status
  const renderPanierStatus = (panier: PanierItem) => {
    switch (panier.statut) {
      case 'Livré':
        return (
          <View className="bg-green-100 px-2 py-1 rounded-full">
            <Text className="text-green-800 text-xs">Livré</Text>
          </View>
        );
      case 'En cours':
        return (
          <View className="bg-yellow-100 px-2 py-1 rounded-full">
            <Text className="text-yellow-800 text-xs">En cours</Text>
          </View>
        );
      default:
        return (
          <View className="bg-gray-100 px-2 py-1 rounded-full">
            <Text className="text-gray-800 text-xs">{panier.statut || 'Statut inconnu'}</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 40 }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-bold text-gray-900">
              Bonjour, {prenom}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              Vous avez {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/profile')}
            className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center"
          >
            <Text className="text-white text-lg font-bold">
              {getFirstLetter()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Vos notifications
          </Text>

          {loading ? (
            <View className="items-center justify-center py-4">
              <Text className="text-gray-600 text-center">
                Chargement des notifications...
              </Text>
            </View>
          ) : notifications.length > 0 ? (
            notifications.slice(0, 2).map((item) => (
              <View 
                key={item.id} 
                className="bg-gray-100 p-4 rounded-lg mb-4 border border-gray-200"
              >
                <View className="flex-row items-center mb-2">
                  <Ionicons 
                    name="notifications-outline" 
                    size={20} 
                    color="#3b82f6" 
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base font-semibold text-gray-900 flex-1">
                    {item.title}
                  </Text>
                </View>
                <Text className="text-sm text-gray-700 mb-2">
                  {item.body}
                </Text>
                <Text className="text-xs text-gray-500 text-right">
                  {item.timestamp 
                    ? new Date(item.timestamp.toDate()).toLocaleString() 
                    : 'À l\'instant'}
                </Text>
              </View>
            ))
          ) : (
            <View className="items-center justify-center py-4">
              <Ionicons 
                name="notifications-off-outline" 
                size={64} 
                color="#d1d5db" 
                style={{ marginBottom: 16 }}
              />
              <Text className="text-gray-600 text-center">
                Aucune notification pour le moment
              </Text>
            </View>
          )}
        </View>

        {/* Paniers Section */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Vos Paniers
          </Text>

          {loading ? (
            <View className="items-center justify-center py-4">
              <Text className="text-gray-600 text-center">
                Chargement de vos paniers...
              </Text>
            </View>
          ) : paniers.length > 0 ? (
            paniers.map((panier) => (
              <TouchableOpacity 
                key={panier.id}
                className="bg-white rounded-lg p-4 mb-4 shadow-md border border-gray-100"
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-lg font-semibold text-gray-900">
                    Panier {panier.typePanier || 'Standard'}
                  </Text>
                  {renderPanierStatus(panier)}
                </View>
                <View className="flex-row items-center mb-1">
                  <Ionicons name="location-outline" size={16} color="#4b5563" />
                  <Text className="ml-2 text-gray-700">
                    {panier.nomadd || 'Adresse non spécifiée'}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={16} color="#4b5563" />
                  <Text className="ml-2 text-gray-700">
                    Tournée {panier.tourneeid || 'Non assignée'}
                  </Text>
                </View>
                
                {/* Informations supplémentaires sur le panier */}
                {panier.clientPanierInfo && (
                  <View className="mt-2 pt-2 border-t border-gray-100">
                    <View className="flex-row">
                      <Text className="text-xs text-gray-500">Jour de livraison: </Text>
                      <Text className="text-xs font-medium text-gray-700 ml-1">
                        {panier.clientPanierInfo.jour || 'Non spécifié'}
                      </Text>
                    </View>
                    {panier.clientPanierInfo.oeuf && (
                      <View className="flex-row mt-1">
                        <Ionicons name="egg-outline" size={14} color="#4b5563" />
                        <Text className="text-xs font-medium text-gray-700 ml-1">
                          Avec œufs
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View className="items-center justify-center py-8">
              <Ionicons 
                name="basket-outline" 
                size={64} 
                color="#d1d5db" 
                style={{ marginBottom: 16 }}
              />
              <Text className="text-gray-600 text-center">
                Aucun panier trouvé
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeClient;