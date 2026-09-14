import { defineConfig } from 'vitest/config';

process.env.JWT_SECRET ??= 'test_secret_which_is_long_enough';
process.env.DATABASE_URL ??= 'postgresql://localhost:5432/techlife?schema=public';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
