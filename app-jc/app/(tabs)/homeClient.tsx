import { Text, View, FlatList, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { auth, db } from '../../FirebaseConfig';
import { collection, query, where, getDocs, onSnapshot, orderBy, QueryDocumentSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { registerForPushNotifications } from '../service/notificationService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Define proper types for notifications
interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: Timestamp;
  data?: any;
}

const HomeClient = () => {
  // Extract email from local search params
  const { email } = useLocalSearchParams<{ email: string }>();
  const [prenom, setPrenom] = useState<string>('Utilisateur');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Fetch user's first name on component mount
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        if (email) {
          // Find the client document
          const clientsRef = collection(db, "Client");
          const clientQuery = query(clientsRef, where("email", "==", email));
          const clientSnapshot = await getDocs(clientQuery);
          
          if (!clientSnapshot.empty) {
            const clientDoc = clientSnapshot.docs[0];
            const userData = clientDoc.data();
            
            // Safely extract and set prenom
            const fetchedPrenom = userData?.prenom || userData?.nom || 'Utilisateur';
            setPrenom(fetchedPrenom);
          }
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        setPrenom('Utilisateur');
      }
    };

    fetchUserDetails();
  }, [email]);

  // Notification setup effect
  useEffect(() => {
    let unsubscribeFromNotifications: (() => void) | null = null;
    
    // Register for push notifications if needed
    const setupNotifications = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email) {
          // Find the client document
          const clientsRef = collection(db, "Client");
          const clientQuery = query(clientsRef, where("email", "==", currentUser.email));
          const clientSnapshot = await getDocs(clientQuery);
          
          if (!clientSnapshot.empty) {
            const clientDoc = clientSnapshot.docs[0];
            // Register for push notifications with the client document ID
            await registerForPushNotifications(clientDoc.id);
            
            // Fetch recent notifications for this client
            unsubscribeFromNotifications = fetchNotifications(clientDoc.id);
          }
        }
      } catch (error) {
        console.error("Error setting up notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    // Create a notifications collection in Firestore to store notification history
    const fetchNotifications = (clientId: string): (() => void) | null => {
      try {
        // Assuming you have a "Notifications" collection in Firestore
        const notificationsRef = collection(db, "Notifications");
        const notificationQuery = query(
          notificationsRef, 
          where("clientId", "==", clientId),
          orderBy("timestamp", "desc")
        );
        
        // Set up real-time listener for notifications
        const unsubscribe = onSnapshot(notificationQuery, (snapshot) => {
          const notificationList: NotificationItem[] = [];
          snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            notificationList.push({
              id: doc.id,
              ...doc.data()
            } as NotificationItem);
          });
          setNotifications(notificationList);
          setLoading(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setLoading(false);
        return null;
      }
    };

    // Listen for incoming notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in HomeClient:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped in HomeClient:', response);
    });

    // Call the async function, don't try to use its return value directly
    setupNotifications();

    // Clean up listeners when component unmounts
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Safely get the first letter for profile icon
  const getFirstLetter = () => {
    if (!prenom || prenom === 'Utilisateur') return 'U';
    return prenom[0].toUpperCase();
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
        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Vos notifications
          </Text>

          {loading ? (
            <View className="items-center justify-center py-8">
              <Text className="text-gray-600 text-center">
                Chargement des notifications...
              </Text>
            </View>
          ) : notifications.length > 0 ? (
            notifications.map((item) => (
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
            <View className="items-center justify-center py-8">
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeClient;