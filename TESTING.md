# 🧪 Testing Documentation

Esta documentación explica la configuración completa de testing para la aplicación Mesh Integration Demo.

## 📋 Resumen de Testing

La aplicación cuenta con una suite completa de tests que cubre:
- **Frontend**: Tests de componentes React y servicios
- **Backend**: Tests de endpoints API y funcionalidad del servidor
- **Types**: Tests de tipos TypeScript para asegurar type safety
- **Integration**: Tests de integración end-to-end

## 🛠️ Configuración

### Dependencias de Testing
```json
{
  "jest": "Configurado con ts-jest",
  "supertest": "Para testing de APIs",
  "@testing-library/react": "Para testing de componentes React",
  "@testing-library/jest-dom": "Matchers adicionales para DOM",
  "ts-jest": "Para soporte de TypeScript en Jest"
}
```

### Configuración de Jest
- **jest.config.js**: Configuración principal con proyectos separados
- **src/setupTests.ts**: Setup para frontend tests
- **server/setupTests.js**: Setup para backend tests

## 🚀 Comandos de Testing

### Comandos Principales
```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Generar reporte de coverage
npm run test:coverage

# Ejecutar tests para CI/CD
npm run test:ci
```

### Comandos Específicos
```bash
# Solo tests del frontend
npm run test:frontend
npm run test:frontend:watch

# Solo tests del backend
npm run test:backend
npm run test:backend:watch

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📁 Estructura de Tests

```
src/
├── __tests__/
│   └── App.test.tsx                    # Tests del componente principal
├── services/
│   └── __tests__/
│       └── meshService.test.ts         # Tests del servicio Mesh
├── types/
│   └── __tests__/
│       └── types.test.ts               # Tests de tipos TypeScript
└── setupTests.ts                       # Configuración frontend

server/
├── __tests__/
│   └── server.test.js                  # Tests de endpoints API
└── setupTests.js                       # Configuración backend
```

## 🎯 Cobertura de Tests

### Frontend Tests (src/)
- **App.test.tsx** (95+ líneas)
  - Rendering de componentes
  - Interacciones de usuario
  - Manejo de estados
  - Gestión de errores
  - Conexiones Coinbase y Rainbow Wallet
  - Funcionalidad de transfers

- **meshService.test.ts** (200+ líneas)
  - Todos los métodos del servicio
  - Manejo de errores de red
  - Configuración de API
  - Timeout y retry logic

- **types.test.ts** (150+ líneas)
  - Validación de interfaces TypeScript
  - Type safety
  - Propiedades opcionales
  - Compatibilidad de tipos

### Backend Tests (server/)
- **server.test.js** (300+ líneas)
  - Todos los endpoints API
  - Validación de request/response
  - Manejo de errores
  - Configuración CORS
  - Integración con Mesh API

## 📊 Métricas de Coverage

El objetivo es mantener:
- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

### Ver Reporte de Coverage
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🔧 Configuración Detallada

### Jest Projects
La configuración usa múltiples proyectos:

```javascript
{
  projects: [
    {
      displayName: 'Frontend',
      testEnvironment: 'jsdom',
      testMatch: ['src/**/*.{test,spec}.{ts,tsx}']
    },
    {
      displayName: 'Backend', 
      testEnvironment: 'node',
      testMatch: ['server/**/*.{test,spec}.{js,ts}']
    }
  ]
}
```

### Mocking Strategy
- **Axios**: Mockeado para requests HTTP
- **MeshConnect SDK**: Mockeado para evitar dependencias externas
- **Environment Variables**: Configuración de test
- **Console Methods**: Mockeados para tests limpios

## 🧪 Tipos de Tests

### 1. Unit Tests
- Tests de funciones individuales
- Componentes aislados
- Servicios independientes

### 2. Integration Tests
- Componentes con servicios
- API endpoints con mocks
- Flujos completos de usuario

### 3. Type Tests
- Validación de TypeScript interfaces
- Compatibilidad de tipos
- Propiedades opcionales

### 4. Error Handling Tests
- Manejo de errores de red
- Estados de error en UI
- Fallbacks y recovery

## 📝 Escribir Nuevos Tests

### Frontend Component Test
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  test('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Backend API Test
```javascript
const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
  test('GET /api/endpoint should return data', async () => {
    const response = await request(app).get('/api/endpoint');
    expect(response.status).toBe(200);
  });
});
```

### Service Test
```typescript
import { MyService } from '../MyService';

describe('MyService', () => {
  test('should call API correctly', async () => {
    const result = await MyService.getData();
    expect(result).toBeDefined();
  });
});
```

## 🔍 Debugging Tests

### Comandos Útiles
```bash
# Ejecutar test específico
npm test -- --testNamePattern="should render correctly"

# Ejecutar archivo específico
npm test App.test.tsx

# Debug mode
npm test -- --detectOpenHandles --forceExit

# Verbose output
npm test -- --verbose
```

### Tips de Debugging
1. Usar `console.log` en tests (temporal)
2. Verificar mocks con `jest.fn().mock.calls`
3. Usar `screen.debug()` para React components
4. Verificar async operations con `waitFor`

## 🚨 Common Issues y Soluciones

### 1. Tests que Fallan por Timing
```typescript
// ❌ Malo
expect(element).toBeInTheDocument();

// ✅ Bueno
await waitFor(() => {
  expect(element).toBeInTheDocument();
});
```

### 2. Mocks no Funcionando
```typescript
// Asegurar que mocks se limpien
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 3. Memory Leaks en Tests
```javascript
// Limpiar después de tests
afterEach(() => {
  jest.restoreAllMocks();
});
```

## 📈 Continuous Integration

### GitHub Actions (ejemplo)
```yaml
- name: Run Tests
  run: |
    npm ci
    npm run test:ci
    
- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

## 🎯 Best Practices

1. **Test Names**: Descriptivos y específicos
2. **Arrange-Act-Assert**: Estructura clara
3. **One Assertion per Test**: Foco específico
4. **Mock External Dependencies**: Control de environment
5. **Test Edge Cases**: No solo happy paths
6. **Clean Up**: Restore mocks y state

## 📚 Recursos Adicionales

- [Jest Documentation](https://jestjs.io/docs)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [TypeScript Testing Guide](https://typescript-eslint.io/docs/development/testing)

---

**Última actualización**: 2024  
**Cobertura actual**: >90% en todos los módulos  
**Tests totales**: 50+ tests across frontend y backend 