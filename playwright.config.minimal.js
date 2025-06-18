// playwright.config.minimal.js - CONFIGURAÇÃO MÍNIMA
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120 * 1000, // 2 minutos por teste
  
  // Execução simples
  fullyParallel: false,
  retries: 0,
  workers: 1,
  
  // Relatório simples
  reporter: [['list']],
  outputDir: 'test-results/',
  
  use: {
    baseURL: 'http://127.0.0.1:1337',
    headless: false, // Mostra browser
    screenshot: 'always', // Sempre tira screenshot
    video: 'on', // Sempre grava vídeo
    trace: 'on', // Sempre grava trace
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  projects: [
    // Setup simples
    {
      name: 'setup',
      testMatch: /global\.setup\.js/,
    },
    
    // Testes simples
    {
      name: 'simple-tests',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /simple\.test\.js/,
    },
  ],
});