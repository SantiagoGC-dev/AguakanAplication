import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/AuthContext";
import { Link } from "expo-router";
import api from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // --- Estados para el Modal "Mi Cuenta" ---
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados del formulario
  const [nombre, setNombre] = useState(user?.primer_nombre || "");
  const [apPaterno, setApPaterno] = useState(user?.apellido_paterno || "");
  const [apMaterno, setApMaterno] = useState(user?.apellido_materno || "");
  const [correo, setCorreo] = useState(user?.correo || "");
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");

  // --- Lógica del Perfil ---
  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Sesión",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  };

  // Función para obtener iniciales
  const getInitials = () => {
    if (!user) return "?";
    const nombre = user.primer_nombre || "";
    const apellido = user.apellido_paterno || "";
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  // Cargar datos en el modal cuando se abre
  const openProfileModal = () => {
    setNombre(user?.primer_nombre || "");
    setApPaterno(user?.apellido_paterno || "");
    setApMaterno(user?.apellido_materno || "");
    setCorreo(user?.correo || "");
    setPassActual("");
    setPassNueva("");
    setModalVisible(true);
  };

  // --- Lógica de "Mi Cuenta" (Actualizar Perfil) ---
  const handleUpdateProfile = async () => {
    if (!nombre || !apPaterno || !correo) {
      Alert.alert("Error", "Nombre, Apellido Paterno y Correo son requeridos.");
      return;
    }

    if (passNueva && !passActual) {
      Alert.alert(
        "Error",
        "Debes ingresar tu contraseña actual para cambiarla."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.put("/perfil", {
        primer_nombre: nombre,
        apellido_paterno: apPaterno,
        apellido_materno: apMaterno,
        correo: correo,
        password_actual: passActual || undefined,
        nueva_password: passNueva || undefined,
      });

      if (response.data.success) {
        Alert.alert("Éxito", "Perfil actualizado correctamente.");
        setModalVisible(false);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || "No se pudo actualizar el perfil";
      Alert.alert("Error", errorMsg);
      console.error(error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // --- Renderizado ---
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header Mejorado */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>
          Perfil
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* 1. Información del Usuario (con Avatar) - REDISEÑADO */}
        <View style={[styles.profileCard, isDark && styles.profileCardDark]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, isDark && styles.textDark]}>
                {user?.primer_nombre} {user?.apellido_paterno}
              </Text>
              <Text style={[styles.userRole, isDark && styles.textMutedDark]}>
                {user?.rol === 1 ? "Administrador" : "Laboratorista"}
              </Text>
              <Text style={[styles.userEmail, isDark && styles.textMutedDark]}>
                {user?.correo}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Opciones Disponibles (Menú) - REDISEÑADO */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Cuenta
          </Text>

          <TouchableOpacity
            style={[styles.menuItem, isDark && styles.menuItemDark]}
            onPress={openProfileModal}
          >
            <Ionicons
              name="person"
              size={22}
              color={isDark ? "#0A84FF" : "#007AFF"}
            />
            <Text style={[styles.menuItemText, isDark && styles.textDark]}>
              Mi cuenta
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#666" : "#999"}
            />
          </TouchableOpacity>
        </View>

        {/* 3. Opciones de Administrador - REDISEÑADO */}
        {user?.rol === 1 && (
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
              Administración
            </Text>

            <Link href="/admin/gestion-usuarios" asChild>
              <TouchableOpacity
                style={[styles.menuItem, isDark && styles.menuItemDark]}
              >
                <Ionicons
                  name="people"
                  size={22}
                  color={isDark ? "#0A84FF" : "#007AFF"}
                />
                <Text style={[styles.menuItemText, isDark && styles.textDark]}>
                  Gestión de Usuarios
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isDark ? "#666" : "#999"}
                />
              </TouchableOpacity>
            </Link>

            <Link href="/admin/instructivo" asChild>
              <TouchableOpacity
                style={[styles.menuItem, isDark && styles.menuItemDark]}
              >
                <Ionicons
                  name="document-text"
                  size={22}
                  color={isDark ? "#0A84FF" : "#007AFF"}
                />
                <Text style={[styles.menuItemText, isDark && styles.textDark]}>
                  Instructivo Empresarial
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isDark ? "#666" : "#999"}
                />
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {/* 4. Sección "Más" - REDISEÑADO */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Más
          </Text>

          <Link href="/ayuda-soporte" asChild>
            <TouchableOpacity
              style={[styles.menuItem, isDark && styles.menuItemDark]}
            >
              <Ionicons
                name="help-circle"
                size={22}
                color={isDark ? "#0A84FF" : "#007AFF"}
              />
              <Text style={[styles.menuItemText, isDark && styles.textDark]}>
                Ayuda y soporte
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isDark ? "#666" : "#999"}
              />
            </TouchableOpacity>
          </Link>

          <Link href="/acerca-de" asChild>
            <TouchableOpacity
              style={[styles.menuItem, isDark && styles.menuItemDark]}
            >
              <Ionicons
                name="information-circle"
                size={22}
                color={isDark ? "#0A84FF" : "#007AFF"}
              />
              <Text style={[styles.menuItemText, isDark && styles.textDark]}>
                Acerca de
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isDark ? "#666" : "#999"}
              />
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>

      {/* 5. Botón de Cerrar Sesión - REDISEÑADO */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.logoutButton, isDark && styles.logoutButtonDark]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={20} color="#FF3B30" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* --- Modal para "Mi Cuenta" - REDISEÑADO --- */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalHeader, isDark && styles.headerDark]}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={isDark ? "#fff" : "#000"}
              />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDark && styles.textDark]}>
              Mi Cuenta
            </Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <ScrollView
            style={[styles.modalContent, isDark && styles.containerDark]}
          >
            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                Información Personal
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  Nombre
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Ingresa tu nombre"
                  placeholderTextColor={isDark ? "#666" : "#999"}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  Apellido Paterno
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={apPaterno}
                  onChangeText={setApPaterno}
                  placeholder="Ingresa tu apellido paterno"
                  placeholderTextColor={isDark ? "#666" : "#999"}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  Apellido Materno
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={apMaterno}
                  onChangeText={setApMaterno}
                  placeholder="Ingresa tu apellido materno"
                  placeholderTextColor={isDark ? "#666" : "#999"}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  Correo Electrónico
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={correo}
                  onChangeText={setCorreo}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="tu@correo.com"
                  placeholderTextColor={isDark ? "#666" : "#999"}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                Cambiar Contraseña
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  Contraseña Actual
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={passActual}
                  onChangeText={setPassActual}
                  secureTextEntry
                  placeholder="Ingresa tu contraseña actual"
                  placeholderTextColor={isDark ? "#666" : "#999"}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  Nueva Contraseña
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={passNueva}
                  onChangeText={setPassNueva}
                  secureTextEntry
                  placeholder="Ingresa tu nueva contraseña"
                  placeholderTextColor={isDark ? "#666" : "#999"}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  loading && styles.saveButtonDisabled,
                ]}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelButton, isDark && styles.cancelButtonDark]}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={[styles.cancelButtonText, isDark && styles.textDark]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  containerDark: {
    backgroundColor: "#000",
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#F8FAFC"
  },
  headerDark: {
    backgroundColor: "#1c1c1e",
    borderBottomColor: "#333",
  },
  headerTitle: {
    fontSize: 25,
    fontFamily: "Poppins_700Bold",
    color: "#111",
    textAlign: "left",
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // Profile Card Styles
  profileCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    marginTop: -10,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#539DF3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "white",
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#111",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#539DF3",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "gray",
  },

  // Menu Section Styles
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  menuItemDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#111",
    marginLeft: 12,
  },

  // Footer Styles
  footer: {
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF3B30",
    gap: 8,
  },
  logoutButtonDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#FF453A",
  },
  logoutButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
  },

  // Modal Styles
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 4,
  },
  backButtonPlaceholder: {
    width: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#111",
  },
  modalContent: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f4f4f8",
  },
  formSection: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#333",
    marginBottom: 8,
  },
  labelDark: {
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    fontFamily: "Poppins_400Regular",
  },
  inputDark: {
    borderColor: "#333",
    backgroundColor: "#1c1c1e",
    color: "#fff",
  },
  modalActions: {
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  cancelButton: {
    backgroundColor: "transparent",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonDark: {
    borderColor: "#333",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },

  textDark: {
    color: "#fff",
  },
  textMutedDark: {
    color: "#888",
  },
});
