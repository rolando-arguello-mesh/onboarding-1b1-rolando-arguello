module.exports = {
  preset: 'ts-jest',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  projects: [
    {
      displayName: 'Frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)'],
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
      },
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg)$': 'jest-transform-stub',
      },
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      transformIgnorePatterns: [
        'node_modules/(?!(axios)/)',
      ],
    },
    {
      displayName: 'Backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/**/__tests__/**/*.(js|ts)'],
      setupFilesAfterEnv: ['<rootDir>/server/setupTests.js'],
      globals: {
        'ts-jest': {
          useESM: false,
        },
      },
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'server/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/reportWebVitals.ts',
    '!src/index.tsx',
    '!server/index.js',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
}; 