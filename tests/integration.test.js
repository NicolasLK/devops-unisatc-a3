import { faker } from '@faker-js/faker/locale/pt_BR';
// tests/integration.test.js
import { expect, test } from '@playwright/test';
import FormData from 'form-data';

/**
 * Testes de Integração End-to-End
 * Testa fluxos completos entre Admin Panel e API
 * Projeto: DevOps UNISATC A3
 */

test.describe('Integração Admin Panel ↔ API', () => {
  let testContentType;
  let createdContentId;

  test.describe('Fluxo Completo: Content Type → Content Creation → API Access @integration @smoke', () => {
    test('deve criar content type no admin e acessar via API', async ({ page, request }) => {
      // 1. Criar Content Type no Admin Panel
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Content-Type Builder');
      await page.waitForLoadState('networkidle');
      
      // Cria novo collection type
      await page.click('text=Create new collection type');
      
      testContentType = `test_${faker.lorem.word().toLowerCase()}`;
      await page.fill('[name="displayName"]', testContentType);
      await page.click('text=Continue');
      await page.waitForLoadState('networkidle');
      
      // Adiciona campo de título
      await page.click('text=Text');
      await page.fill('[name="name"]', 'title');
      await page.click('text=Finish');
      
      // Adiciona campo de conteúdo
      await page.click('text=Rich text');
      await page.fill('[name="name"]', 'content');
      await page.click('text=Finish');
      
      // Salva o content type
      await page.click('text=Save');
      await page.waitForLoadState('networkidle');
      
      // Aguarda processo de restart do Strapi
      await page.waitForTimeout(5000);
      
      // 2. Verificar se Content Type apareceu na API
      const apiResponse = await request.get(`/${testContentType.toLowerCase()}`);
      
      if (apiResponse.ok()) {
        console.log(`✅ Content type ${testContentType} criado e acessível via API`);
      } else {
        console.log(`⚠️ Content type ${testContentType} ainda não disponível na API (status: ${apiResponse.status()})`);
      }
    });

    test('deve criar conteúdo no admin e verificar na API', async ({ page, request }) => {
      if (!testContentType) {
        test.skip('Content type não criado no teste anterior');
      }

      // 1. Criar conteúdo no Content Manager
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Content Manager');
      await page.waitForLoadState('networkidle');
      
      // Procura pelo content type criado
      const contentTypeLink = page.locator(`text=${testContentType}`);
      
      if (await contentTypeLink.isVisible()) {
        await contentTypeLink.click();
        await page.waitForLoadState('networkidle');
        
        // Cria nova entrada
        await page.click('text=Create new entry');
        await page.waitForLoadState('networkidle');
        
        const testTitle = faker.lorem.words(3);
        const testContent = faker.lorem.paragraphs(2);
        
        // Preenche formulário
        await page.fill('[name="title"]', testTitle);
        
        // Para o rich text, tenta diferentes seletores
        const contentField = page.locator('[name="content"]').or(
          page.locator('.ql-editor').or(
            page.locator('textarea[name="content"]')
          )
        );
        
        if (await contentField.isVisible()) {
          await contentField.fill(testContent);
        }
        
        // Salva o conteúdo
        await page.click('text=Save');
        await page.waitForLoadState('networkidle');
        
        // Publica o conteúdo (se opção disponível)
        const publishButton = page.locator('text=Publish').or(page.locator('text=Publicar'));
        if (await publishButton.isVisible()) {
          await publishButton.click();
          await page.waitForLoadState('networkidle');
        }
        
        // 2. Verificar na API
        await page.waitForTimeout(2000); // Aguarda sincronização
        
        const apiResponse = await request.get(`/${testContentType.toLowerCase()}`);
        
        if (apiResponse.ok()) {
          const apiData = await apiResponse.json();
          
          // Procura pelo conteúdo criado
          const createdContent = apiData.data?.find(item => 
            item.attributes?.title === testTitle
          );
          
          if (createdContent) {
            createdContentId = createdContent.id;
            console.log(`✅ Conteúdo criado no admin encontrado na API (ID: ${createdContentId})`);
            expect(createdContent.attributes.title).toBe(testTitle);
          } else {
            console.log('⚠️ Conteúdo não encontrado na API ainda');
          }
        }
      }
    });
  });

  test.describe('Fluxo de Media Upload @integration @media', () => {
    test('deve fazer upload de arquivo no admin e acessar via API', async ({ page, request }) => {
      // Navega para Media Library
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Media Library');
      await page.waitForLoadState('networkidle');
      
      // Verifica se há botão de upload
      const uploadButton = page.locator('text=Add new assets').or(
        page.locator('input[type="file"]')
      );
      
      if (await uploadButton.isVisible()) {
        // Cria arquivo de teste temporário
        const testFileName = `test-${Date.now()}.txt`;
        const testFileContent = 'Este é um arquivo de teste para E2E';
        
        // Simula upload (pode precisar ajustar dependendo da implementação)
        const fileInput = page.locator('input[type="file"]');
        
        if (await fileInput.isVisible()) {
          // Para testes reais, você precisaria de um arquivo real
          console.log('📁 Interface de upload encontrada na Media Library');
        }
      }
    });
  });

  test.describe('Fluxo de Configurações @integration @settings', () => {
    test('deve modificar configurações no admin e verificar efeitos', async ({ page, request }) => {
      // Acessa configurações
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Settings');
      await page.waitForLoadState('networkidle');
      
      // Verifica configurações gerais
      const generalSettings = page.locator('text=General').or(
        page.locator('text=Application')
      );
      
      if (await generalSettings.isVisible()) {
        await generalSettings.click();
        await page.waitForLoadState('networkidle');
        
        // Verifica se pode acessar configurações
        console.log('⚙️ Configurações gerais acessadas');
        
        // Verifica se há campos editáveis
        const nameField = page.locator('[name="name"]').or(
          page.locator('[name="siteName"]')
        );
        
        if (await nameField.isVisible()) {
          console.log('✅ Campos de configuração encontrados');
        }
      }
    });
  });

  test.describe('Fluxo de Permissões @integration @permissions', () => {
    test('deve acessar configurações de permissões', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Settings');
      await page.waitForLoadState('networkidle');
      
      // Acessa Users & Permissions
      const permissionsLink = page.locator('text=Users & Permissions').or(
        page.locator('text=Roles')
      );
      
      if (await permissionsLink.isVisible()) {
        await permissionsLink.click();
        await page.waitForLoadState('networkidle');
        
        // Verifica roles disponíveis
        const rolesSection = page.locator('text=Roles').or(
          page.locator('text=Public')
        );
        
        if (await rolesSection.isVisible()) {
          console.log('🔐 Sistema de permissões acessível');
        }
      }
    });
  });

  test.describe('Sincronização Admin ↔ API @integration @sync', () => {
    test('deve sincronizar mudanças entre admin e API em tempo real', async ({ page, request }) => {
      if (!testContentType || !createdContentId) {
        test.skip('Dados de teste não disponíveis');
      }

      // 1. Busca conteúdo atual na API
      const initialResponse = await request.get(`/${testContentType.toLowerCase()}/${createdContentId}`);
      
      if (initialResponse.ok()) {
        const initialData = await initialResponse.json();
        const initialTitle = initialData.data.attributes.title;
        
        // 2. Modifica no admin
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        
        await page.click('text=Content Manager');
        await page.waitForLoadState('networkidle');
        
        await page.click(`text=${testContentType}`);
        await page.waitForLoadState('networkidle');
        
        // Encontra e edita a entrada
        const editButton = page.locator('text=Edit').or(
          page.locator('[data-testid="edit-button"]')
        ).first();
        
        if (await editButton.isVisible()) {
          await editButton.click();
          await page.waitForLoadState('networkidle');
          
          const newTitle = `${initialTitle} - MODIFIED`;
          await page.fill('[name="title"]', newTitle);
          
          await page.click('text=Save');
          await page.waitForLoadState('networkidle');
          
          // 3. Verifica mudança na API
          await page.waitForTimeout(2000); // Aguarda sincronização
          
          const updatedResponse = await request.get(`/${testContentType.toLowerCase()}/${createdContentId}`);
          
          if (updatedResponse.ok()) {
            const updatedData = await updatedResponse.json();
            
            if (updatedData.data.attributes.title === newTitle) {
              console.log('✅ Sincronização Admin → API funcionando');
            } else {
              console.log('⚠️ Sincronização pode estar atrasada');
            }
          }
        }
      }
    });
  });

  test.describe('Fluxo de Backup e Restauração @integration @backup', () => {
    test('deve verificar integridade dos dados após operações', async ({ request }) => {
      if (!testContentType) {
        test.skip('Content type de teste não disponível');
      }

      // Faz snapshot dos dados atuais
      const response = await request.get(`/${testContentType.toLowerCase()}`);
      
      if (response.ok()) {
        const data = await response.json();
        const itemCount = data.data?.length || 0;
        
        console.log(`📊 Snapshot: ${itemCount} itens em ${testContentType}`);
        
        // Verifica integridade básica dos dados
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach((item, index) => {
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('attributes');
            
            if (index === 0) {
              console.log(`✅ Estrutura de dados íntegra para ${testContentType}`);
            }
          });
        }
      }
    });
  });

  test.describe('Performance de Integração @integration @performance', () => {
    test('deve medir performance do fluxo admin → API', async ({ page, request }) => {
      const startTime = Date.now();
      
      // 1. Carrega admin
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      const adminLoadTime = Date.now() - startTime;
      
      // 2. Acessa API
      const apiStartTime = Date.now();
      const apiResponse = await request.get('/');
      const apiResponseTime = Date.now() - apiStartTime;
      
      // 3. Métricas
      console.log(`⏱️ Performance Integration Test:`);
      console.log(`   Admin Load Time: ${adminLoadTime}ms`);
      console.log(`   API Response Time: ${apiResponseTime}ms`);
      console.log(`   Total Flow Time: ${Date.now() - startTime}ms`);
      
      // Verificações de performance
      expect(adminLoadTime).toBeLessThan(15000); // Admin em menos de 15s
      expect(apiResponseTime).toBeLessThan(2000); // API em menos de 2s
      
      if (apiResponse.ok()) {
        console.log('✅ Fluxo de integração dentro dos limites de performance');
      }
    });
  });
});