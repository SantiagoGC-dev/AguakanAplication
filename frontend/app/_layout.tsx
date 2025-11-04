import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, View, Text } from "react-native";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { useColorScheme } from "@/hooks/use-color-scheme";

// 🔥 1. Importar el PROVEEDOR y el HOOK
import { AuthProvider, useAuth } from "../context/AuthContext"; // Ajusta la ruta

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

// 🔥 2. Crear un componente de Layout separado
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  
  // 🔥 3. Obtener el estado del CONTEXTO
  const { isAuthenticated, isLoading } = useAuth();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  useEffect(() => {
    // 🔥 4. Usar 'isLoading' del contexto
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]); // <--- Depender de 'isLoading' del contexto

  // 🔥 5. Se eliminan TODOS los useEffect de autenticación y checkAuthStatus
  // (checkAuthStatus, el que vigila pathname, y el de AppState)

  // 🔥 6. Usar 'isLoading' del contexto para la pantalla de carga
  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Cargando...</Text>
      </View>
    );
  }

  console.log('🎯 Renderizando layout. Autenticado:', isAuthenticated);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* 🔥 7. Usar 'isAuthenticated' del contexto */}
          {isAuthenticated ? (
            <>
              {/* SI está autenticado → mostrar tabs */}
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="detail/[id]"
                options={{
                  headerTitle: "Detalle del producto",
                  headerBackTitle: "",
                }}
              />
            </>
          ) : (
            /* NO está autenticado → mostrar SOLO login */
            <Stack.Screen 
              name="login" 
              options={{ 
                headerShown: false,
                animation: 'fade'
              }} 
            />
          )}
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// 🔥 8. Exportar el Layout envuelto en el PROVEEDOR
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}