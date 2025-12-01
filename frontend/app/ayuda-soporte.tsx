import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";

export default function AyudaScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user } = useAuth();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const contactItems = [
    {
      icon: "man-outline",
      title: "Dudas de Inventario o Procesos",
      description:
        "Si tienes dudas sobre el inventario, un producto no aparece o necesitas corregirlo, contacta al Administrador de Calidad.",
      contact: null,
    },
    {
      icon: "construct",
      title: "Soporte Técnico (TI)",
      description:
        "Para problemas técnicos (errores de servidor, la app no conecta, etc.), contacta al Departamento de TI.",
    },
  ];

  const faqItems = [
    {
      question: "¿Qué hago si olvido mi contraseña?",
      answer:
        "Debes contactar a tu Administrador de Calidad para que la reestablezca desde la pantalla 'Gestión de Usuarios'.",
    },
    {
      question: "¿Cómo doy de baja un producto?",
      answer:
        "Ve a 'Inventario', selecciona el producto y usa la opción 'Baja' en 'Reportar'. Consulta el Manual de Usuario en 'Acerca de' para más detalles.",
    },
    {
      question: "¿Puedo usar la app sin conexión a internet?",
      answer:
        "No, la aplicación requiere conexión a internet para sincronizar los datos en tiempo real con el servidor.",
    },
    {
      question: "¿Cómo agrego un nuevo producto al inventario?",
      answer:
        "Ve a 'Inventario', selecciona la opción 'Añadir' y completa la información requerida en la sección correspondiente al tipo de producto.",
    },
    {
      question: "¿Dónde reviso la duración de uso de un producto?",
      answer:
        "Ve a detalles del producto en 'Inventario' busca la sección 'Control de Movimientos' ahi encontrarás la información sobre la duración de uso del producto.",
    },
  ];

  const toggleFaq = (index: number) => {
    if (expandedFaq === index) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(index);
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
          Ayuda y Soporte
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tarjeta de Bienvenida */}
        <View style={[styles.welcomeCard, isDark && styles.welcomeCardDark]}>
          <View style={styles.welcomeHeader}>
            <Ionicons name="help-circle-outline" size={28} color="#539DF3" />
            <Text style={[styles.welcomeTitle, isDark && styles.textDark]}>
              Centro de Ayuda
            </Text>
          </View>
          <Text style={[styles.welcomeText, isDark && styles.textMutedDark]}>
            Estamos aquí para ayudarte. Encuentra información de contacto,
            preguntas frecuentes y recursos para resolver tus dudas rápidamente.
          </Text>
        </View>

        {/* Sección de Contacto */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Contacto de Soporte
          </Text>

          {contactItems.map((item, index) => (
            <View
              key={index}
              style={[styles.contactCard, isDark && styles.contactCardDark]}
            >
              <View style={styles.contactHeader}>
                <Ionicons name={item.icon as any} size={22} color="#539DF3" />
                <Text style={[styles.contactTitle, isDark && styles.textDark]}>
                  {item.title}
                </Text>
              </View>
              <Text
                style={[
                  styles.contactDescription,
                  isDark && styles.textMutedDark,
                ]}
              >
                {item.description}
              </Text>
            </View>
          ))}
        </View>

        {/* --- SECCIÓN DE PREGUNTAS FRECUENTES --- */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Preguntas Frecuentes
          </Text>

          <View style={[styles.faqCard, isDark && styles.faqCardDark]}>
            {faqItems.map((item, index) => {
              // Comprueba si esta pregunta es la que está expandida
              const isExpanded = expandedFaq === index;

              return (
                <View key={index} style={styles.faqItem}>
                  {/* La pregunta ahora es un botón */}
                  <TouchableOpacity
                    style={styles.faqQuestionContainer}
                    onPress={() => toggleFaq(index)} // Llama a la función toggle
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.faqQuestion, isDark && styles.textDark]}
                    >
                      {item.question}
                    </Text>
                    {/* El ícono cambia según el estado */}
                    <Ionicons
                      name={
                        isExpanded
                          ? "chevron-up-outline"
                          : "chevron-down-outline"
                      }
                      size={20}
                      color={isDark ? "#fff" : "#666"}
                    />
                  </TouchableOpacity>

                  {/* La respuesta solo se renderiza si isExpanded es true */}
                  {isExpanded && (
                    <View style={styles.faqAnswerContainer}>
                      <Text
                        style={[
                          styles.faqAnswer,
                          isDark && styles.textMutedDark,
                        ]}
                      >
                        {item.answer}
                      </Text>
                    </View>
                  )}

                  {/* Separador */}
                  {index < faqItems.length - 1 && (
                    <View
                      style={[styles.separator, isDark && styles.separatorDark]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Sección de Recursos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Recursos
          </Text>
          <TouchableOpacity
            style={[styles.resourceCard, isDark && styles.resourceCardDark]}
            onPress={() => router.push("/admin/instructivo")}
          >
            <View style={styles.resourceContent}>
              <Ionicons name="document-text" size={22} color="#539DF3" />
              <View style={styles.resourceTextContainer}>
                <Text style={[styles.resourceTitle, isDark && styles.textDark]}>
                  Instructivo de Trabajo
                </Text>
                <Text
                  style={[
                    styles.resourceDescription,
                    isDark && styles.textMutedDark,
                  ]}
                >
                  {user?.rol === 1
                    ? "Gestionar el instructivo de trabajo"
                    : "Consultar el instructivo de trabajo"}
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#666" : "#999"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.resourceCard, isDark && styles.resourceCardDark]}
            onPress={() => router.push("/acerca-de")}
          >
            <View style={styles.resourceContent}>
              <Ionicons name="information-circle" size={22} color="#539DF3" />
              <View style={styles.resourceTextContainer}>
                <Text style={[styles.resourceTitle, isDark && styles.textDark]}>
                  Acerca de la Aplicación
                </Text>
                <Text
                  style={[
                    styles.resourceDescription,
                    isDark && styles.textMutedDark,
                  ]}
                >
                  Información sobre versiones y características
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

        {/* Sección de Administración */}
        {user?.rol === 1 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
              Administración
            </Text>
            <TouchableOpacity
              style={[styles.resourceCard, isDark && styles.resourceCardDark]}
              onPress={() => router.push("/admin/gestion-usuarios")}
            >
              <View style={styles.resourceContent}>
                <Ionicons name="people" size={22} color="#539DF3" />
                <View style={styles.resourceTextContainer}>
                  <Text
                    style={[styles.resourceTitle, isDark && styles.textDark]}
                  >
                    Gestión de Usuarios
                  </Text>
                  <Text
                    style={[
                      styles.resourceDescription,
                      isDark && styles.textMutedDark,
                    ]}
                  >
                    Administrar usuarios del sistema
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
        )}
      </ScrollView>
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
  welcomeCard: {
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
  welcomeCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#111",
    marginLeft: 12,
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    lineHeight: 20,
  },
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
  contactCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#111",
    marginLeft: 12,
    flex: 1,
  },
  contactDescription: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  contactInfo: {
    marginTop: 8,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#111",
    marginLeft: 8,
  },
  contactType: {
    fontFamily: "Poppins_500Medium",
    color: "#539DF3",
  },
  resourceCard: {
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
  resourceCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  resourceContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  resourceTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#111",
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },
  textDark: {
    color: "#fff",
  },
  textMutedDark: {
    color: "#888",
  },
  faqCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  faqCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  faqItem: {},
  faqQuestionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  faqQuestion: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#111",
    flex: 1,
    lineHeight: 22,
    paddingRight: 10,
  },
  faqAnswerContainer: {
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    flex: 1,
    lineHeight: 22,
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginHorizontal: 20,
  },
  separatorDark: {
    backgroundColor: "#333",
  },
});
