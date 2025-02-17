import { Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Redirect href="/(auth)/chooseRole" />
    </View>
  );
}