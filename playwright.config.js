// playwright.config.simple.js - Configuração SIMPLIFICADA
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 90 * 1000, // 90 segundos por teste (mais tempo)
  expect: {
    timeout: 20 * 1000, // 20 segundos para expects
  },
  
  // Configuração para execução
  fullyParallel: false, // Executa sequencialmente para debug
  forbidOnly: !!process.env.CI,
  retries: 0, // Sem retry para debug
  workers: 1, // Um worker apenas
  
  // Configuração de relatórios
  reporter: [
    ['list'], // Output simples no terminal
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  
  // Diretório de saída
  outputDir: 'test-results/',
  
  // Configurações globais
  use: {
    // URL base
    baseURL: process.env.STRAPI_URL || 'http://localhost:1337',
    
    // Configurações de navegador
    headless: false, // Mostra o browser
    slowMo: 1000, // Delay de 1s entre ações para debug
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Configurações de rede
    ignoreHTTPSErrors: true,
    
    // Configurações de viewport
    viewport: { width: 1280, height: 720 },
    
    // Configurações de contexto
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    
    // Timeouts maiores
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  // Projetos simplificados
  projects: [
    // Setup apenas
    {
      name: 'setup',
      testMatch: /global\.setup\.js/,
    },
    
    // Chrome apenas para testes
    {
      name: 'chrome-tests',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.test\.js/,
    },
  ],

  // SEM webServer - assume que Strapi está rodando manualmente
  // webServer: { ... } // REMOVIDO
});