// services/notificationService.js
import * as Notifications from 'expo-notifications';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig'; // Adjust path according to your structure

// Function to send a push notification
export const sendPushNotification = async (expoPushToken, message) => {
  const messageObject = {
    to: expoPushToken,
    sound: 'default',
    title: message.title,
    body: message.body,
    data: message.data || {},
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageObject),
    });
    
    // Store notification in Firestore if clientId is provided
    if (message.data && message.data.clientId) {
      await saveNotificationToFirestore(message.data.clientId, {
        title: message.title,
        body: message.body,
        data: message.data,
        timestamp: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error(`Error sending push notification: ${error}`);
  }
};

// Corrected function to save notifications to Firestore
export const saveNotificationToFirestore = async (clientId, notificationData) => {
  try {
    // Génération d'un ID personnalisé
    const uniqueID = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notificationRef = doc(db, "Notifications", uniqueID);
    await setDoc(notificationRef, {
      clientId,
      ...notificationData
    });
    console.log('Notification saved to Firestore with ID:', uniqueID);
    return uniqueID;
  } catch (error) {
    console.error('Error saving notification to Firestore:', error);
    return null;
  }
};

// Main function to send delivery notifications
export const sendDeliveryNotifications = async (depot, jour, ville) => {
  try {
    console.log(`🔔 Sending notifications for depot ${depot} in ${ville} on ${jour}`);
    
    // 1. Récupérer les paniers livrés
    const paniersRef = collection(db, "Panier");
    const panierQuery = query(paniersRef, 
      where("depotid", "==", parseInt(depot)),
      where("tourneeid", "==", jour.toLowerCase()),
      where("ville", "==", ville),
      where("statut", "==", "Livré")
    );
    
    const paniersSnapshot = await getDocs(panierQuery);
    console.log(`🔎 DEBUG: Nombre de paniers trouvés: ${paniersSnapshot.size}`);
    
    if (paniersSnapshot.empty) {
      console.log("❌ No delivered baskets found for this depot");
      return;
    }
    
    // 2. Pour chaque panier
    for (const panierDoc of paniersSnapshot.docs) {
      const panierData = panierDoc.data();
      const panierAdresse = panierData.adresse; // Récupérer l'adresse (ex: "adresse_1")
      
      if (!panierAdresse) {
        console.log(`⚠️ No address found for basket ${panierDoc.id}`);
        continue;
      }
      
      // 3. Chercher tous les clients ayant un panier à cette adresse
      const clientsRef = collection(db, "Client");
      const clientsSnapshot = await getDocs(clientsRef);
      
      let clientsForThisBasket = [];
      
      // Filtrer manuellement les clients qui ont un panier à cette adresse
      clientsSnapshot.forEach(clientDoc => {
        const clientData = clientDoc.data();
        // Vérifier si le client a une structure panier avec cette adresse
        if (clientData.panier && clientData.panier[panierAdresse]) {
          clientsForThisBasket.push({
            id: clientDoc.id,
            data: clientData
          });
        }
      });
      
      console.log(`🔍 Found ${clientsForThisBasket.length} clients for basket at address ${panierAdresse}`);
      
      // 4. Envoyer les notifications aux clients trouvés
      for (const client of clientsForThisBasket) {
        const pushToken = client.data.expoPushToken;
        
        if (!pushToken) {
          console.log(`⚠️ No push token for client ${client.data.email || client.id}`);
          continue;
        }
        
        // Envoyer la notification
        await sendPushNotification(pushToken, {
          title: "Votre panier a été livré!",
          body: `Votre panier a été livré au dépôt ${depot} à ${ville}`,
          data: { 
            type: "delivery_completed", 
            panierID: panierDoc.id,
            clientId: client.id
          }
        });
        
        console.log(`✅ Notification sent to client ${client.data.email || client.id}`);
      }
    }
    
    console.log("🎉 All notifications sent successfully");
    
  } catch (error) {
    console.error("Error sending notifications:", error);
  }
};

// Function to register for push notifications
export const registerForPushNotifications = async (clientDocId) => {
  try {
    console.log("Attempting to register notifications for client ID:", clientDocId);
    
    
    // Check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permission not granted for notifications');
      return;
    }
    
    // Get token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    
    // Check that document ID is a non-empty string
    if (!clientDocId || typeof clientDocId !== 'string') {
      console.error('Invalid client document ID:', clientDocId);
      return;
    }
    
    // Check if document exists before updating
    const clientRef = doc(db, "Client", clientDocId);
    const docSnap = await getDoc(clientRef);
    
    if (docSnap.exists()) {
      // Update existing document
      await updateDoc(clientRef, {
        expoPushToken: token
      });
      console.log('Successfully registered for notifications:', token);
    } else {
      console.error(`Client document with ID ${clientDocId} does not exist`);
    }
    
    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    console.error('Error details:', JSON.stringify(error));
  }
};

// Add this line to create a default export
export default { 
  sendPushNotification, 
  sendDeliveryNotifications, 
  registerForPushNotifications,
  saveNotificationToFirestore 
};