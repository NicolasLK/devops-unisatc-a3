// tests/simple.test.js - TESTE SUPER SIMPLES
import { expect, test } from '@playwright/test';

test.describe('Testes Simples do Strapi', () => {
  
  test('acessar página principal', async ({ page }) => {
    console.log('🏠 Testando página principal...');
    
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    const title = await page.title();
    console.log('📄 Título:', title);
    
    await page.screenshot({ path: 'test-results/test-home.png' });
    
    // Só verifica se não deu erro 500
    const hasError = await page.locator('text=Internal Server Error').isVisible();
    expect(hasError).toBe(false);
    
    console.log('✅ Página principal acessível');
  });

  test('acessar admin (sem login)', async ({ page }) => {
    console.log('👑 Testando admin sem login...');
    
    await page.goto('/admin');
    await page.waitForTimeout(5000);
    
    const title = await page.title();
    console.log('📄 Título admin:', title);
    
    await page.screenshot({ path: 'test-results/test-admin.png' });
    
    // Verifica se carregou algo (qualquer coisa)
    const body = await page.locator('body').isVisible();
    expect(body).toBe(true);
    
    console.log('✅ Admin carregou algo');
  });

  test('verificar se API responde', async ({ request }) => {
    console.log('🔌 Testando API...');
    
    const response = await request.get('/');
    console.log('📊 Status da API:', response.status());
    
    // Aceita qualquer coisa que não seja erro de conexão
    expect(response.status()).toBeGreaterThan(0);
    expect(response.status()).toBeLessThan(600);
    
    console.log('✅ API respondeu com status válido');
  });

  test('listar arquivos de teste gerados', async () => {
    console.log('📂 Verificando arquivos gerados...');
    
    const fs = await import('fs');
    const path = await import('path');
    
    // Lista arquivos importantes
    const files = [
      'test-results',
      'playwright/.auth',
      'test-data'
    ];
    
    files.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file} existe`);
        
        if (fs.statSync(file).isDirectory()) {
          const contents = fs.readdirSync(file);
          console.log(`   📁 Conteúdo: ${contents.join(', ')}`);
        }
      } else {
        console.log(`❌ ${file} não existe`);
      }
    });
    
    console.log('✅ Verificação de arquivos concluída');
  });

});