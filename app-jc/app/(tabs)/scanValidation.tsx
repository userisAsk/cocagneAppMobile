  import React, { useState, useEffect } from 'react';
  import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Modal,
    ActivityIndicator,
    Dimensions,
    StatusBar,
    SafeAreaView,
  } from 'react-native';
  import { CameraView, BarcodeScanningResult } from 'expo-camera';
  import { Ionicons } from '@expo/vector-icons';
  import { db } from '../../FirebaseConfig';
  import { doc, getDoc } from 'firebase/firestore';
  import { router, useLocalSearchParams } from 'expo-router';
  import { BlurView } from 'expo-blur';

  interface DepotData {
    adresse: string;
    coordonnées: {
      latitude: number;
      longitude: number;
    };
    horaire: string;
    num_depot: number[];
  }

  interface TourneeData {
    active: boolean;
    infos: string;
    jour: string;
    ordre_semaine: number;
    type: string;
    villes: {
      [key: string]: {
        [key: string]: DepotData;
      };
    };
  }

  type SearchParams = {
    depotId?: string;
    villeNom?: string;
    jour?: string;
  }

  const { width } = Dimensions.get('window');
  const SCAN_AREA_SIZE = width * 0.7;

  const ScanValidation: React.FC = () => {
    const params = useLocalSearchParams<SearchParams>();
    const { depotId, villeNom, jour } = params;
    
    const [scanned, setScanned] = useState(false);
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    const [isDepotScanned, setIsDepotScanned] = useState(false);
    const [depotInfo, setDepotInfo] = useState<DepotData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      (async () => {
        if (depotId && villeNom && jour) {
          try {
            setLoading(true);
            setError(null);
            console.log(`Chargement des données pour: ${jour}/${villeNom}/depot ${depotId}`);
            
            const tourneeRef = doc(db, "Tournee", jour.toString().toLowerCase());
            const tourneeSnap = await getDoc(tourneeRef);
            
            if (tourneeSnap.exists()) {
              const tourneeData = tourneeSnap.data() as TourneeData;
              
              if (!tourneeData.villes[villeNom]) {
                throw new Error(`Aucune donnée trouvée pour la ville ${villeNom}`);
              }
              
              const villeDepots = tourneeData.villes[villeNom];
              let foundDepot = false;
              const depotIdNumber = parseInt(depotId);
              
              for (const addressKey in villeDepots) {
                const depot = villeDepots[addressKey] as DepotData;
                if (depot.num_depot && depot.num_depot.includes(depotIdNumber)) {
                  setDepotInfo(depot);
                  foundDepot = true;
                  break;
                }
              }
              
              if (!foundDepot) {
                throw new Error(`Aucun dépôt trouvé avec le numéro ${depotId}`);
              }
            } else {
              throw new Error(`Aucune donnée trouvée pour le jour ${jour}`);
            }
          } catch (error) {
            console.error("Erreur lors du chargement du dépôt:", error);
            setError(error instanceof Error ? error.message : "Erreur inconnue");
          } finally {
            setLoading(false);
          }
        }
      })();
    }, [depotId, villeNom, jour]);

    const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
      if (scanned || !result?.data) return;
      
      setScanned(true);
      try {
        const scannedNumber = parseInt(result.data);
        const depotIdNumber = parseInt(depotId || '');
        
        if (scannedNumber === depotIdNumber) {
          setIsDepotScanned(true);
          setIsScannerVisible(false);
          
          Alert.alert(
            '✅ Dépôt Validé',
            'Souhaitez-vous commencer la distribution des paniers ?',
            [
              {
                text: 'Plus tard',
                style: 'cancel',
                onPress: () => setScanned(false),
              },
              {
                text: 'Commencer',
                style: 'default',
                onPress: () => {
                  if (depotId && villeNom && jour) {
                    router.push({
                      pathname: "/(tabs)/basketScanValidation",
                      params: { depotId, villeNom, jour }
                    });
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert(
            '❌ QR Code Invalide',
            'Ce QR code ne correspond pas au dépôt sélectionné.',
            [{ text: 'Réessayer', onPress: () => setScanned(false) }]
          );
        }
      } catch (error) {
        console.error('Erreur lors du scan:', error);
        Alert.alert('Erreur', 'Une erreur est survenue lors de la validation');
        setScanned(false);
      }
    };

    if (loading) {
      return (
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement des informations...</Text>
        </SafeAreaView>
      );
    }

    if (error) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setError(null)}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        <View style={styles.header}>
          <Ionicons name="location" size={24} color="#3B82F6" />
          <Text style={styles.headerText}>
            Dépôt {depotId} - {depotInfo?.adresse || ''}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.mainButton,
            isDepotScanned ? styles.mainButtonSuccess : styles.mainButtonPrimary
          ]}
          onPress={() => !isDepotScanned && setIsScannerVisible(true)}
        >
          <Ionicons
            name={isDepotScanned ? "checkmark-circle" : "scan"}
            size={32}
            color="white"
          />
          <Text style={styles.mainButtonText}>
            {isDepotScanned ? 'Dépôt validé !' : 'Scanner le QR code'}
          </Text>
        </TouchableOpacity>

        <Modal
          visible={isScannerVisible}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <View style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
              <BlurView intensity={70} style={styles.overlay}>
                <SafeAreaView style={styles.scannerHeader}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsScannerVisible(false)}
                  >
                    <Ionicons name="close" size={28} color="white" />
                  </TouchableOpacity>
                </SafeAreaView>

                <View style={styles.scanFrame}>
                  <View style={[styles.scanCorner, styles.topLeft]} />
                  <View style={[styles.scanCorner, styles.topRight]} />
                  <View style={[styles.scanCorner, styles.bottomLeft]} />
                  <View style={[styles.scanCorner, styles.bottomRight]} />
                </View>

                <View style={styles.scanInstructionsContainer}>
                  <Text style={styles.scanTitle}>Scanner le QR code</Text>
                  <Text style={styles.scanSubtitle}>
                    {depotInfo?.adresse 
                      ? `Dépôt à ${depotInfo.adresse}`
                      : 'Chargement des informations...'}
                  </Text>
                </View>
              </BlurView>
            </CameraView>
          </View>
        </Modal>
      </SafeAreaView>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F3F4F6',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      padding: 20,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      backgroundColor: 'white',
      borderRadius: 12,
      margin: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    headerText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 12,
      color: '#1F2937',
    },
    mainButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 16,
      padding: 20,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    mainButtonPrimary: {
      backgroundColor: '#3B82F6',
    },
    mainButtonSuccess: {
      backgroundColor: '#10B981',
    },
    mainButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 12,
    },
    scannerContainer: {
      flex: 1,
      backgroundColor: 'black',
    },
    camera: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    scannerHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: 16,
    },
    closeButton: {
      padding: 8,
    },
    scanFrame: {
      width: SCAN_AREA_SIZE,
      height: SCAN_AREA_SIZE,
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
    },
    topLeft: {
      left: 0,
      top: 0,
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
    scanInstructionsContainer: {
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    scanTitle: {
      color: 'white',
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 8,
    },
    scanSubtitle: {
      color: 'white',
      fontSize: 16,
      textAlign: 'center',
      opacity: 0.8,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: '#6B7280',
      textAlign: 'center',
    },
    errorText: {
      marginTop: 12,
      fontSize: 16,
      color: '#DC2626',
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 20,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: '#3B82F6',
      borderRadius: 8,
    },
    retryButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  export default ScanValidation;