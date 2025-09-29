/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  clearMocks: true,
  coverageThreshold: {
    './src/memory-manager.ts': {
      statements: 80,
      branches: 60,
      functions: 80,
      lines: 80,
    },
    './src/verification-memory.ts': {
      statements: 80,
      branches: 60,
      functions: 80,
      lines: 80,
    },
  },
};
