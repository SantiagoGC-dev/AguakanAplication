// app/admin/instructivo.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

export default function InstructivoScreen() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
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
              setPdfUrl(null); // Actualiza la UI
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
        setPdfUrl(response.data.url); // Actualiza la UI
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "No se pudo subir el archivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Instructivo Empresarial' }} />
      <Text style={styles.title}>Gestión de Instructivo</Text>
      <Text style={styles.description}>
        Aquí puedes ver, actualizar o eliminar el instructivo empresarial en PDF 
        para todos los usuarios.
      </Text>

      {loading && <ActivityIndicator size="large" style={{ marginVertical: 20 }} />}

      <TouchableOpacity style={styles.button} onPress={handleView}>
        <Text style={styles.buttonText}>
          {pdfUrl ? "Ver Instructivo Actual" : "Ver (No hay instructivo)"}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, { backgroundColor: '#f0ad4e' }]} onPress={handleUpload}>
        <Text style={styles.buttonText}>Subir / Actualizar PDF</Text>
      </TouchableOpacity>

      {pdfUrl && (
        <TouchableOpacity style={[styles.button, { backgroundColor: '#d9534f' }]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Eliminar PDF Actual</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// (Estilos - puedes usar los tuyos)
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  description: { fontSize: 16, color: 'gray', marginBottom: 30 },
  button: { 
    backgroundColor: '#007AFF', 
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});