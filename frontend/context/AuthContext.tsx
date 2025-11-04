import React, { useState, useEffect, createContext, useContext } from 'react';
import { Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { storage } from '../utils/storage'; // Ajusta la ruta si es necesario

// Interfaz de Usuario
export interface User {
  id: number;
  correo: string;
  primer_nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  rol: number;
  estatus: number;
}

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (correo: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// 5 minutos en milisegundos
const EXPIRATION_TIME = 5 * 60 * 1000; 
// 🔥 TU IP CORRECTA
const API_BASE_URL = "http://192.168.0.169:3000";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuthSession();
  }, []);

  useEffect(() => {
    if (isLoading) return; 
    const isAuth = !!user;

    if (!isAuth && pathname !== '/login') {
      console.log('🚫 [Context] No autenticado. Redirigiendo a login.');
      router.replace('/login');
    } else if (isAuth && pathname === '/login') {
      console.log('✅ [Context] Autenticado. Redirigiendo a (tabs).');
      router.replace('/(tabs)');
    }
  }, [user, pathname, isLoading, router]);

  const checkAuthSession = async () => {
    setIsLoading(true);
    try {
      const token = await storage.getToken();
      const userData = await storage.getUser();
      // Asegúrate de tener esta función en storage.ts
      const expiryString = await storage.getSessionExpiry(); 

      if (token && userData && expiryString) {
        const expiryTime = parseInt(expiryString, 10);
        const now = new Date().getTime();

        if (now > expiryTime) {
          console.log('⏰ Sesión expirada. Limpiando storage.');
          await storage.clearAuth();
          setUser(null);
        } else {
          console.log('✅ [Context] Sesión válida encontrada:', userData.primer_nombre);
          setUser(userData);
        }
      } else {
        console.log('❌ [Context] No se encontró sesión.');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (correo: string, password: string) => {
    setIsLoading(true); 
    try {
      // 🔥 USANDO LA IP CORRECTA
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        await storage.saveToken(data.token);
        await storage.saveUser(data.usuario);
        
        const expiry = new Date().getTime() + EXPIRATION_TIME;
        // Asegúrate de tener esta función en storage.ts
        await storage.saveSessionExpiry(expiry.toString());
        
        setUser(data.usuario);
        console.log('✅ [Context] Login exitoso, rol:', data.usuario.rol);
        
        return { success: true };
      } else {
        Alert.alert('Error', data.error || 'Credenciales incorrectas');
        return { success: false, error: data.error };
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar al servidor');
      console.error('Login error:', error);
      return { success: false, error: 'Connection error' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await storage.clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};