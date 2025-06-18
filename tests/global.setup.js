import { faker } from '@faker-js/faker/locale/pt_BR';
// tests/global.setup.js
import { expect, test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const adminFile = 'playwright/.auth/admin.json';
const userFile = 'playwright/.auth/user.json';

/**
 * Setup global para autenticação de administrador
 */
setup('authenticate admin', async ({ page, request }) => {
  console.log('🔧 Configurando autenticação de administrador...');
  
  // Navega para a página de login do admin
  await page.goto('/admin/auth/login');
  
  // Aguarda a página carregar completamente
  await page.waitForLoadState('networkidle');
  
  // Verifica se já existe um admin, se não, cria um
  const hasAdmin = await page.locator('[data-testid="login-form"]').isVisible();
  
  if (!hasAdmin) {
    console.log('📝 Criando primeiro administrador...');
    
    // Preenche o formulário de criação do primeiro admin
    await page.fill('[name="firstname"]', process.env.ADMIN_FIRSTNAME || 'Admin');
    await page.fill('[name="lastname"]', process.env.ADMIN_LASTNAME || 'Test');
    await page.fill('[name="email"]', process.env.ADMIN_EMAIL || 'admin@test.com');
    await page.fill('[name="password"]', process.env.ADMIN_PASSWORD || 'Test123456!');
    await page.fill('[name="confirmPassword"]', process.env.ADMIN_PASSWORD || 'Test123456!');
    
    // Aceita termos e condições se necessário
    const termsCheckbox = page.locator('[name="news"]');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }
    
    await page.click('[type="submit"]');
    await page.waitForURL('**/admin/**');
  } else {
    console.log('🔑 Fazendo login como administrador...');
    
    // Faz login com admin existente
    await page.fill('[name="email"]', process.env.ADMIN_EMAIL || 'admin@test.com');
    await page.fill('[name="password"]', process.env.ADMIN_PASSWORD || 'Test123456!');
    await page.click('[type="submit"]');
    
    // Aguarda redirecionamento para dashboard
    await page.waitForURL('**/admin/**');
  }
  
  // Verifica se está logado verificando presença do dashboard
  await expect(page.locator('[data-testid="homepage"]').or(page.locator('main'))).toBeVisible();
  
  // Salva estado de autenticação
  await page.context().storageState({ path: adminFile });
  console.log('✅ Autenticação de administrador salva');
});

/**
 * Setup para criar token de API
 */
setup('create api token', async ({ request }) => {
  console.log('🔑 Criando token de API...');
  
  try {
    // Faz login para obter JWT
    const loginResponse = await request.post('/admin/login', {
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@test.com',
        password: process.env.ADMIN_PASSWORD || 'Test123456!'
      }
    });
    
    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      const jwt = loginData.data.token;
      
      // Cria token de API
      const tokenResponse = await request.post('/admin/api-tokens', {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: 'E2E Test Token',
          description: 'Token para testes automatizados E2E',
          type: 'full-access',
          lifespan: null // Token permanente
        }
      });
      
      if (tokenResponse.ok()) {
        const tokenData = await tokenResponse.json();
        console.log('✅ Token de API criado:', tokenData.data.accessKey.substring(0, 10) + '...');
        
        // Salva o token em arquivo para uso nos testes
        const envContent = `STRAPI_API_TOKEN=${tokenData.data.accessKey}\n`;
        fs.appendFileSync('.env.test', envContent);
      }
    }
  } catch (error) {
    console.log('⚠️ Erro ao criar token de API:', error.message);
  }
});

/**
 * Setup para criar dados de teste
 */
setup('create test data', async ({ request }) => {
  console.log('📊 Criando dados de teste...');
  
  try {
    // Dados fake para testes
    const testData = {
      articles: [],
      categories: [],
      users: []
    };
    
    // Gera categorias de teste
    for (let i = 0; i < 3; i++) {
      testData.categories.push({
        name: faker.commerce.department(),
        description: faker.lorem.sentence(),
        slug: faker.helpers.slugify(faker.commerce.department()).toLowerCase()
      });
    }
    
    // Gera artigos de teste
    for (let i = 0; i < 5; i++) {
      testData.articles.push({
        title: faker.lorem.words(3),
        content: faker.lorem.paragraphs(3),
        description: faker.lorem.sentence(),
        slug: faker.helpers.slugify(faker.lorem.words(3)).toLowerCase(),
        publishedAt: faker.date.recent().toISOString()
      });
    }
    
    // Salva dados de teste para uso posterior
    const testDataDir = path.join(process.cwd(), 'test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(testDataDir, 'generated-data.json'), 
      JSON.stringify(testData, null, 2)
    );
    
    console.log('✅ Dados de teste gerados e salvos');
  } catch (error) {
    console.log('⚠️ Erro ao criar dados de teste:', error.message);
  }
});

/**
 * Setup para verificar saúde da aplicação
 */
setup('health check', async ({ request }) => {
  console.log('🏥 Verificando saúde da aplicação...');
  
  try {
    // Verifica se o Strapi está respondendo
    const healthResponse = await request.get('/_health');
    expect(healthResponse.status()).toBe(204);
    
    // Verifica API básica
    const apiResponse = await request.get('/api');
    expect(apiResponse.ok()).toBeTruthy();
    
    console.log('✅ Aplicação está saudável');
  } catch (error) {
    console.log('❌ Erro na verificação de saúde:', error.message);
    throw error;
  }
});

/**
 * Setup final - cria diretórios necessários
 */
setup('create directories', async () => {
  console.log('📁 Criando diretórios necessários...');
  
  const dirs = [
    'playwright/.auth',
    'test-results',
    'test-data',
    'test-uploads',
    'screenshots'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Diretório criado: ${dir}`);
    }
  });
});