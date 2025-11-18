import React, { useState, useCallback } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useFocusEffect } from "expo-router";
import api from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";

export default function PerfilScreen() {
  const { user, logout, refreshAuthUser } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nombre, setNombre] = useState(user?.primer_nombre || "");
  const [apPaterno, setApPaterno] = useState(user?.apellido_paterno || "");
  const [apMaterno, setApMaterno] = useState(user?.apellido_materno || "");
  const [correo, setCorreo] = useState(user?.correo || "");
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (refreshAuthUser) {
        refreshAuthUser();
      }
      setNombre(user?.primer_nombre || "");
      setApPaterno(user?.apellido_paterno || "");
      setApMaterno(user?.apellido_materno || "");
      setCorreo(user?.correo || "");
    }, [refreshAuthUser])
  );

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Cerrar Sesión", style: "destructive", onPress: logout },
      ]
    );
  };

  const getInitials = () => {
    if (!user) return "?";
    const n = user.primer_nombre || "";
    const a = user.apellido_paterno || "";
    return `${n.charAt(0)}${a.charAt(0)}`.toUpperCase();
  };

  const openProfileModal = () => {
    setNombre(user?.primer_nombre || "");
    setApPaterno(user?.apellido_paterno || "");
    setApMaterno(user?.apellido_materno || "");
    setCorreo(user?.correo || "");
    setPassActual("");
    setPassNueva("");
    setModalVisible(true);
  };

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
        if (refreshAuthUser) refreshAuthUser();
        setModalVisible(false);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || "No se pudo actualizar el perfil";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* --- Pantalla Principal --- */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>
          Perfil
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
              <Text style={[styles.userEmail, isDark && styles.userEmail]}>
                {user?.correo}
              </Text>
            </View>
          </View>
        </View>

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
              color={isDark ? "#0A84FF" : "#539DF3"}
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

        {user?.rol === 1 && (
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
              Administración
            </Text>
            <TouchableOpacity
              style={[styles.menuItem, isDark && styles.menuItemDark]}
              onPress={() => router.push("/admin/gestion-usuarios")}
            >
              <Ionicons
                name="people"
                size={22}
                color={isDark ? "#0A84FF" : "#539DF3"}
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
            <TouchableOpacity
              style={[styles.menuItem, isDark && styles.menuItemDark]}
              onPress={() => router.push("/admin/instructivo")}
            >
              <Ionicons
                name="document-text"
                size={22}
                color={isDark ? "#0A84FF" : "#539DF3"}
              />
              <Text style={[styles.menuItemText, isDark && styles.textDark]}>
                Instructivo de Trabajo
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isDark ? "#666" : "#999"}
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Más
          </Text>
          <TouchableOpacity
            style={[styles.menuItem, isDark && styles.menuItemDark]}
            onPress={() => router.push("/ayuda-soporte")}
          >
            <Ionicons
              name="help-circle"
              size={22}
              color={isDark ? "#0A84FF" : "#539DF3"}
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
          <TouchableOpacity
            style={[styles.menuItem, isDark && styles.menuItemDark]}
            onPress={() => router.push("/acerca-de")}
          >
            <Ionicons
              name="information-circle"
              size={22}
              color={isDark ? "#0A84FF" : "#539DF3"}
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
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={[styles.logoutButton, isDark && styles.logoutButtonDark]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={18} color="#FF3B30" />
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* --- Modal de Edición de Perfil --- */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        {/* Fondo Base del Modal para evitar flashes blancos */}
        <View style={{ flex: 1, backgroundColor: isDark ? "#000" : "#F8FAFC" }}>
          {/* 1. SafeAreaView envuelve todo el modal para respetar el Notch/Barra Estado */}
          <SafeAreaView
            style={{ flex: 1, backgroundColor: isDark ? "#1c1c1e" : "#fff" }}
            edges={["top", "left", "right"]}
          >
            {/* 2. Behavior 'undefined' en Android soluciona el bug del espacio vacío */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1, backgroundColor: isDark ? "#000" : "#F8FAFC" }}
            >
              {/* Header del Modal (Sin margin manual, SafeAreaView se encarga) */}
              <View
                style={[styles.modalHeader, isDark && styles.modalHeaderDark]}
              >
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalBackButton}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={isDark ? "#fff" : "#000"}
                  />
                  <Text
                    style={[styles.modalBackText, isDark && styles.textDark]}
                  >
                    Atrás
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                  Mi Cuenta
                </Text>
                <View style={styles.modalHeaderPlaceholder} />
              </View>

              <ScrollView
                style={[styles.modalContent, isDark && styles.modalContentDark]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {/* Tarjeta Info Personal */}
                <View
                  style={[styles.modalCard, isDark && styles.modalCardDark]}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons
                      name="person-circle"
                      size={22}
                      color={isDark ? "#0A84FF" : "#539DF3"}
                    />
                    <Text style={[styles.cardTitle, isDark && styles.textDark]}>
                      Información Personal
                    </Text>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.inputGroupHalf}>
                      <Text style={[styles.label, isDark && styles.labelDark]}>
                        Nombres *
                      </Text>
                      <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        value={nombre}
                        onChangeText={setNombre}
                        placeholderTextColor={isDark ? "#666" : "#999"}
                      />
                    </View>
                    <View style={styles.inputGroupHalf}>
                      <Text style={[styles.label, isDark && styles.labelDark]}>
                        Apellido Paterno *
                      </Text>
                      <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        value={apPaterno}
                        onChangeText={setApPaterno}
                        placeholderTextColor={isDark ? "#666" : "#999"}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, isDark && styles.labelDark]}>
                      Apellido Materno
                    </Text>
                    <TextInput
                      style={[styles.input, isDark && styles.inputDark]}
                      value={apMaterno}
                      onChangeText={setApMaterno}
                      placeholderTextColor={isDark ? "#666" : "#999"}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, isDark && styles.labelDark]}>
                      Correo Electrónico *
                    </Text>
                    <View
                      style={[styles.inputWithIcon, isDark && styles.inputDark]}
                    >
                      <Ionicons
                        name="mail"
                        size={18}
                        color={isDark ? "#888" : "#666"}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          styles.inputWithIconField,
                          isDark && styles.inputDark,
                        ]}
                        value={correo}
                        onChangeText={setCorreo}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={isDark ? "#666" : "#999"}
                      />
                    </View>
                  </View>
                </View>

                {/* Tarjeta Password */}
                <View
                  style={[styles.modalCard, isDark && styles.modalCardDark]}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons
                      name="lock-closed"
                      size={22}
                      color={isDark ? "#0A84FF" : "#539DF3"}
                    />
                    <Text style={[styles.cardTitle, isDark && styles.textDark]}>
                      Cambiar Contraseña
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      isDark && styles.textMutedDark,
                    ]}
                  >
                    Deja estos campos vacíos si no deseas cambiar la contraseña
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, isDark && styles.labelDark]}>
                      Contraseña Actual
                    </Text>
                    <View
                      style={[styles.inputWithIcon, isDark && styles.inputDark]}
                    >
                      <Ionicons
                        name="key"
                        size={18}
                        color={isDark ? "#888" : "#666"}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          styles.inputWithIconField,
                          isDark && styles.inputDark,
                          styles.placeholder,
                        ]}
                        value={passActual}
                        onChangeText={setPassActual}
                        secureTextEntry
                        placeholder="*****"
                        placeholderTextColor={isDark ? "#666" : "#999"}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, isDark && styles.labelDark]}>
                      Nueva Contraseña
                    </Text>
                    <View
                      style={[styles.inputWithIcon, isDark && styles.inputDark]}
                    >
                      <Ionicons
                        name="lock-closed"
                        size={18}
                        color={isDark ? "#888" : "#666"}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          styles.inputWithIconField,
                          isDark && styles.inputDark,
                          styles.placeholder,
                        ]}
                        value={passNueva}
                        onChangeText={setPassNueva}
                        secureTextEntry
                        placeholder="*****"
                        placeholderTextColor={isDark ? "#666" : "#999"}
                      />
                    </View>
                  </View>
                </View>

                {/* Botones */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      loading && styles.saveButtonDisabled,
                      isDark && styles.saveButtonDark,
                    ]}
                    onPress={handleUpdateProfile}
                    disabled={loading}
                  >
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <Ionicons name="refresh" size={20} color="#fff" />
                        <Text style={styles.saveButtonText}>Guardando...</Text>
                      </View>
                    ) : (
                      <View style={styles.loadingContainer}>
                        <Ionicons name="save" size={20} color="#fff" />
                        <Text style={styles.saveButtonText}>
                          Guardar Cambios
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      isDark && styles.cancelButtonDark,
                    ]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        isDark && styles.textDark,
                      ]}
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Espacio extra al final para evitar que el teclado tape botones */}
                <View style={{ height: 40 }} />
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: "#F8FAFC",
  },
  headerDark: {
    backgroundColor: "#000000ff",
  },
  headerTitle: {
    fontSize: 25,
    fontFamily: "Poppins_700Bold",
    color: "#111",
  },
  profileCard: {
    backgroundColor: "#fff",
    padding: 17,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 1,
  },
  profileCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
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
    flexShrink: 1,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
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
  logoutSection: {
    marginTop: 1,
    marginBottom: 50,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 14,
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
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalHeaderDark: {
    backgroundColor: "#1c1c1e",
    borderBottomColor: "#333",
  },
  modalBackButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingRight: 8,
  },
  modalBackText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#539DF3",
    marginLeft: 4,
  },
  modalHeaderPlaceholder: {
    width: 70,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#111",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
  },
  modalContentDark: {
    backgroundColor: "#000",
  },
  modalScrollContent: {
    paddingBottom: 150,
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee",
  },
  modalCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#111",
    marginLeft: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  formRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
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
    borderColor: "#e1e5e9",
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    fontFamily: "Poppins_400Regular",
    height: 50,
  },
  inputDark: {
    borderColor: "#333",
    backgroundColor: "#2c2c2e",
    color: "#fff",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e5e9",
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
    height: 50,
  },
  inputWithIconField: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 8,
    height: "100%",
  },
  inputIcon: {
    marginLeft: 16,
  },
  modalActions: {
    marginTop: 10,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#539DF3",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonDark: {
    backgroundColor: "#539DF3",
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
    fontFamily: "Poppins_700Bold",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  cancelButtonDark: {
    borderColor: "#333",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
  },
  textDark: {
    color: "#fff",
  },
  textMutedDark: {
    color: "#539DF3",
  },
  placeholder: {
    marginTop: 10,
  },
});
