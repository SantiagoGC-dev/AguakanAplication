import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading: loading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Por favor ingresa un correo válido');
      return;
    }

    try {
      const result = await login(email, password);
      if (result.success) {
        console.log('Login exitoso, esperando redirección del contexto...');
      } else {
        console.log('Fallo el login:', result.error);
      }
    } catch (error) {
      console.error('Error inesperado en handleLogin:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, isDark && styles.containerDark]}>
          
          {/* Header con nuevo diseño */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>LOGO</Text>
              </View>
            </View>
            <Text style={[styles.title, isDark && styles.titleDark]}>
              INVKAN
            </Text>
            <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
              Sistema de Gestión de Inventario
            </Text>
          </View>

          {/* Formulario con nuevo diseño */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, isDark && styles.labelDark]}>
                Correo electrónico
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="usuario@aguakan.com"
                placeholderTextColor={isDark ? '#888' : '#999'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, isDark && styles.labelDark]}>
                Contraseña
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="••••••••"
                placeholderTextColor={isDark ? '#888' : '#999'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Iniciar sesión</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Información de testing con nuevo diseño */}
          <View style={[styles.testInfo, isDark && styles.testInfoDark]}>
            <Text style={[styles.testTitle, isDark && styles.testTitleDark]}>
              Usuarios de prueba:
            </Text>
            <View style={styles.testUserItem}>
              <Text style={[styles.testRole, isDark && styles.testRoleDark]}>Admin:</Text>
              <Text style={[styles.testText, isDark && styles.testTextDark]}>
                santiago@aguakan.com / Nacho123
              </Text>
            </View>
            <View style={styles.testUserItem}>
              <Text style={[styles.testRole, isDark && styles.testRoleDark]}>Laboratorio:</Text>
              <Text style={[styles.testText, isDark && styles.testTextDark]}>
                cignacio@aguakan.com / Password123
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#f8fbff',
  },
  containerDark: {
    backgroundColor: '#0a1929',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4B9CD3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4B9CD3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#4B9CD3',
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
  },
  titleDark: {
    color: '#6BB5E8',
  },
  subtitle: {
    fontSize: 18,
    color: '#4B9CD3',
    fontFamily: 'Poppins_400Regular',
    opacity: 0.8,
  },
  subtitleDark: {
    color: '#6BB5E8',
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2c3e50',
    fontFamily: 'Poppins_500Medium',
  },
  labelDark: {
    color: '#e1e8f0',
  },
  input: {
    borderWidth: 2,
    borderColor: '#e1f0ff',
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    backgroundColor: '#ffffff',
    fontFamily: 'Poppins_400Regular',
    shadowColor: '#4B9CD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  inputDark: {
    borderColor: '#1e3a5c',
    backgroundColor: '#1a3650',
    color: '#fff',
  },
  button: {
    backgroundColor: '#4B9CD3',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#4B9CD3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ translateY: 0 }],
  },
  buttonDisabled: {
    backgroundColor: '#a0c4e4',
    shadowOpacity: 0,
    elevation: 0,
    transform: [{ translateY: 0 }],
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
  },
  testInfo: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#e8f4ff',
    borderRadius: 16,
    borderLeftWidth: 0,
    shadowColor: '#4B9CD3',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  testInfoDark: {
    backgroundColor: '#1a3650',
    borderLeftColor: '#4B9CD3',
  },
  testTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2c3e50',
    fontFamily: 'Poppins_500Medium',
  },
  testTitleDark: {
    color: '#e1e8f0',
  },
  testUserItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  testRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B9CD3',
    marginRight: 8,
    fontFamily: 'Poppins_500Medium',
    minWidth: 80,
  },
  testRoleDark: {
    color: '#6BB5E8',
  },
  testText: {
    fontSize: 12,
    color: '#5d7a91',
    flex: 1,
    fontFamily: 'Poppins_400Regular',
  },
  testTextDark: {
    color: '#a8c6e0',
  },
});