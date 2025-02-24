import { Stack } from 'expo-router';

const Layout = () => {
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