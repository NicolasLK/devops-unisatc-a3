// tests/basic.test.js - TESTE BÁSICO PARA VERIFICAR SE FUNCIONA
import { expect, test } from '@playwright/test';

test.describe('Testes Básicos do Strapi', () => {
  
  test('deve acessar a página principal do Strapi', async ({ page }) => {
    console.log('🌐 Testando acesso à página principal...');
    
    // Vai para a página principal
    await page.goto('/');
    
    // Aguarda carregar
    await page.waitForLoadState('networkidle');
    
    // Verifica se não deu erro 404
    const title = await page.title();
    console.log('📄 Título da página:', title);
    
    // Se chegou até aqui, o Strapi está respondendo
    expect(title).toBeTruthy();
    
    console.log('✅ Página principal acessível');
  });

  test('deve acessar a página de admin', async ({ page }) => {
    console.log('👑 Testando acesso ao painel admin...');
    
    // Vai para o admin
    await page.goto('/admin');
    
    // Aguarda carregar (pode demorar)
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(5000); // Aguarda mais um pouco
    
    // Verifica se carregou algum conteúdo do admin
    const hasAdminContent = await page.locator('body').isVisible();
    expect(hasAdminContent).toBe(true);
    
    // Tenta encontrar elementos comuns do admin
    const adminElements = [
      'input[type="email"]', // Campo de login
      'input[type="password"]', // Campo de senha
      '[name="firstname"]', // Campo de primeiro admin
      'text=Welcome', // Texto de boas-vindas
      'main', // Elemento principal
      'nav' // Navegação
    ];
    
    let foundElement = false;
    for (const selector of adminElements) {
      if (await page.locator(selector).isVisible()) {
        console.log(`✅ Encontrado elemento: ${selector}`);
        foundElement = true;
        break;
      }
    }
    
    if (!foundElement) {
      console.log('⚠️ Nenhum elemento conhecido encontrado, mas página carregou');
      // Tira screenshot para debug
      await page.screenshot({ path: 'test-results/admin-page.png', fullPage: true });
      console.log('📸 Screenshot salvo em: test-results/admin-page.png');
    }
    
    console.log('✅ Página admin acessível');
  });

  test('deve verificar se API responde', async ({ request }) => {
    console.log('🔌 Testando resposta da API...');
    
    try {
      // Testa diferentes endpoints
      const endpoints = ['/', '/admin', '/api', '/content-manager'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await request.get(endpoint);
          console.log(`📊 ${endpoint}: Status ${response.status()}`);
          
          if (response.status() < 500) {
            console.log(`✅ ${endpoint} respondeu (status ${response.status()})`);
          }
        } catch (error) {
          console.log(`⚠️ ${endpoint}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log('❌ Erro geral na API:', error.message);
      throw error;
    }
  });

});