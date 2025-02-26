import { Stack } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { registerForPushNotifications } from '../service/notificationService';
import { auth, db } from '../../FirebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const Layout = () => {
  // Définir les refs avec le type correct
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    // Configuration des notifications - cette partie reste inchangée
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Écouteur de notifications - cette partie reste inchangée
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
            
      if (data.type === 'delivery_completed') {
        router.push({
          pathname: '/(tabs)/panierRecap',
          params: { panierID: data.panierID }
        });
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // MODIFICATION : Ne pas enregistrer automatiquement les notifications ici
  // On laisse ClientLogin s'en charger après qu'il a vérifié le document client
  
  // Si vous souhaitez conserver cette fonctionnalité, remplacez par :
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Chercher le document client correspondant à l'email
          const clientsRef = collection(db, "Client");
          const clientQuery = query(clientsRef, where("email", "==", currentUser.email));
          const clientSnapshot = await getDocs(clientQuery);
          
          if (!clientSnapshot.empty) {
            const clientDoc = clientSnapshot.docs[0];
            // Utiliser l'ID du document client, pas l'UID d'authentification
            await registerForPushNotifications(clientDoc.id);
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'enregistrement des notifications:", error);
      }
    };
    
    // N'exécuter cette fonction qu'une seule fois au montage du composant
    // et non à chaque changement d'état d'authentification
    setupNotifications();
    
    // Commentez ou supprimez l'écouteur d'événements d'authentification
    /*
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setupNotifications();
      }
    });
    
    return () => unsubscribe();
    */
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="panierRecap" />
      <Stack.Screen name="deliveryDepot" />
      <Stack.Screen name="scanValidation" />
      <Stack.Screen name="basketScanValidation" />
    </Stack>
  );
};

export default Layout;