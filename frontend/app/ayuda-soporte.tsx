// app/ayuda-soporte.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';

export default function AyudaScreen() {
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Ayuda y Soporte' }} />
      <Text style={styles.title}>Ayuda y Soporte</Text>

      <Text style={styles.subtitle}>Contacto de Soporte</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dudas de Inventario o Procesos</Text>
        <Text style={styles.cardText}>
          Si tienes dudas sobre el inventario, un producto no aparece o necesitas 
          corregir un movimiento, contacta al Administrador de Calidad.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Soporte Técnico (TI)</Text>
        <Text style={styles.cardText}>
          Para problemas técnicos (errores de servidor, la app no conecta, etc.), 
          contacta al Departamento de TI de AGUAKAN.
        </Text>
        <Text style={styles.cardContact}>Email: soporte.ti@aguakan.com</Text>
        <Text style={styles.cardContact}>Extensión: 123</Text>
      </View>

      <Text style={styles.subtitle}>Preguntas Frecuentes (FAQ)</Text>
      <View style={styles.card}>
        <Text style={styles.faqQuestion}>P: ¿Qué hago si olvidé mi contraseña?</Text>
        <Text style={styles.faqAnswer}>
          R: Debes contactar a tu Administrador de Calidad para que la reestablezca 
          desde la pantalla "Gestión de Usuarios".
        </Text>
        <Text style={styles.faqQuestion}>P: ¿Cómo doy de baja un producto?</Text>
        <Text style={styles.faqAnswer}>
          R: Ve a "Inventario", selecciona el producto y usa la opción "Baja de Producto". 
          Consulta el Manual de Usuario en "Acerca de" para más detalles.
        </Text>
      </View>
    </ScrollView>
  );
}

// (Estilos)
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  subtitle: { fontSize: 22, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  card: { 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 15, 
    borderWidth: 1,
    borderColor: '#eee'
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  cardText: { fontSize: 16, lineHeight: 24, marginBottom: 10 },
  cardContact: { fontSize: 16, fontWeight: '500', color: '#007AFF' },
  faqQuestion: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  faqAnswer: { fontSize: 16, lineHeight: 24, marginBottom: 15, opacity: 0.8 },
});