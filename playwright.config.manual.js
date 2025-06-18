// playwright.config.manual.js
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  expect: {
    timeout: 15 * 1000,
  },
  
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  outputDir: 'test-results/',
  
  use: {
    baseURL: process.env.STRAPI_URL || 'http://localhost:1337',
    headless: process.env.CI ? true : false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.js/,
    },
    
    {
      name: 'chromium-admin',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.admin\.test\.js/,
    },
    
    {
      name: 'api-tests',
      testMatch: /.*\.api\.test\.js/,
      use: {
        baseURL: process.env.STRAPI_API_URL || 'http://localhost:1337/api',
      },
      dependencies: ['setup'],
    },
  ],

  // REMOVER webServer - Strapi deve estar rodando manualmente
  // webServer: { ... }
});