import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router"; // Agregamos hooks de router
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
import { AuthProvider, useAuth } from "../context/AuthContext";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments(); // Para saber en qué pantalla estamos
  const router = useRouter(); // Para movernos

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  // Lógica de Protección de Rutas (Reemplaza al condicional del Stack)
  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === "(tabs)" || segments[0] === "detail";

    if (!isAuthenticated && inAuthGroup) {
      // Si NO está logueado y trata de entrar a tabs o detalle -> Mándalo al login
      router.replace("/login");
    } else if (isAuthenticated && segments[0] === "login") {
      // Si SÍ está logueado y está en login -> Mándalo a inicio
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        {/* STACK LIMPIO: Sin condicionales ni fragmentos <> */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" options={{ animation: "fade" }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="detail/[id]"
            options={{
              headerTitle: "Detalle del producto",
              headerShown: false, // O true si quieres el header
              headerBackTitle: "",
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}