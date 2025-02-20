import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Camera } from 'expo-camera';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router';  // Utiliser useLocalSearchParams

interface ScanValidationProps {
  tourId: string;
  depotNumber: number;
  onValidationComplete: () => void;
}

const ScanValidation: React.FC<ScanValidationProps> = ({
  tourId,
  depotNumber,
  onValidationComplete,
}) => {
  const { depotId, villeNom, jour } = useLocalSearchParams();  // Utiliser les paramètres de la route

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isDepotScanned, setIsDepotScanned] = useState(false);

  // Ajout du console.log pour vérifier les paramètres
  useEffect(() => {
    console.log('Depot ID:', depotId); // Affichage du depotId
    console.log('Ville Name:', villeNom); // Affichage du villeNom
    console.log('Jour:', jour); // Affichage du jour
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, [depotId, villeNom, jour]);  // Ajout des dépendances pour mettre à jour quand les paramètres changent

  useEffect(() => {
    if (depotId === undefined) {
      console.error("Depot ID is undefined");
    } else if (typeof depotId !== 'string') {
      console.error("Depot ID is not a string:", depotId);
    }
    console.log('Depot ID bien formaté:', depotId); 
  }, [depotId]);
  

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    try {
      // Ignore scanning if the scan has already been processed
      if (scanned) return; // Ignore if a scan is already in progress
  
      if (!result?.data) {
        console.error('Scan invalide:', result);
        Alert.alert('Erreur', 'Scan invalide, veuillez réessayer');
        return;
      }
  
      const scannedData = result.data;
      console.log('Données scannées :', scannedData);
      setScanned(true);  // Set scanned to true to avoid multiple scans
  
      // Validate scannedData
      if (typeof scannedData !== 'string') {
        console.error('scannedData is not a string:', scannedData);
        Alert.alert('Erreur', 'Le code scanné n’est pas valide.');
        return;
      }
  
      // Convert scannedData to a number
      const scannedDepotNumber = parseInt(scannedData, 10);
      if (isNaN(scannedDepotNumber)) {
        console.error('Données scannées invalides ou non conformes.');
        Alert.alert('Erreur', 'Le code scanné n’est pas valide.');
        return;
      }
  
      console.log('Numéro de dépôt scanné :', scannedDepotNumber);
  
      // Check if depotId is a string before comparison
      if (typeof depotId === 'string') {
        const currentDepotNumber = parseInt(depotId, 10);
  
        if (!isDepotScanned) {
          if (scannedDepotNumber === currentDepotNumber) {
            setIsDepotScanned(true);
            Alert.alert('Succès', 'Numéro de dépôt validé !');
          } else {
            Alert.alert('Erreur', 'Numéro de dépôt invalide');
          }
        }
      } else {
        console.error('DepotId is not a valid string:', depotId);
        Alert.alert('Erreur', 'DepotId est invalide');
      }
    } catch (error) {
      console.error('❌ Erreur complète :', error);
      Alert.alert('Erreur', 'Problème lors de la validation.');
    } finally {
      // Reset scanned after a small delay to avoid re-scanning immediately
      setTimeout(() => setScanned(false), 1500); // Set delay to 1.5 seconds
    }
  };
  
  
  

  const toggleScanner = () => {
    setIsScannerVisible(!isScannerVisible);
    setScanned(false);
  };

  if (hasPermission === null) {
    return <View />;
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
      <TouchableOpacity
        style={styles.scanButton}
        onPress={toggleScanner}
      >
        <Ionicons name="scan" size={24} color="white" />
        <Text style={styles.scanInstructions}>
            {!isDepotScanned
                ? `Scannez le QR code du dépôt ${depotId ?? 'inconnu'}`
                : `Dépôt validé !`
            }
        </Text>
      </TouchableOpacity>

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
                onPress={toggleScanner}
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
                {!isDepotScanned
                  ? `Scannez le QR code du dépôt ${depotId ?? 'inconnu'}` 
                  : `Dépôt validé !`
                }
              </Text>
            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomRight: {
    right: 0,
    bottom: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  bottomLeft: {
    left: 0,
    bottom: 0,
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
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
  },
});

export default ScanValidation;
