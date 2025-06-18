// playwright.config.js
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

/**
 * Configuração do Playwright para testes E2E
 * Projeto: DevOps UNISATC A3 - Strapi Application
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000, // 60 segundos por teste (Strapi pode ser lento no primeiro load)
  expect: {
    timeout: 15 * 1000, // 15 segundos para expects
  },
  
  // Configuração para execução em paralelo
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  
  // Configuração de relatórios
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['github'], // Para integração com GitHub Actions
    ['list']
  ],
  
  // Diretório de saída
  outputDir: 'test-results/',
  
  // Configurações globais
  use: {
    // URLs base
    baseURL: process.env.STRAPI_URL || 'http://localhost:1337',
    
    // Configurações de navegador
    headless: process.env.CI ? true : false,
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
    
    // Headers customizados
    extraHTTPHeaders: {
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'User-Agent': 'PlaywrightE2E/1.0 DevOps-UNISATC-A3'
    },
    
    // Configurações específicas do Strapi
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Configuração de projetos
  projects: [
    // Setup inicial
    {
      name: 'setup',
      testMatch: /global\.setup\.js/,
      teardown: 'cleanup',
    },
    
    // Cleanup final
    {
      name: 'cleanup',
      testMatch: /global\.teardown\.js/,
    },
    
    // Testes Desktop - Chrome
    {
      name: 'chromium-admin',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.admin\.test\.js/,
    },
    
    // Testes Desktop - Firefox
    {
      name: 'firefox-admin',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.admin\.test\.js/,
    },
    
    // Testes de API
    {
      name: 'api-tests',
      testMatch: /.*\.api\.test\.js/,
      use: {
        baseURL: process.env.STRAPI_API_URL || 'http://localhost:1337/api',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN || ''}`
        }
      },
      dependencies: ['setup'],
    },
    
    // Testes Mobile
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.mobile\.test\.js/,
    },
    
    // Testes sem autenticação (público)
    {
      name: 'public-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.public\.test\.js/,
      dependencies: ['setup'],
    },
  ],

  // Configuração do servidor web local para desenvolvimento
  webServer: {
    command: 'pnpm dev',
    port: 1337,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutos para Strapi inicializar
    env: {
      NODE_ENV: 'test',
      DATABASE_CLIENT: 'sqlite',
      DATABASE_FILENAME: '.tmp/test-data.db',
    }
  },
  
  // Configuração para CI/CD
  ...(process.env.CI && {
    use: {
      ...this.use,
      trace: 'on-first-retry',
      video: 'retain-on-failure',
    }
  })
});