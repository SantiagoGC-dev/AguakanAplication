// app/acerca-de.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import * as Linking from 'expo-linking';

export default function AcercaDeScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Acerca de' }} />
      <Text style={styles.title}>Sistema de Gestión de Inventarios</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Versión</Text>
        <Text style={styles.cardText}>1.0 (Proyecto de Estadía 2025)</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Propietario</Text>
        <Text style={styles.cardText}>AGUAKAN</Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Desarrollo</Text>
        <Text style={styles.cardText}>
          Aplicación desarrollada como proyecto de Estadía Profesional por:
        </Text>
        <Text style={styles.cardContact}>[Tu Nombre Completo Aquí]</Text>
        <Text style={styles.cardText}>[Nombre de tu Universidad]</Text>
      </View>

      {/* Si quieres, aquí puedes agregar un botón que también abra el instructivo.
        Usaría la misma lógica de 'app/admin/instructivo.tsx' 
        (llamar a api.get('/instructivo') y usar Linking.openURL)
      */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  card: { 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 15, 
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center'
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#007AFF' },
  cardText: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  cardContact: { fontSize: 17, fontWeight: '500', marginVertical: 5 },
});