import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.', 
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node', // ⭐ UPDATED THIS FROM 'jest-environment-jsdom' TO 'node'
  modulePathIgnorePatterns: ['./dist'],
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/test/jest-setup.ts'],
  
  // ADD THIS: Instructs Jest to process ESM code structures hidden inside bull modules
  transformIgnorePatterns: [
    '/node_modules/(?!bull|uuid)/'
  ],

  moduleNameMapper: {
    '^bson$': require.resolve('bson'),
    '^msgpackr$': require.resolve('msgpackr'),
    // ADD THIS: Forces Jest to skip the esm-browser build of uuid and load standard CJS
    '^uuid$': require.resolve('uuid'),
    '^src/(.*)$': '<rootDir>/src/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
  },
};

export default config;