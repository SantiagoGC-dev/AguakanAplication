// app/acerca-de.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';

export default function AcercaDeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  const openUserManual = async () => {
    try {
      // Cargar el asset del manual de usuario
      const asset = Asset.fromModule(require('@/assets/manual-usuario.pdf'));
      await asset.downloadAsync();

      // Verificar si sharing está disponible
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(asset.localUri!, {
          mimeType: 'application/pdf',
          dialogTitle: 'Abrir Manual de Usuario',
          UTI: 'com.adobe.pdf' // Solo para iOS
        });
      } else {
        Alert.alert('Error', 'No se puede abrir el archivo en este dispositivo');
      }
    } catch (error) {
      console.error('Error al abrir el manual:', error);
      Alert.alert(
        'Abrir Manual', 
        'Selecciona una aplicación para abrir el PDF',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Intentar de nuevo', 
            onPress: () => openUserManual() 
          }
        ]
      );
    }
  };

  const appInfoItems = [
    {
      icon: "cube",
      title: "Versión de la Aplicación",
      value: "1.0.0",
      description: "Proyecto de Estadía 2025"
    },
    {
      icon: "calendar",
      title: "Fecha de Lanzamiento",
      value: "Diciembre 2025",
      description: "Versión inicial"
    },
    {
      icon: "build",
      title: "Última Actualización",
      value: "Diciembre 2025",
      description: "Mejoras de estabilidad"
    }
  ];

  const developmentInfo = [
    {
      icon: "business",
      title: "Propietario del Sistema",
      value: "AGUAKAN",
      description: "Empresa que opera servicios de agua potable, alcantarillado y saneamiento"
    },
    {
      icon: "school",
      title: "Institución Educativa",
      value: "Universidad Tecnológica de la Riviera Maya",
      description: "Formación de profesionales técnicos"
    },
    {
      icon: "person",
      title: "Desarrollador",
      value: "David Santiago Gutiérrez Calderón",
      description: "Estudiante de Ingeniería en Desarrollo de Software"
    },
    {
      icon: "people",
      title: "Asesor Empresarial",
      value: "Ing. Pedro Hernández Torres",
      description: "Administrador del área de Calidad - AGUAKAN"
    }
  ];

  const technicalInfo = [
    {
      icon: "logo-react",
      title: "Frontend",
      value: "React Native + Expo",
      description: "Desarrollo móvil multiplataforma"
    },
    {
      icon: "cog-outline",
      title: "Backend",
      value: "Node.js + Express",
      description: "API RESTful con autenticación JWT"
    },
    {
      icon: "server",
      title: "Base de Datos",
      value: "MySQL",
      description: "Almacenamiento relacional"
    }
  ];

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
          Acerca de
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Tarjeta de Presentación */}
        <View style={[styles.heroCard, isDark && styles.heroCardDark]}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="cube"
              size={40}
              color="#539DF3"
            />
          </View>
          <Text style={[styles.heroTitle, isDark && styles.textDark]}>
            Sistema de Gestión de Inventario
          </Text>
          <Text style={[styles.heroSubtitle, isDark && styles.textMutedDark]}>
            AGUAKAN - Control y Administración del Laboratorio de Calidad
          </Text>
          <Text style={[styles.heroDescription, isDark && styles.textMutedDark]}>
            Plataforma desarrollada para optimizar el control de inventario, 
            mejorar la trazabilidad de productos y agilizar los procesos 
            operativos del laboratorio de calidad.
          </Text>
        </View>

        {/* Información de la Aplicación */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Información de la Aplicación
          </Text>

          <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
            {appInfoItems.map((item, index) => (
              <View key={index} style={styles.infoItem}>
                <View style={styles.infoHeader}>
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color="#539DF3"
                  />
                  <Text style={[styles.infoTitle, isDark && styles.textDark]}>
                    {item.title}
                  </Text>
                </View>
                <Text style={[styles.infoValue, isDark && styles.textDark]}>
                  {item.value}
                </Text>
                <Text style={[styles.infoDescription, isDark && styles.textMutedDark]}>
                  {item.description}
                </Text>
                {index < appInfoItems.length - 1 && (
                  <View style={[styles.separator, isDark && styles.separatorDark]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Información de Desarrollo */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Desarrollo y Colaboradores
          </Text>

          <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
            {developmentInfo.map((item, index) => (
              <View key={index} style={styles.infoItem}>
                <View style={styles.infoHeader}>
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color="#539DF3"
                  />
                  <Text style={[styles.infoTitle, isDark && styles.textDark]}>
                    {item.title}
                  </Text>
                </View>
                <Text style={[styles.infoValue, isDark && styles.textDark]}>
                  {item.value}
                </Text>
                <Text style={[styles.infoDescription, isDark && styles.textMutedDark]}>
                  {item.description}
                </Text>
                {index < developmentInfo.length - 1 && (
                  <View style={[styles.separator, isDark && styles.separatorDark]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Información Técnica */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Tecnologías Utilizadas
          </Text>

          <View style={[styles.techCard, isDark && styles.techCardDark]}>
            {technicalInfo.map((item, index) => (
              <View key={index} style={styles.techItem}>
                <View style={styles.techIconContainer}>
                  <Ionicons
                    name={item.icon as any}
                    size={24}
                    color="#539DF3"
                  />
                </View>
                <View style={styles.techTextContainer}>
                  <Text style={[styles.techTitle, isDark && styles.textDark]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.techValue, isDark && styles.textDark]}>
                    {item.value}
                  </Text>
                  <Text style={[styles.techDescription, isDark && styles.textMutedDark]}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recursos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Recursos
          </Text>

          <TouchableOpacity 
            style={[styles.actionCard, isDark && styles.actionCardDark]}
            onPress={openUserManual}
          >
            <View style={styles.actionContent}>
              <Ionicons
                name="document-text"
                size={22}
                color="#539DF3"
              />
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, isDark && styles.textDark]}>
                  Manual de Usuario
                </Text>
                <Text style={[styles.actionDescription, isDark && styles.textMutedDark]}>
                  Guía completa de uso del sistema
                </Text>
              </View>
            </View>
            <Ionicons
              name="share"
              size={20}
              color={isDark ? "#666" : "#999"}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, isDark && styles.actionCardDark]}
            onPress={() => router.push('/ayuda-soporte')}
          >
            <View style={styles.actionContent}>
              <Ionicons
                name="help-circle"
                size={22}
                color="#539DF3"
              />
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, isDark && styles.textDark]}>
                  Centro de Ayuda
                </Text>
                <Text style={[styles.actionDescription, isDark && styles.textMutedDark]}>
                  Preguntas frecuentes y soporte
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#666" : "#999"}
            />
          </TouchableOpacity>
        </View>

        {/* Footer Informativo */}
        <View style={[styles.footerCard, isDark && styles.footerCardDark]}>
          <Ionicons
            name="shield-checkmark"
            size={24}
            color="#4CAF50"
          />
          <Text style={[styles.footerText, isDark && styles.textMutedDark]}>
            © 2025 David Santiago Gutiérrez Calderón. Todos los derechos reservados.{'\n'}
            Sistema desarrollado con fines educativos y operativos.
          </Text>
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

  // Hero Card
  heroCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    alignItems: "center",
  },
  heroCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: "#111",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#539DF3",
    textAlign: "center",
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    marginBottom: 16,
    marginLeft: 4,
  },

  // Info Cards
  infoCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
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
  infoItem: {
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#111",
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#111",
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginTop: 16,
  },
  separatorDark: {
    backgroundColor: "#333",
  },

  // Tech Card
  techCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  techCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  techItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  techIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  techTextContainer: {
    flex: 1,
  },
  techTitle: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#111",
    marginBottom: 4,
  },
  techValue: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#539DF3",
    marginBottom: 4,
  },
  techDescription: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },

  // Action Cards
  actionCard: {
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
  actionCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  actionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#111",
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },

  // Footer Card
  footerCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: "center",
    marginBottom: 40,
  },
  footerCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 16,
  },

  // Text Colors
  textDark: {
    color: "#fff",
  },
  textMutedDark: {
    color: "#888",
  },
});