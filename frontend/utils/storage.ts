import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'userToken';
const USER_DATA_KEY = 'userData';
const SESSION_EXPIRY_KEY = 'sessionExpiry';

export const storage = {
  // Guardar token
  async saveToken(token: string) {
    try {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      console.log('✅ Token guardado:', token.substring(0, 20) + '...');
    } catch (error) {
      console.error('❌ Error saving token:', error);
    }
  },

  // Obtener token
  async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      console.log('🔍 Token obtenido del storage:', token ? 'SÍ' : 'NO');
      if (token) {
        // No es necesario loguear el token aquí por seguridad
      }
      return token;
    } catch (error) {
      console.error('❌ Error getting token:', error);
      return null;
    }
  },

  // Guardar datos del usuario
  async saveUser(user: any) {
    try {
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
      console.log('✅ Usuario guardado:', user.primer_nombre);
      console.log('📝 Datos usuario:', { 
        nombre: user.primer_nombre, 
        rol: user.rol,
        id: user.id 
      });
    } catch (error) {
      console.error('❌ Error saving user:', error);
    }
  },

  // Obtener datos del usuario
  async getUser(): Promise<any | null> {
    try {
      const userString = await AsyncStorage.getItem(USER_DATA_KEY);
      console.log('🔍 Usuario obtenido del storage:', userString ? 'SÍ' : 'NO');
      
      if (userString) {
        const user = JSON.parse(userString);
        console.log('📝 Datos usuario recuperados:', { 
          nombre: user.primer_nombre, 
          rol: user.rol,
          id: user.id 
        });
        return user;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting user:', error);
      return null;
    }
  },

  async saveSessionExpiry(timestamp: string) {
    try {
      await AsyncStorage.setItem(SESSION_EXPIRY_KEY, timestamp);
      console.log('✅ Expiración guardada');
    } catch (error) {
      console.error('❌ Error saving session expiry:', error);
    }
  },

  async getSessionExpiry(): Promise<string | null> {
    try {
      const expiry = await AsyncStorage.getItem(SESSION_EXPIRY_KEY);
      console.log('🔍 Expiración obtenida del storage:', expiry ? 'SÍ' : 'NO');
      return expiry;
    } catch (error) {
      console.error('❌ Error getting session expiry:', error);
      return null;
    }
  },

  // Limpiar sesión
  async clearAuth() {
    try {
      await AsyncStorage.multiRemove([
        AUTH_TOKEN_KEY, 
        USER_DATA_KEY, 
        SESSION_EXPIRY_KEY
      ]);
      console.log('✅ Sesión limpiada completamente');
    } catch (error) {
      console.error('❌ Error clearing auth:', error);
    }
  },
};