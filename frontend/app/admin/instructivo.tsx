// app/admin/instructivo.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';

export default function InstructivoScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user } = useAuth(); // Obtener el usuario del contexto
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Verificar si el usuario es administrador
  const isAdmin = user?.rol === 1;
  
  useEffect(() => {
    fetchInstructivo();
  }, []);

  const fetchInstructivo = async () => {
    setLoading(true);
    try {
      const response = await api.get('/instructivo');
      if (response.data.success) {
        setPdfUrl(response.data.url);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar la información del instructivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleView = () => {
    if (pdfUrl) {
      Linking.openURL(pdfUrl);
    } else {
      Alert.alert("Sin instructivo", "Aún no se ha subido un instructivo.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar Instructivo",
      "¿Estás seguro de que quieres eliminar el instructivo actual? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await api.delete('/instructivo');
              Alert.alert("Éxito", "Instructivo eliminado.");
              setPdfUrl(null);
            } catch (error: any) {
              Alert.alert("Error", error.response?.data?.error || "No se pudo eliminar.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: false,
      });
      
      if (result.canceled) return;
      
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('instructivo', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);

      setLoading(true);

      const response = await api.post('/instructivo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        Alert.alert("Éxito", "Instructivo actualizado.");
        setPdfUrl(response.data.url);
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "No se pudo subir el archivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header con flecha */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity
          onPress={() => router.back()}
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
          Instructivo de Trabajo
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Tarjeta de Información */}
        <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
          <View style={styles.cardHeader}>
            <Ionicons
              name="document-text"
              size={24}
              color="#539DF3"
            />
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>
              {isAdmin ? "Gestión del Instructivo" : "Instructivo de Trabajo"}
            </Text>
          </View>
          <Text style={[styles.cardDescription, isDark && styles.textMutedDark]}>
            {isAdmin 
              ? "Aquí puedes gestionar el instructivo de trabajo. El archivo debe estar en formato PDF."
              : "Consulta el instructivo de trabajo. Solo disponible para lectura."
            }
          </Text>
          
          {/* Badge de permisos */}
          <View style={[
            styles.permissionBadge, 
            isAdmin ? styles.adminBadge : styles.userBadge
          ]}>
            <Ionicons
              name={isAdmin ? "shield" : "eye"}
              size={14}
              color={isAdmin ? "#fff" : "#fff"}
            />
            <Text style={styles.permissionBadgeText}>
              {isAdmin ? "Administrador" : "Solo lectura"}
            </Text>
          </View>
        </View>

        {/* Estado Actual */}
        <View style={[styles.statusCard, isDark && styles.statusCardDark]}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={pdfUrl ? "checkmark-circle" : "alert-circle"}
              size={22}
              color={pdfUrl ? "#4CAF50" : "#FFA000"}
            />
            <Text style={[styles.statusTitle, isDark && styles.textDark]}>
              Estado Actual
            </Text>
          </View>
          <Text style={[styles.statusText, isDark && styles.textMutedDark]}>
            {pdfUrl 
              ? "Hay un instructivo cargado en el sistema" 
              : "No hay instructivo cargado en el sistema"
            }
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#539DF3" />
            <Text style={[styles.loadingText, isDark && styles.textMutedDark]}>
              Cargando...
            </Text>
          </View>
        )}

        {/* Botones de Acción */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            {isAdmin ? "Acciones Disponibles" : "Acción Disponible"}
          </Text>

          {/* Botón Ver - Disponible para todos */}
          <TouchableOpacity 
            style={[styles.actionButton, isDark && styles.actionButtonDark]}
            onPress={handleView}
            disabled={!pdfUrl}
          >
            <View style={styles.buttonContent}>
              <Ionicons
                name="eye"
                size={22}
                color={pdfUrl ? "#539DF3" : (isDark ? "#666" : "#999")}
              />
              <View style={styles.buttonTextContainer}>
                <Text style={[
                  styles.actionButtonText, 
                  isDark && styles.textDark,
                  !pdfUrl && styles.disabledText
                ]}>
                  Ver Instructivo
                </Text>
                <Text style={[
                  styles.actionButtonSubtext, 
                  isDark && styles.textMutedDark
                ]}>
                  {pdfUrl ? "Abrir PDF actual" : "No hay instructivo disponible"}
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#666" : "#999"}
            />
          </TouchableOpacity>

          {/* Botones de Administración - Solo para administradores */}
          {isAdmin && (
            <>
              {/* Botón Subir/Actualizar */}
              <TouchableOpacity 
                style={[styles.actionButton, isDark && styles.actionButtonDark]}
                onPress={handleUpload}
              >
                <View style={styles.buttonContent}>
                  <Ionicons
                    name="cloud-upload"
                    size={22}
                    color="#539DF3"
                  />
                  <View style={styles.buttonTextContainer}>
                    <Text style={[styles.actionButtonText, isDark && styles.textDark]}>
                      {pdfUrl ? "Actualizar PDF" : "Subir PDF"}
                    </Text>
                    <Text style={[styles.actionButtonSubtext, isDark && styles.textMutedDark]}>
                      {pdfUrl ? "Reemplazar instructivo actual" : "Cargar nuevo instructivo"}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isDark ? "#666" : "#999"}
                />
              </TouchableOpacity>

              {/* Botón Eliminar (solo si hay PDF) */}
              {pdfUrl && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton, isDark && styles.actionButtonDark]}
                  onPress={handleDelete}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons
                      name="trash"
                      size={22}
                      color="#FF3B30"
                    />
                    <View style={styles.buttonTextContainer}>
                      <Text style={[styles.actionButtonText, styles.deleteText]}>
                        Eliminar PDF
                      </Text>
                      <Text style={[styles.actionButtonSubtext, isDark && styles.textMutedDark]}>
                        Eliminar instructivo actual del sistema
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#FF3B30"
                  />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Mensaje para laboratoristas si no hay PDF */}
          {!isAdmin && !pdfUrl && (
            <View style={[styles.infoMessage, isDark && styles.infoMessageDark]}>
              <Ionicons
                name="information-circle"
                size={20}
                color="#539DF3"
              />
              <Text style={[styles.infoMessageText, isDark && styles.textMutedDark]}>
                Actualmente no hay instructivo disponible. Contacta al administrador.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Container & Layout
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
    backgroundColor: "#F8FAFC",
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
    width: 80,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#111",
    textAlign: "center",
    flex: 1,
    marginHorizontal: 10,
  },

  // Info Card
  infoCard: {
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
  infoCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#111",
    marginLeft: 12,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },

  // Permission Badge
  permissionBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  adminBadge: {
    backgroundColor: "#539DF3",
  },
  userBadge: {
    backgroundColor: "#6B7280",
  },
  permissionBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },

  // Status Card
  statusCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#111",
    marginLeft: 12,
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },

  // Loading
  loadingContainer: {
    alignItems: "center",
    padding: 20,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    marginTop: 8,
  },

  // Actions Section
  actionsSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    marginBottom: 16,
    marginLeft: 4,
  },

  // Action Buttons
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  actionButtonDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  deleteButton: {
    borderColor: "#FF3B30",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  buttonTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#111",
    marginBottom: 2,
  },
  actionButtonSubtext: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },
  deleteText: {
    color: "#FF3B30",
  },
  disabledText: {
    color: "#999",
  },

  // Info Message
  infoMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#539DF3",
    marginTop: 8,
  },
  infoMessageDark: {
    backgroundColor: "#1A365D",
    borderColor: "#2D3748",
  },
  infoMessageText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },

  // Text Colors
  textDark: {
    color: "#fff",
  },
  textMutedDark: {
    color: "#888",
  },
});