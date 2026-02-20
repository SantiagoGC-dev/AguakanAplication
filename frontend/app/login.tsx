import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

const miLogo = require("../assets/images/LaboratoryIcon.png");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading: loading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Por favor ingresa un correo válido");
      return;
    }

    try {
      const result = await login(email, password);
      if (result.success) {
        console.log("Login exitoso, esperando redirección del contexto...");
      } else {
        console.log("Fallo el login:", result.error);
      }
    } catch (error) {
      console.error("Error inesperado en handleLogin:", error);
      Alert.alert("Error", "Ocurrió un error inesperado");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, isDark && styles.containerDark]}>
          {/* Header mejorado */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={miLogo}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, isDark && styles.titleDark]}>
              LabStock
            </Text>
            <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
              Sistema de control de inventario para laboratorio
            </Text>
          </View>

          {/* Formulario mejorado */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, isDark && styles.labelDark]}>
                Correo electrónico
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="usuario@aguakan.com"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, isDark && styles.labelDark]}>
                Contraseña
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="••••••••"
                placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Iniciar sesión</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#f8fafc",
  },
  containerDark: {
    backgroundColor: "#0f172a",
  },
  header: {
    alignItems: "center",
    marginBottom: 50,
  },
  logoContainer: {
    marginBottom: -110,
    shadowColor: "#4B9CD3",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 350,
    height: 350,
  },
  title: {
    fontSize: 38,
    color: "#1e293b",
    marginBottom: 6,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  titleDark: {
    color: "#6BB5E8",
    textShadowColor: "rgba(107, 181, 232, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#475569",
    fontFamily: "Poppins_400Regular",
    letterSpacing: 0.3,
    opacity: 0.9,
  },
  subtitleDark: {
    color: "#cbd5e1",
  },
  form: {
    marginBottom: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#4B9CD3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  inputContainer: {
    marginBottom: 22,
  },
  label: {
    fontSize: 15,
    marginBottom: 8,
    color: "#334155",
    fontFamily: "Poppins_500Medium",
    letterSpacing: 0.3,
  },
  labelDark: {
    color: "#000000ff",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
    fontFamily: "Poppins_400Regular",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputDark: {
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    color: "#f1f5f9",
    shadowColor: "#000",
  },
  button: {
    backgroundColor: "#4B9CD3",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#4B9CD3",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    transform: [{ translateY: 0 }],
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.5,
  },
});
