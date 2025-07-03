// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock para MeshConnect SDK
jest.mock('@meshconnect/web-link-sdk', () => ({
  createLink: jest.fn().mockReturnValue({
    openLink: jest.fn(),
    closeLink: jest.fn(),
  }),
}));

// Mock para axios
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  get: jest.fn(),
  post: jest.fn(),
}));

// Hacer disponible el mock instance globalmente
(global as any).mockAxiosInstance = mockAxiosInstance;

// Mock para variables de entorno
process.env.REACT_APP_API_URL = 'http://localhost:3001/api';

// Mock para console.error en tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Configuración global para tests
beforeEach(() => {
  // Limpiar todos los mocks antes de cada test
  jest.clearAllMocks();
});

// Mock para localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock para fetch
global.fetch = jest.fn();

// Mock para IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock para ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
