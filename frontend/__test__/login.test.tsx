import React from 'react';
// render: "Dibuja" el componente en una memoria virtual
// fireEvent: Simula acciones del usuario (presionar, escribir)
// waitFor: Nos ayuda a esperar por acciones que no son instantáneas
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../app/login'; // 1. Importa la pantalla que quieres probar
import { useAuth } from '../context/AuthContext'; // 2. Importa el hook que vamos a simular

// 3. ¡LA MAGIA! (Mocking)
// Le decimos a Jest: "Cuando alguien importe '../context/AuthContext', 
// no le des el archivo real. Dale esto en su lugar".
jest.mock('../context/AuthContext', () => ({
  // jest.fn() es una "función espía" que podemos rastrear
  useAuth: jest.fn(), 
}));

// Una variable para acceder a nuestro 'useAuth' simulado
const mockedUseAuth = useAuth as jest.Mock;

// 4. "describe" agrupa todas las pruebas para esta pantalla
describe('<LoginScreen />', () => {
  
  // Creamos una "función espía" para 'login'
  const mockLogin = jest.fn(() => Promise.resolve({ success: true }));

  // "beforeEach" es una función que se ejecuta antes de CADA 'it' (prueba)
  // Esto nos da una pantalla limpia cada vez.
  beforeEach(() => {
    // Limpiamos cualquier espía de pruebas anteriores
    jest.clearAllMocks();

    // Configuramos lo que nuestro 'useAuth' simulado va a devolver
    mockedUseAuth.mockReturnValue({
      login: mockLogin, // La función 'login' que vamos a espiar
      isLoading: false, // Estado inicial
      user: null,
      isAuthenticated: false,
    });
  });

  // 5. "it" es nuestro Caso de Prueba (Test Case)
  it('debe llamar a la función login con el email y password correctos al presionar el botón', async () => {
    
    // 1. ARRANGE (Arreglar)
    // Renderizamos la pantalla. Obtenemos funciones para "buscar" elementos
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    // 2. ACT (Actuar)
    // Buscamos los inputs por su placeholder (como lo haría un usuario)
    const emailInput = getByPlaceholderText('usuario@aguakan.com');
    const passwordInput = getByPlaceholderText('••••••••');
    const loginButton = getByText('Iniciar sesión');

    // Simulamos al usuario escribiendo
    fireEvent.changeText(emailInput, 'test@user.com');
    fireEvent.changeText(passwordInput, 'password123');

    // Simulamos al usuario presionando el botón
    fireEvent.press(loginButton);

    // 3. ASSERT (Afirmar)
    // Esperamos a que la lógica del botón termine
    await waitFor(() => {
      // Verificamos que nuestra función "login" espía fue llamada
      expect(mockLogin).toHaveBeenCalled();

      // Verificamos que fue llamada con los argumentos correctos
      expect(mockLogin).toHaveBeenCalledWith('test@user.com', 'password123');
    });
  });

  it('debe mostrar una alerta si los campos están vacíos', async () => {
    
    // 1. ARRANGE
    // Espiamos la función 'Alert.alert' de React Native
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<LoginScreen />);

    // 2. ACT
    const loginButton = getByText('Iniciar sesión');
    fireEvent.press(loginButton); // Presionamos el botón sin escribir nada

    // 3. ASSERT
    await waitFor(() => {
      // Verificamos que la alerta fue llamada
      expect(alertSpy).toHaveBeenCalled();

      // Verificamos que se llamó con el mensaje de error correcto
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Por favor completa todos los campos');
    });
  });

});