// Setup para tests del backend
require('dotenv').config({ path: '.env.test' });

// Polyfill para TextEncoder/TextDecoder (necesario para algunas dependencias)
const { TextEncoder, TextDecoder } = require('util');

// Asegurar que TextEncoder esté disponible globalmente antes de cualquier import
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock para variables de entorno
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.MESH_CLIENT_ID = 'test_client_id';
process.env.MESH_CLIENT_SECRET = 'test_client_secret';
process.env.MESH_BASE_URL = 'https://test-api.meshconnect.com';
process.env.APP_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';

// Mock para axios
jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    get: jest.fn(),
    post: jest.fn(),
  }),
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock para console.log en tests
const originalLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
});

// Configuración global para tests
beforeEach(() => {
  // Limpiar todos los mocks antes de cada test
  jest.clearAllMocks();
});

// Mock para setTimeout
jest.useFakeTimers();

// Configuración para timeouts en tests
jest.setTimeout(10000); 