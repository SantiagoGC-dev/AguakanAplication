// app/admin/gestion-usuarios.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import api from "@/utils/api";
import { Stack } from "expo-router";

export default function GestionUsuariosScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados del Formulario
  // Estados del Formulario
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [primerNombre, setPrimerNombre] = useState(""); // 🔥 Renombrado
  const [apPaterno, setApPaterno] = useState(""); // 🔥 Nuevo
  const [apMaterno, setApMaterno] = useState(""); // 🔥 Nuevo
  const [idRol, setIdRol] = useState(2); // Default Laboratorista
  const [idEstatus, setIdEstatus] = useState(1); // Default Activo

  // Estados de los estatus
  const [estatuses, setEstatuses] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 🔥 1. ASEGÚRATE QUE 'estatusRes' ESTÉ AQUÍ
      const [usersRes, rolesRes, estatusRes] = await Promise.all([
        api.get("/usuarios"),
        api.get("/usuarios/roles"),
        api.get("/usuarios/estatus"), // Esta llamada debe existir
      ]);

      setUsers(usersRes.data.data);
      setRoles(
        rolesRes.data.data.map((r: any) => ({
          label: r.nombre_rol,
          value: r.id_rol,
        }))
      );

      // 🔥 2. Y LUEGO ÚSALA EXACTAMENTE ASÍ AQUÍ
      setEstatuses(
        estatusRes.data.data.map((e: any) => ({
          label: e.nombre_estatus,
          value: e.id_estatus_usuario,
        }))
      );
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar los datos");
      console.error("Error en fetchData:", error); // Añade esto para ver más detalles
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user: any = null) => {
    if (user) {
      // --- Editando Usuario ---
      setIsEditing(true);
      setCurrentUser(user);
      setCorreo(user.correo);
      setPrimerNombre(user.primer_nombre); // 🔥 Actualizado
      setApPaterno(user.apellido_paterno || ""); // 🔥 Nuevo
      setApMaterno(user.apellido_materno || ""); // 🔥 Nuevo
      setIdRol(user.id_rol);
      setIdEstatus(user.id_estatus_usuario);
      setPassword(""); // La contraseña se resetea, no se muestra
    } else {
      // --- Creando Usuario ---
      setIsEditing(false);
      setCurrentUser(null);
      setCorreo("");
      setPrimerNombre(""); // 🔥 Actualizado
      setApPaterno(""); // 🔥 Nuevo
      setApMaterno(""); // 🔥 Nuevo
      setPassword("");
      setIdRol(2); // Default Laboratorista
      setIdEstatus(1); // Default Activo (como pediste)
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    // 🔥 Validación actualizada
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
          primer_nombre: primerNombre, // 🔥 Actualizado
          apellido_paterno: apPaterno, // 🔥 Nuevo
          apellido_materno: apMaterno, // 🔥 Nuevo
          id_rol: idRol,
          id_estatus_usuario: idEstatus,
          password: password || undefined, // (Se actualiza si no es vacío)
        };
        await api.put(`/usuarios/${currentUser.id_usuario}`, data);
        Alert.alert("Éxito", "Usuario actualizado");
      } else {
        // --- Crear Usuario (Registro) ---
        const data = {
          correo,
          password,
          primer_nombre: primerNombre, // 🔥 Actualizado
          apellido_paterno: apPaterno, // 🔥 Nuevo
          apellido_materno: apMaterno, // 🔥 Nuevo
          id_rol: idRol,
          // No enviamos estatus, el backend lo pone en 1 (Activo)
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

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <View>
        <Text style={styles.itemTitle}>
          {item.primer_nombre} {item.apellido_paterno}
        </Text>
        <Text>{item.correo}</Text>
        <Text>
          {item.nombre_rol} -{" "}
          {item.id_estatus_usuario === 1 ? "Activo" : "Inactivo"}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => openModal(item)}
      >
        <Text style={styles.editButtonText}>Editar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Gestión de Usuarios" }} />
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id_usuario.toString()}
        refreshing={loading}
        onRefresh={fetchData}
        ListHeaderComponent={
          <TouchableOpacity style={styles.button} onPress={() => openModal()}>
            <Text style={styles.buttonText}>Crear Nuevo Usuario</Text>
          </TouchableOpacity>
        }
      />

      {/* Modal de Edición/Creación */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.title}>
            {isEditing ? "Editar" : "Crear"} Usuario
          </Text>

          <Text style={styles.label}>Primer Nombre</Text>
          <TextInput
            style={styles.input}
            value={primerNombre}
            onChangeText={setPrimerNombre}
          />

          <Text style={styles.label}>Apellido Paterno</Text>
          <TextInput
            style={styles.input}
            value={apPaterno}
            onChangeText={setApPaterno}
          />

          <Text style={styles.label}>Apellido Materno</Text>
          <TextInput
            style={styles.input}
            value={apMaterno}
            onChangeText={setApMaterno}
          />

          <Text style={styles.label}>Correo</Text>
          <TextInput
            style={styles.input}
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={
              isEditing
                ? "Dejar en blanco para no cambiar"
                : "Contraseña inicial"
            }
          />

          <Text style={styles.label}>Rol</Text>
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

          {isEditing && (
            <>
              <Text style={styles.label}>Estatus</Text>
              <View style={styles.filterOptions}>
                {estatuses.map((estatus: any) => (
                  <TouchableOpacity
                    key={estatus.value}
                    style={[
                      styles.filterOption,
                      idEstatus === estatus.value && styles.filterOptionActive,
                    ]}
                    onPress={() => setIdEstatus(estatus.value)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        idEstatus === estatus.value &&
                          styles.filterOptionTextActive,
                      ]}
                    >
                      {estatus.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Guardando..." : "Guardar"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "gray" }]}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  modalContainer: { flex: 1, padding: 20, paddingTop: 60 },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    margin: 10,
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  itemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  itemTitle: { fontSize: 16, fontWeight: "bold" },
  editButton: { backgroundColor: "#eee", padding: 10, borderRadius: 5 },
  editButtonText: { color: "#007AFF" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  label: { fontSize: 16, marginTop: 10, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
  },
  picker: { borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 10 },
  pickerSelected: { fontWeight: "bold", color: "#007AFF" },

  // (dentro de tu StyleSheet.create)
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
    borderColor: "#007AFF", // Ajusta tu color
    marginRight: 10,
    marginBottom: 10,
  },
  filterOptionActive: {
    backgroundColor: "#007AFF", // Ajusta tu color
  },
  filterOptionText: {
    color: "#007AFF", // Ajusta tu color
  },
  filterOptionTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
});
