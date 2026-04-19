module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', 'setup\\.ts$'],
  globals: {
    'ts-jest': {
      tsconfig: {
        paths: { '@/*': ['./src/*'] },
        strict: false,
        esModuleInterop: true,
      },
    },
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
