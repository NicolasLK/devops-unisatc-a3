// test-connectivity.js - Teste de Conectividade
import { expect, test } from '@playwright/test';

test.describe('Teste de Conectividade', () => {
  
  test('verificar conectividade com localhost vs 127.0.0.1', async ({ request, page }) => {
    console.log('🔍 Testando conectividade...');
    
    const urls = [
      'http://localhost:1337',
      'http://127.0.0.1:1337',
      'http://localhost:1337/admin',
      'http://127.0.0.1:1337/admin'
    ];
    
    for (const url of urls) {
      try {
        console.log(`📡 Testando: ${url}`);
        
        // Teste com request
        try {
          const response = await request.get(url);
          console.log(`  ✅ Request: ${url} - Status: ${response.status()}`);
        } catch (error) {
          console.log(`  ❌ Request: ${url} - Erro: ${error.message}`);
        }
        
        // Teste com navegação (apenas para URLs base)
        if (url.endsWith(':1337') || url.endsWith('/admin')) {
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
            console.log(`  ✅ Page: ${url} - Navegação OK`);
          } catch (error) {
            console.log(`  ❌ Page: ${url} - Erro: ${error.message}`);
          }
        }
        
      } catch (error) {
        console.log(`❌ Erro geral em ${url}:`, error.message);
      }
    }
  });
  
  test('testar Strapi está realmente rodando', async ({ page }) => {
    console.log('🎯 Testando se Strapi está realmente acessível...');
    
    try {
      // Força usar 127.0.0.1
      await page.goto('http://127.0.0.1:1337/admin', { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      
      // Aguarda um pouco
      await page.waitForTimeout(5000);
      
      // Verifica se carregou conteúdo
      const title = await page.title();
      console.log('📄 Título da página:', title);
      
      // Tira screenshot
      await page.screenshot({ 
        path: 'test-results/strapi-admin-page.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot salvo: test-results/strapi-admin-page.png');
      
      // Verifica elementos na página
      const bodyText = await page.locator('body').textContent();
      console.log('📝 Conteúdo da página (primeiros 200 chars):', bodyText?.substring(0, 200));
      
      expect(title).toBeTruthy();
      console.log('✅ Strapi admin acessível!');
      
    } catch (error) {
      console.log('❌ Erro ao acessar Strapi admin:', error.message);
      
      // Tenta página raiz
      try {
        await page.goto('http://127.0.0.1:1337', { timeout: 30000 });
        const title = await page.title();
        console.log('📄 Página raiz título:', title);
        
        await page.screenshot({ 
          path: 'test-results/strapi-root-page.png', 
          fullPage: true 
        });
        
        console.log('✅ Pelo menos página raiz é acessível');
      } catch (rootError) {
        console.log('❌ Nem página raiz é acessível:', rootError.message);
        throw error;
      }
    }
  });
  
});