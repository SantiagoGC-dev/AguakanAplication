import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../app/login'; 
import { useAuth } from '../context/AuthContext'; 

jest.mock('../context/AuthContext', () => ({
  
  useAuth: jest.fn(), 
}));

const mockedUseAuth = useAuth as jest.Mock;

describe('<LoginScreen />', () => {
  
  const mockLogin = jest.fn(() => Promise.resolve({ success: true }));
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      login: mockLogin, 
      isLoading: false, 
      user: null,
      isAuthenticated: false,
    });
  });

  // 5. "it" es nuestro Caso de Prueba (Test Case)
  it('debe llamar a la función login con el email y password correctos al presionar el botón', async () => {

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    const emailInput = getByPlaceholderText('usuario@aguakan.com');
    const passwordInput = getByPlaceholderText('••••••••');
    const loginButton = getByText('Iniciar sesión');

    fireEvent.changeText(emailInput, 'test@user.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(mockLogin).toHaveBeenCalledWith('test@user.com', 'password123');
    });
  });

  it('debe mostrar una alerta si los campos están vacíos', async () => {
    
    // 1. ARRANGE
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<LoginScreen />);

    // 2. ACT
    const loginButton = getByText('Iniciar sesión');
    fireEvent.press(loginButton); 

    // 3. ASSERT
    await waitFor(() => {

      expect(alertSpy).toHaveBeenCalled();

      expect(alertSpy).toHaveBeenCalledWith('Error', 'Por favor completa todos los campos');
    });
  });

});