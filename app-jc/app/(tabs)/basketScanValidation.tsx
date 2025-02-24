import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Camera } from 'expo-camera';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../FirebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useLocalSearchParams, router } from 'expo-router';

interface Panier {
  id: string;
  panier: {
    familial: number;
    oeuf: number;
    simple: number;
  };
  panierCode: {
    codeFamilial: number | null;
    codeSimple: number | null;
  };
  statut: string;
  adresse: string;
}

interface PanierItem {
  type: 'familial' | 'simple' | 'oeuf';
  quantity: number;
  code: number | null;
  scannedCount: number; // Changed from boolean scanned to count
}

const BasketScanValidation: React.FC = () => {
  const { depotId, villeNom, jour } = useLocalSearchParams();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [paniers, setPaniers] = useState<Panier[]>([]);
  const scannedRef = useRef(false); // Nouvelle variable pour éviter le spam de scan
  const [allPaniersValidated, setAllPaniersValidated] = useState(false);
  const [currentPanier, setCurrentPanier] = useState<Panier | null>(null);
  const [loading, setLoading] = useState(true);
  const [depotInfo, setDepotInfo] = useState<any>(null);
  const [scanDisabled, setScanDisabled] = useState(false);
  const [allScanned, setAllScanned] = useState(false);
  const [isValidationModalVisible, setIsValidationModalVisible] = useState(false);
  const [currentScanType, setCurrentScanType] = useState<'familial' | 'simple' | 'oeuf' | null>(null);
  const [panierItems, setPanierItems] = useState<PanierItem[]>([]);

  useEffect(() => {
    const isAllScanned = panierItems.every(item => item.scannedCount >= item.quantity);
    setAllScanned(isAllScanned);
    console.log("🔍 Mise à jour automatique de allScanned :", isAllScanned);
  }, [panierItems]);
  
  
  useEffect(() => {
    console.log("📦 panierItems mis à jour :", panierItems);
  }, [panierItems]);
  

  // Request camera permissions and fetch baskets
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // Load depot info first
      if (typeof depotId === 'string') {
        await fetchDepotInfo();
      }
      
      // Load baskets for this depot/ville
      await fetchPaniers();
    })();
  }, [depotId, villeNom, jour]);
  
  // When current panier changes, update panierItems
  useEffect(() => {
    if (currentPanier) {
      const items: PanierItem[] = [];
      
      // Add familial baskets if any
      if (currentPanier.panier.familial > 0) {
        items.push({
          type: 'familial',
          quantity: currentPanier.panier.familial,
          code: currentPanier.panierCode?.codeFamilial || null,
          scannedCount: 0 // Initialize with 0 scanned
        });
      }
      
      // Add simple baskets if any
      if (currentPanier.panier.simple > 0) {
        items.push({
          type: 'simple',
          quantity: currentPanier.panier.simple,
          code: currentPanier.panierCode?.codeSimple || null,
          scannedCount: 0 // Initialize with 0 scanned
        });
      }
      
      // Add eggs if any
      if (currentPanier.panier.oeuf > 0) {
        items.push({
          type: 'oeuf',
          quantity: currentPanier.panier.oeuf,
          code: null, // Assuming eggs don't have a code
          scannedCount: 0 // Initialize with 0 scanned
        });
      }
      
      setPanierItems(items);
    }
  }, [currentPanier]);

  const fetchDepotInfo = async () => {
    try {
      if (typeof jour !== 'string' || typeof villeNom !== 'string' || typeof depotId !== 'string') {
        throw new Error("Paramètres manquants ou invalides");
      }
  
      console.log(`Chargement pour: jour=${jour}, ville=${villeNom}, depotId=${depotId}`);
      
      const tourneeRef = doc(db, "Tournee", jour.toLowerCase());
      const tourneeSnap = await getDoc(tourneeRef);
  
      if (!tourneeSnap.exists()) {
        throw new Error("Tournée non trouvée");
      }
  
      const tourneeData = tourneeSnap.data();
      const villes = tourneeData.villes;
  
      if (!villes[villeNom]) {
        throw new Error(`Ville ${villeNom} non trouvée dans la tournée`);
      }
  
      const villeDepots = villes[villeNom];
      
      // Convert depotId to number for comparison
      const depotIdNumber = parseInt(depotId);
      let foundDepot = null;
      
      // Iterate through all address entries (adresse_1, adresse_2, etc.)
      for (const addressKey in villeDepots) {
        const depot = villeDepots[addressKey];
        
        // Check if num_depot exists and is an array
        if (depot.num_depot && Array.isArray(depot.num_depot)) {
          // Check if the depotId is in the num_depot array
          if (depot.num_depot.includes(depotIdNumber)) {
            foundDepot = depot;
            break;
          }
        }
      }
      
      if (!foundDepot) {
        throw new Error(`Dépôt #${depotId} non trouvé dans la ville ${villeNom}`);
      }
      
      // Set depot info
      setDepotInfo(foundDepot);
      
    } catch (error) {
      console.error("Erreur lors du chargement des informations du dépôt:", error);
      Alert.alert("Erreur", error instanceof Error ? error.message : "Erreur inconnue");
    }
  };

  const fetchPaniers = async () => {
    try {
      setLoading(true);
  
      // Parameter validation
      if (typeof villeNom !== 'string' || typeof jour !== 'string' || typeof depotId !== 'string') {
        throw new Error("Paramètres manquants");
      }
  
      // Get Tournee document
      const tourneeRef = doc(db, "Tournee", jour.toLowerCase());
      const tourneeSnap = await getDoc(tourneeRef);
  
      if (!tourneeSnap.exists()) {
        throw new Error("Tournée non trouvée");
      }
  
      // Get ville data and find depot
      const tourneeData = tourneeSnap.data();
      const villeDepots = tourneeData.villes[villeNom];
      
      if (!villeDepots) {
        throw new Error(`Ville ${villeNom} non trouvée dans la tournée`);
      }
      
      const depotIdNumber = parseInt(depotId);
  
      // Find matching depot and get address key
      let depotAddressKey = null;
      let depotFullAddress = null;
      
      for (const addressKey in villeDepots) {
        const depot = villeDepots[addressKey];
        
        if (depot.num_depot && Array.isArray(depot.num_depot) && 
            depot.num_depot.includes(depotIdNumber)) {
          depotAddressKey = "adresse_" + addressKey.split('_')[1];
          depotFullAddress = depot.adresse;
          break;
        }
      }
  
      if (!depotAddressKey) {
        throw new Error(`Dépôt #${depotId} non trouvé dans ${villeNom}`);
      }
  
      // Query for baskets
      const q = query(
        collection(db, "Panier"),
        where("tourneeid", "==", jour.toLowerCase().trim()),
        where("statut", "in", ["En attente", "En cours"]),
        where("adresse", "==", depotAddressKey)
      );
  
      // Get and process baskets
      const snapshot = await getDocs(q);
  
      const paniersData = snapshot.docs.map((doc) => {
        const data = doc.data();
  
        // Log the raw data to see the actual structure
        console.log("Raw panier data:", JSON.stringify(data));
  
        const panierCounts = {
          familial: Number(data.panier?.familial) || 0,
          oeuf: Number(data.panier?.oeuf) || 0,
          simple: Number(data.panier?.simple) || 0
        };
  
        // Check both possible field names for the codes
        const panierCodes = {
          codeFamilial: data.panierCode?.codeFamilial || data.codeFamilial || null,
          codeSimple: data.panierCode?.codeSimple || data.codeSimple || null
        };
  
        // Convert codes to numbers if they exist
        if (panierCodes.codeFamilial) panierCodes.codeFamilial = Number(panierCodes.codeFamilial);
        if (panierCodes.codeSimple) panierCodes.codeSimple = Number(panierCodes.codeSimple);
  
        // Log the extracted codes for debugging
        console.log(`Basket codes extracted - Familial: ${panierCodes.codeFamilial}, Simple: ${panierCodes.codeSimple}`);
  
        return {
          id: doc.id,
          panier: panierCounts,
          panierCode: panierCodes,
          statut: data.statut || "En attente",
          adresse: depotFullAddress || data.adresse,
        };
      });
  
      // Update state
      setPaniers(paniersData);
  
      if (paniersData.length > 0) {
        setCurrentPanier(paniersData[0]);
      } else {
        console.log("No baskets found for this depot");
      }
  
    } catch (error) {
      console.error("❌ Error in fetchPaniers:", error);
      Alert.alert(
        "Erreur", 
        error instanceof Error 
          ? `Erreur lors du chargement des paniers: ${error.message}` 
          : "Erreur inconnue lors du chargement des paniers"
      );
    } finally {
      setLoading(false);
    }
  };

  const startScanning = (type: 'familial' | 'simple' | 'oeuf') => {
    scannedRef.current = false; // 🔄 Réinitialiser le scan pour le nouveau panier
    setScanDisabled(false); // Assurer que le scan est activé
    setCurrentScanType(type);
    setIsScannerVisible(true);
};


  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    console.log(`📸 scanDisabled: ${scanDisabled}, scanned: ${scannedRef.current}`);

    // Empêche le scan si déjà scanné ou désactivé
    if (scannedRef.current || scanDisabled || !currentPanier || !currentScanType || !result?.data) {
        console.log("⛔ Scan ignoré (déjà scanné ou désactivé)");
        return;
    }

    scannedRef.current = true; // Désactive immédiatement le scan pour éviter les scans multiples
    const scannedCode = parseInt(result.data);
    console.log(`🔍 Code scanné: ${scannedCode}`);

    const expectedCode = currentScanType === 'familial' 
        ? currentPanier.panierCode?.codeFamilial 
        : currentScanType === 'simple' 
            ? currentPanier.panierCode?.codeSimple 
            : null;

    if (expectedCode === null) {
        Alert.alert("Erreur", `Le panier ${currentScanType} n'a pas de code QR associé.`);
        setTimeout(() => { scannedRef.current = false; }, 1000); // Réactivation rapide en cas d'erreur
        return;
    }

    if (scannedCode === expectedCode) {
        console.log("✅ Code QR valide !");
        
        const itemIndex = panierItems.findIndex(item => item.type === currentScanType);
        if (itemIndex === -1) {
            console.log("❌ Erreur : Type de panier introuvable");
            setTimeout(() => { scannedRef.current = false; }, 1000);
            return;
        }

        const item = panierItems[itemIndex];

        if (item.scannedCount >= item.quantity) {
            Alert.alert("Déjà scanné", `Tous les paniers ${currentScanType} ont déjà été validés.`);
            setTimeout(() => { scannedRef.current = false; }, 1000);
            return;
        }

        const updatedCount = item.scannedCount + 1;
        setPanierItems(prevItems =>
            prevItems.map((itm, index) =>
                index === itemIndex ? { ...itm, scannedCount: updatedCount } : itm
            )
        );

        Alert.alert("Succès", `Panier ${currentScanType} validé ! (${updatedCount}/${item.quantity})`);

        if (updatedCount < item.quantity) {
            setTimeout(() => { scannedRef.current = false; }, 1500); // Réactiver après 1.5 sec
        } else {
            console.log("🎉 Tous les paniers de ce type sont scannés !");
            setScanDisabled(true); // Désactiver le scan une fois tout validé
            setIsScannerVisible(false); // Fermer le scanner

            const allScanned = panierItems.every(itm => itm.scannedCount >= itm.quantity);
            if (allScanned) {
                console.log("🏆 Tous les paniers ont été scannés, affichage de la validation finale !");
                setIsValidationModalVisible(true);
            }
        }
        const isAllScanned = panierItems.every(item => item.scannedCount >= item.quantity);
setAllScanned(isAllScanned);
console.log("🔍 Mise à jour de allScanned :", isAllScanned);

    } else {
        console.log("❌ Code incorrect !");
        Alert.alert("Erreur", `Le QR Code ne correspond pas au panier ${currentScanType}.`);
        setTimeout(() => { scannedRef.current = false; }, 1000); // Réactivation rapide après erreur
    }
};



  const updateBasketStatus = async (panierId: string, newStatus: string) => {
    try {
      const panierRef = doc(db, "Panier", panierId);
      await updateDoc(panierRef, {
        statut: newStatus,
      });
      console.log(`Statut du panier ${panierId} mis à jour: ${newStatus}`);
      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      throw error;
    }
  };

  

  const navigateToNextDepot = () => {
    router.push({
      pathname: "/(tabs)/deliveryDepot",
      params: { villeNom, jour }
    });
  };

  const skipBasket = () => {
    if (!currentPanier || paniers.length <= 1) return;
    
    // Passer au prochain panier
    const updatedPaniers = [...paniers.filter(p => p.id !== currentPanier.id), currentPanier];
    setPaniers(updatedPaniers);
    setCurrentPanier(updatedPaniers[0]);

    // Réinitialiser l'état du scan
    scannedRef.current = false; 
    setScanDisabled(false); 
};


  if (hasPermission === null) {
    return <View style={styles.loadingContainer} />;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Accès à la caméra refusé</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Distribution des Paniers
        </Text>
        <View style={styles.iconButton} />
      </View>

      {/* Depot Info */}
      {depotInfo && (
        <View style={styles.depotInfo}>
          <Text style={styles.depotTitle}>Dépôt #{depotId}</Text>
          <Text style={styles.depotAddress}>{depotInfo.adresse}</Text>
          <Text style={styles.depotHoraire}>Horaire: {depotInfo.horaire}</Text>
        </View>
      )}

      {/* Current Basket Info */}
      {currentPanier && (
        <View style={styles.panierCard}>
          <Text style={styles.panierTitle}>Paniers à scanner</Text>
          <Text style={styles.panierAddress}>{currentPanier.adresse}</Text>
          
          <View style={styles.panierContent}>
            {panierItems.map((item, index) => (
              <View key={index} style={styles.panierItemRow}>
                <View style={styles.panierItemInfo}>
                  <Text style={styles.panierItem}>
                    {item.quantity} {item.type === 'familial' 
                      ? `Panier${item.quantity > 1 ? 's' : ''} Familial${item.quantity > 1 ? 's' : ''}` 
                      : item.type === 'simple' 
                        ? `Panier${item.quantity > 1 ? 's' : ''} Simple${item.quantity > 1 ? 's' : ''}`
                        : `Boîte${item.quantity > 1 ? 's' : ''} d'Œufs`}
                  </Text>
                  <View style={styles.scanProgressContainer}>
                    {item.scannedCount > 0 && (
                      <Text style={styles.scanProgressText}>
                        {item.scannedCount}/{item.quantity}
                      </Text>
                    )}
                    {item.scannedCount >= item.quantity && (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" style={styles.checkIcon} />
                    )}
                  </View>
                </View>
                
                {item.type !== 'oeuf' && (
                  <TouchableOpacity
                    style={[
                      styles.scanItemButton,
                      item.scannedCount >= item.quantity 
                        ? styles.scanItemButtonSuccess 
                        : styles.scanItemButtonPrimary
                    ]}
                    onPress={() => item.scannedCount < item.quantity && startScanning(item.type)}
                    disabled={item.scannedCount >= item.quantity}
                  >
                    <Ionicons 
                      name={item.scannedCount >= item.quantity ? "checkmark" : "qr-code-outline"} 
                      size={20} 
                      color="white" 
                    />
                    <Text style={styles.scanItemButtonText}>
                      {item.scannedCount >= item.quantity 
                        ? 'Validé' 
                        : item.scannedCount > 0 
                          ? `Scanner (${item.scannedCount}/${item.quantity})` 
                          : 'Scanner'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Remaining baskets counter */}
<View style={styles.counterContainer}>
  <Text style={styles.counterText}>
    {panierItems.reduce((total, item) => total + (item.quantity - item.scannedCount), 0)} 
    {" "}panier{panierItems.reduce((total, item) => total + (item.quantity - item.scannedCount), 0) > 1 ? 's' : ''} restant{panierItems.reduce((total, item) => total + (item.quantity - item.scannedCount), 0) > 1 ? 's' : ''}
  </Text>
</View>



      {/* Action Buttons */}
      <TouchableOpacity 
  style={[
    styles.skipButton, 
    allScanned ? styles.nextClientButtonActive : styles.nextClientButtonInactive
  ]}
  onPress={allScanned ? navigateToNextDepot : undefined} 
  disabled={!allScanned} 
>
  <Ionicons name="play-skip-forward" size={24} color="white" />
  <Text style={styles.buttonText}>Passer au client suivant</Text>
</TouchableOpacity>






      {/* Scanner Modal */}
            {/* Scanner Modal */}
            <Modal
        visible={isScannerVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          >
            <View style={styles.overlay}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsScannerVisible(false)}
              >
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>

              <View style={styles.scanFrame}>
                <View style={styles.scanCorner} />
                <View style={[styles.scanCorner, styles.topRight]} />
                <View style={[styles.scanCorner, styles.bottomRight]} />
                <View style={[styles.scanCorner, styles.bottomLeft]} />
              </View>

              <Text style={styles.scanInstructions}>
                Scannez le QR code du panier {currentScanType && currentScanType.toUpperCase()}
                {currentScanType && currentPanier && (
                <>
                  {"\n"}
                  {(() => {
                    const item = panierItems.find(i => i.type === currentScanType);
                    if (item) {
                      return `(${item.scannedCount}/${item.quantity})`;
                    }
                    return "";
                  })()}
                </>
              )}

              </Text>
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* Modal de validation finale */}
      {isValidationModalVisible && (
        <Modal visible={true} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.validationModal}>
              <Text style={styles.modalTitle}>Validation terminée</Text>
              <Text style={styles.modalText}>Tous les paniers ont été scannés.</Text>
              <TouchableOpacity 
                style={styles.okButton} 
                onPress={() => {
                  setIsValidationModalVisible(false);
                  setScanDisabled(false); // Réactive le scan
                }}
              >
                <Text style={styles.okButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  validationModal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 20,
  },
  nextClientButtonActive: {
    backgroundColor: "#3B82F6", // Bleu actif
  },
  nextClientButtonInactive: {
    backgroundColor: "#9CA3AF", // Gris désactivé
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  
  modalText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  okButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  
  okButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
    flex: 1,
    textAlign: 'center',
  },
  iconButton: {
    padding: 8,
    width: 40,
  },
  depotInfo: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  depotTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  depotAddress: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 4,
  },
  depotHoraire: {
    fontSize: 14,
    color: '#6B7280',
  },
  panierCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  panierTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  panierAddress: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 12,
  },
  panierContent: {
    marginTop: 8,
    gap: 12,
  },
  panierItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  panierItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  panierItem: {
    fontSize: 16,
    color: '#4B5563',
  },
  checkIcon: {
    marginLeft: 8,
  },
  scanItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanItemButtonPrimary: {
    backgroundColor: '#3B82F6',
  },
  scanItemButtonSuccess: {
    backgroundColor: '#10B981',
  },
  scanItemButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  counterContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  counterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  actionButtons: {
    margin: 16,
    gap: 12,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9CA3AF',
    padding: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    margin: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  scanFrame: {
    width: 280,
    height: 280,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3B82F6',
    borderWidth: 4,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    right: 0,
    top: 0,
    left: undefined,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomRight: {
    right: 0,
    bottom: 0,
    top: undefined,
    left: undefined,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  bottomLeft: {
    left: 0,
    bottom: 0,
    top: undefined,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  scanInstructions: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 8,
  },
  // New styles
  scanProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  scanProgressText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  }
});

export default BasketScanValidation;