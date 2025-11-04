import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.titleDark]}>
          Perfil
        </Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={[styles.label, isDark && styles.labelDark]}>
          Nombre:
        </Text>
        <Text style={[styles.value, isDark && styles.valueDark]}>
          {user?.primer_nombre} {user?.apellido_paterno}
        </Text>

        <Text style={[styles.label, isDark && styles.labelDark]}>
          Correo:
        </Text>
        <Text style={[styles.value, isDark && styles.valueDark]}>
          {user?.correo}
        </Text>

        <Text style={[styles.label, isDark && styles.labelDark]}>
          Rol:
        </Text>
        <Text style={[styles.value, isDark && styles.valueDark]}>
          {user?.rol === 1 ? 'Administrador' : 'Laboratorio'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, isDark && styles.logoutButtonDark]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
    fontFamily: 'Poppins_700Bold',
  },
  titleDark: {
    color: '#0A84FF',
  },
  userInfo: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    fontFamily: 'Poppins_500Medium',
  },
  labelDark: {
    color: '#fff',
  },
  value: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    fontFamily: 'Poppins_400Regular',
  },
  valueDark: {
    color: '#ccc',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonDark: {
    backgroundColor: '#FF453A',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_700Bold',
  },
});