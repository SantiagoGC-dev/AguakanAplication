import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import api from "@/utils/api";
import { router, Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";

export default function GestionUsuariosScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Estados del Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados del Formulario
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [primerNombre, setPrimerNombre] = useState("");
  const [apPaterno, setApPaterno] = useState(""); 
  const [apMaterno, setApMaterno] = useState(""); 
  const [idRol, setIdRol] = useState(2); 
  const [idEstatus, setIdEstatus] = useState(1); 

  // Estados de los estatus
  const [estatuses, setEstatuses] = useState<any[]>([]);

  // Referencias para los Swipeables
  const swipeableRefs = useRef(new Map());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, estatusRes] = await Promise.all([
        api.get("/usuarios"),
        api.get("/usuarios/roles"),
        api.get("/usuarios/estatus"), 
      ]);

      setUsers(usersRes.data.data);
      setRoles(
        rolesRes.data.data.map((r: any) => ({
          label: r.nombre_rol,
          value: r.id_rol,
        }))
      );

      setEstatuses(
        estatusRes.data.data.map((e: any) => ({
          label: e.nombre_estatus,
          value: e.id_estatus_usuario,
        }))
      );
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar los datos");
      console.error("Error en fetchData:", error); 
    } finally {
      setLoading(false);
    }
  };

const handleCambiarEstadoUsuario = async (userId: number, userName: string, esActivo: boolean) => {
  swipeableRefs.current.get(userId)?.close();
  
  const accion = esActivo ? "Desactivar" : "Activar";
  const mensaje = esActivo 
    ? `¿Estás seguro de que quieres desactivar a ${userName}? El usuario perderá acceso a la aplicación.`
    : `¿Estás seguro de que quieres activar a ${userName}? El usuario recuperará acceso a la aplicación.`;

  Alert.alert(
    `${accion} Usuario`,
    mensaje,
    [
      {
        text: "Cancelar",
        style: "cancel"
      },
      {
        text: accion,
        style: esActivo ? "destructive" : "default",
        onPress: async () => {
          try {
            setDeletingId(userId);
            
            if (esActivo) {
              // Desactivar usuario
              await api.delete(`/usuarios/${userId}`);
              Alert.alert("Éxito", "Usuario desactivado correctamente");
            } else {
              // Reactivar usuario  
              await api.put(`/usuarios/${userId}/reactivar`);
              Alert.alert("Éxito", "Usuario reactivado correctamente");
            }
            
            // Recargar la lista completa para ver el cambio de estatus
            await fetchData();
            
          } catch (error: any) {
            const errorMsg = error.response?.data?.error || `No se pudo ${accion.toLowerCase()} el usuario`;
            Alert.alert("Error", errorMsg);
          } finally {
            setDeletingId(null);
          }
        }
      }
    ]
  );
};

  // Render del swipeable para eliminar
const renderRightActions = (progress: any, dragX: any, item: any) => {
  const esActivo = item.id_estatus_usuario === 1;
  const accion = esActivo ? "Desactivar" : "Activar";
  const color = esActivo ? "#DC2626" : "#16A34A"; // Rojo para desactivar, Verde para activar
  const icono = esActivo ? "person-remove" : "person-add";

  const scale = dragX.interpolate({
    inputRange: [-100, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity
      style={[styles.deleteAction, deletingId === item.id_usuario && styles.deleteActionDisabled, { backgroundColor: color }]}
      onPress={() => handleCambiarEstadoUsuario(item.id_usuario, `${item.primer_nombre} ${item.apellido_paterno}`, esActivo)}
      disabled={deletingId === item.id_usuario}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {deletingId === item.id_usuario ? (
          <View style={styles.deletingContainer}>
            <Ionicons name="refresh" size={20} color="white" />
          </View>
        ) : (
          <View style={styles.deleteContainer}>
            <Ionicons name={icono} size={24} color="white" />
            <Text style={styles.deleteActionText}>{accion}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const renderItem = ({ item }: { item: any }) => (
  <Swipeable
    ref={(ref) => {
      if (ref) {
        swipeableRefs.current.set(item.id_usuario, ref);
      } else {
        swipeableRefs.current.delete(item.id_usuario);
      }
    }}
    renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
    rightThreshold={40}
    overshootRight={false}
  >
    <View style={[styles.itemContainer, isDark && styles.itemContainerDark]}>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, isDark && styles.textDark]}>
          {item.primer_nombre} {item.apellido_paterno}
          {/* 🔥 ELIMINADO: El texto "(Inactivo)" */}
        </Text>
        <Text style={[styles.itemText, isDark && styles.textMutedDark]}>
          {item.correo}
        </Text>
        <View style={styles.itemBadges}>
          <View style={[
            styles.badge, 
            item.id_rol === 1 ? styles.badgeAdmin : styles.badgeUser
          ]}>
            <Text style={styles.badgeText}>
              {item.nombre_rol}
            </Text>
          </View>
          <View style={[
            styles.badge, 
            // 🔥 MEJORAR colores para estatus
            item.id_estatus_usuario === 1 ? styles.badgeActive : styles.badgeInactive
          ]}>
            <Text style={[
              styles.badgeText,
              // 🔥 AGREGAR color de texto según estatus
              item.id_estatus_usuario === 1 ? styles.badgeTextActive : styles.badgeTextInactive
            ]}>
              {item.id_estatus_usuario === 1 ? "Activo" : "Inactivo"}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => openModal(item)}
      >
        <Ionicons name="create" size={20} color="#539DF3" />
      </TouchableOpacity>
    </View>
  </Swipeable>
);
  const openModal = (user: any = null) => {
    if (user) {
      // --- Editando Usuario ---
      setIsEditing(true);
      setCurrentUser(user);
      setCorreo(user.correo);
      setPrimerNombre(user.primer_nombre);
      setApPaterno(user.apellido_paterno || "");
      setApMaterno(user.apellido_materno || "");
      setIdRol(user.id_rol);
      setIdEstatus(user.id_estatus_usuario);
      setPassword(""); 
    } else {
      // --- Creando Usuario ---
      setIsEditing(false);
      setCurrentUser(null);
      setCorreo("");
      setPrimerNombre("");
      setApPaterno("");
      setApMaterno("");
      setPassword("");
      setIdRol(2); 
      setIdEstatus(1); 
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!correo || !primerNombre) {
      return Alert.alert("Error", "Correo y Primer Nombre son requeridos");
    }
    if (!isEditing && !password) {
      return Alert.alert(
        "Error",
        "La contraseña es requerida al crear un usuario"
      );
    }

    setLoading(true);

    try {
      if (isEditing) {
        // --- Actualizar Usuario ---
        const data = {
          correo,
          primer_nombre: primerNombre,
          apellido_paterno: apPaterno,
          apellido_materno: apMaterno,
          id_rol: idRol,
          id_estatus_usuario: idEstatus,
          password: password || undefined, 
        };
        await api.put(`/usuarios/${currentUser.id_usuario}`, data);
        Alert.alert("Éxito", "Usuario actualizado");
      } else {
        // --- Crear Usuario (Registro) ---
        const data = {
          correo,
          password,
          primer_nombre: primerNombre,
          apellido_paterno: apPaterno,
          apellido_materno: apMaterno,
          id_rol: idRol,
        };
        await api.post("/auth/registro", data);
        Alert.alert("Éxito", "Usuario creado");
      }
      setModalVisible(false);
      fetchData(); // Recargar la lista
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Ocurrió un error";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };



  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Stack.Screen options={{ title: "Gestión de Usuarios" }} />
      
      {/* Header */}
<View style={[styles.header, isDark && styles.headerDark]}>
  <TouchableOpacity
    onPress={() => router.back()} // Esto regresa a la pantalla anterior
    style={styles.backButton}
  >
    <Ionicons
      name="chevron-back"
      size={24}
      color={isDark ? "#fff" : "#000"}
    />
    <Text style={[styles.backText, isDark && styles.textDark]}>
      Atrás
    </Text>
  </TouchableOpacity>
  <Text style={[styles.headerTitle, isDark && styles.textDark]}>
    Usuarios
  </Text>
  <View style={styles.headerPlaceholder} />
</View>

      <ScrollView style={styles.content}>
        {/* Botón Crear Usuario */}
        <TouchableOpacity 
          style={[styles.createButton, isDark && styles.createButtonDark]} 
          onPress={() => openModal()}
        >
          <Ionicons name="person-add" size={22} color="#539DF3" />
          <Text style={[styles.createButtonText, isDark && styles.textDark]}>
            Agregar usuario
          </Text>
        </TouchableOpacity>

        {/* Lista de Usuarios */}
        <View style={styles.listSection}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Usuarios Registrados
          </Text>
          
          {users.map((item) => (
            <View key={item.id_usuario.toString()}>
              {renderItem({ item })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal de Edición/Creación */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={isDark ? "#fff" : "#000"}
              />
              <Text style={[styles.modalBackText, isDark && styles.textDark]}>
                Atrás
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDark && styles.textDark]}>
              {isEditing ? "Editar" : "Crear"} Usuario
            </Text>
            <View style={styles.modalHeaderPlaceholder} />
          </View>

          <ScrollView
            style={[styles.modalContent, isDark && styles.modalContentDark]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* Tarjeta de Información Personal */}
            <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name="person-circle"
                  size={22}
                  color="#539DF3"
                />
                <Text style={[styles.cardTitle, isDark && styles.textDark]}>
                  Información Personal
                </Text>
              </View>
              
              <View style={styles.formRow}>
                <View style={styles.inputGroupHalf}>
                  <Text style={[styles.label, isDark && styles.labelDark]}>
                    Primer Nombre *
                  </Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    value={primerNombre}
                    onChangeText={setPrimerNombre}
                    placeholder="Ingresa el nombre"
                    placeholderTextColor={isDark ? "#666" : "#999"}
                  />
                </View>

                <View style={styles.inputGroupHalf}>
                  <Text style={[styles.label, isDark && styles.labelDark]}>
                    Apellido Paterno
                  </Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    value={apPaterno}
                    onChangeText={setApPaterno}
                    placeholder="Apellido paterno"
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
                  placeholder="Apellido materno (opcional)"
                  placeholderTextColor={isDark ? "#666" : "#999"}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  Correo Electrónico *
                </Text>
                <View style={[styles.inputWithIcon, isDark && styles.inputDark]}>
                  <Ionicons
                    name="mail"
                    size={18}
                    color={isDark ? "#888" : "#666"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.inputWithIconField, isDark && styles.inputDark]}
                    value={correo}
                    onChangeText={setCorreo}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="usuario@correo.com"
                    placeholderTextColor={isDark ? "#666" : "#999"}
                  />
                </View>
              </View>
            </View>

            {/* Tarjeta de Contraseña */}
            <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name="lock-closed"
                  size={22}
                  color="#539DF3"
                />
                <Text style={[styles.cardTitle, isDark && styles.textDark]}>
                  Contraseña
                </Text>
              </View>
              
              <Text style={[styles.cardSubtitle, isDark && styles.textMutedDark]}>
                {isEditing 
                  ? "Deja en blanco para no cambiar la contraseña" 
                  : "Establece la contraseña inicial del usuario"
                }
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  {isEditing ? "Nueva Contraseña" : "Contraseña *"}
                </Text>
                <View style={[styles.inputWithIcon, isDark && styles.inputDark]}>
                  <Ionicons
                    name="key"
                    size={18}
                    color={isDark ? "#888" : "#666"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.inputWithIconField, isDark && styles.inputDark]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder={isEditing ? "Opcional" : "Contraseña inicial"}
                    placeholderTextColor={isDark ? "#666" : "#999"}
                  />
                </View>
              </View>
            </View>

            {/* Tarjeta de Rol y Estatus */}
            <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name="settings"
                  size={22}
                  color="#539DF3"
                />
                <Text style={[styles.cardTitle, isDark && styles.textDark]}>
                  Configuración
                </Text>
              </View>

              <Text style={[styles.label, isDark && styles.labelDark]}>
                Rol del Usuario
              </Text>
              <View style={styles.filterOptions}>
                {roles.map((rol: any) => (
                  <TouchableOpacity
                    key={rol.value}
                    style={[
                      styles.filterOption,
                      idRol === rol.value && styles.filterOptionActive,
                    ]}
                    onPress={() => setIdRol(rol.value)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        idRol === rol.value && styles.filterOptionTextActive,
                      ]}
                    >
                      {rol.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Acciones del Modal */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  loading && styles.saveButtonDisabled,
                  isDark && styles.saveButtonDark,
                ]}
                onPress={handleSave}
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
                      {isEditing ? "Actualizar" : "Crear"} Usuario
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelButton, isDark && styles.cancelButtonDark]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, isDark && styles.textDark]}>
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
  content: {
    flex: 1,
    padding: 20,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#ffffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerDark: {
    backgroundColor: "#1c1c1e",
    borderBottomColor: "#333",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    marginLeft: -8,
  },
    backText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#539DF3",
    marginLeft: 4,
  },
    headerPlaceholder: {
    width: 90, // Mismo ancho que el botón de atrás para balance
  },
  headerTitle: {
    fontSize: 22, 
    fontFamily: "Poppins_700Bold",
    color: "#111",
    textAlign: "center",
    flex: 1,
    marginHorizontal: 10,
  },

  // Create Button
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#539DF3",
    gap: 12,
  },
  createButtonDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#539DF3",
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#111",
  },

  // List Section
  listSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    marginBottom: 12,
    marginLeft: 4,
  },

  // Item Container
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  itemContainerDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#111",
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "gray",
    marginBottom: 8,
  },
  itemBadges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeAdmin: {
    backgroundColor: "#ffffffff",
    borderColor: "#539DF3",
    borderWidth: 1,
  },
  badgeUser: {
    backgroundColor: "#ffffffff",
    borderColor: "#539DF3",
    borderWidth: 1,
  },

  // Edit Button
  editButton: {
    padding: 8,
  },

  // Modal Header
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  modalHeaderDark: {
    backgroundColor: "#1c1c1e",
    borderBottomColor: "#333",
  },
  modalBackButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    marginLeft: -8,
  },
  modalBackText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#539DF3",
    marginLeft: 4,
  },
  modalHeaderPlaceholder: {
    width: 80,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#111",
  },

  // Modal Content
  modalContent: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
  },
  modalContentDark: {
    backgroundColor: "#000",
  },
  modalScrollContent: {
    paddingBottom: 30,
  },

  // Modal Cards
  modalCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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

  // Form Layout
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

  // Inputs
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
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    fontFamily: "Poppins_400Regular",
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
  },
  inputWithIconField: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 8,
  },
  inputIcon: {
    marginLeft: 16,
  },

  // Filter Options
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 10,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#539DF3",
    marginRight: 10,
    marginBottom: 10,
  },
  filterOptionActive: {
    backgroundColor: "#539DF3",
  },
  filterOptionText: {
    color: "#539DF3",
    fontFamily: "Poppins_500Medium",
  },
  filterOptionTextActive: {
    color: "#fff",
    fontFamily: "Poppins_700Bold",
  },

  // Modal Actions
  modalActions: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: "#539DF3",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#539DF3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDark: {
    backgroundColor: "#539DF3",
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    marginLeft: 8,
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
    borderWidth: 0.5,
    borderColor: "#000000ff",
  },
  cancelButtonDark: {
    borderColor: "#333",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
  },

  // Text Colors
  textDark: {
    color: "#fff",
  },
  textMutedDark: {
    color: "#888",
  },

  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 8,
    marginLeft: 8,
    width: 100,
  },
  deleteActionDisabled: {
    backgroundColor: "#9CA3AF",
  },
  deleteContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  deletingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  deleteActionText: {
    color: "white",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    marginTop: 4,
  },
  
  // Cambiar colores de badges para estatus
  badgeActive: {
    backgroundColor: "#DCFCE7", // Verde más suave
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  badgeInactive: {
    backgroundColor: "#FEE2E2", // Rojo más suave
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  // 🔥 AGREGAR colores de texto para estatus
  badgeTextActive: {
    color: "#166534", // Verde oscuro
  },
  badgeTextInactive: {
    color: "#991B1B", // Rojo oscuro
  },
});