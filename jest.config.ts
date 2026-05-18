import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },
  moduleNameMapper: {
    // Map @/ to src/
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/lib/auth/session.ts',
    'src/lib/auth/admin.ts',
    'src/lib/listingValidation.ts',
    'src/lib/uploadValidation.ts',
  ],
}

export default config
