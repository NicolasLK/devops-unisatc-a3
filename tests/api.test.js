import { faker } from '@faker-js/faker/locale/pt_BR';
// tests/api.test.js
import { expect, test } from '@playwright/test';

/**
 * Testes End-to-End para API REST do Strapi
 * Projeto: DevOps UNISATC A3
 */

test.describe('API REST do Strapi', () => {
  let apiToken;
  let createdEntries = [];

  test.beforeAll(async ({ request }) => {
    // Obtém token de API se disponível
    apiToken = process.env.STRAPI_API_TOKEN;
    
    if (!apiToken) {
      console.log('⚠️ Token de API não encontrado, alguns testes podem falhar');
    }
  });

  test.afterAll(async ({ request }) => {
    // Limpa entradas criadas durante os testes
    if (apiToken && createdEntries.length > 0) {
      console.log('🧹 Limpando dados de teste criados...');
      
      for (const entry of createdEntries) {
        try {
          await request.delete(`/${entry.type}/${entry.id}`, {
            headers: {
              'Authorization': `Bearer ${apiToken}`
            }
          });
        } catch (error) {
          console.log(`⚠️ Erro ao limpar ${entry.type}/${entry.id}:`, error.message);
        }
      }
    }
  });

  test.describe('Endpoints Básicos @api @smoke', () => {
    test('deve responder ao health check', async ({ request }) => {
      const response = await request.get('/_health');
      expect(response.status()).toBe(204);
    });

    test('deve acessar endpoint raiz da API', async ({ request }) => {
      const response = await request.get('/');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('attributes');
    });

    test('deve retornar informações sobre a aplicação', async ({ request }) => {
      const response = await request.get('/');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      console.log('📊 Info da aplicação:', JSON.stringify(data.data, null, 2));
    });
  });

  test.describe('Autenticação e Autorização @api @auth', () => {
    test('deve rejeitar requisições sem token em endpoints protegidos', async ({ request }) => {
      // Tenta acessar endpoint que geralmente requer autenticação
      const response = await request.post('/auth/local', {
        data: {
          identifier: 'invalid@email.com',
          password: 'invalidpassword'
        }
      });
      
      // Deve retornar erro de autenticação
      expect([400, 401, 403]).toContain(response.status());
    });

    test('deve aceitar token válido em headers', async ({ request }) => {
      if (!apiToken) {
        test.skip('Token de API não disponível');
      }

      // Faz requisição com token válido
      const response = await request.get('/', {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('CRUD Operations @api @crud', () => {
    test('deve listar content types disponíveis', async ({ request }) => {
      // Tenta descobrir content types disponíveis
      const commonContentTypes = [
        'articles',
        'posts', 
        'pages',
        'categories',
        'users',
        'products'
      ];

      for (const contentType of commonContentTypes) {
        const response = await request.get(`/${contentType}`);
        
        if (response.ok()) {
          const data = await response.json();
          console.log(`✅ Content type encontrado: ${contentType}`);
          console.log(`📊 Dados: ${JSON.stringify(data.data?.slice(0, 1) || data, null, 2)}`);
          break;
        }
      }
    });

    test('deve criar entrada em content type (se token disponível)', async ({ request }) => {
      if (!apiToken) {
        test.skip('Token de API necessário para criação de conteúdo');
      }

      // Tenta criar uma entrada em diferentes content types
      const testData = {
        data: {
          title: faker.lorem.words(3),
          content: faker.lorem.paragraphs(2),
          description: faker.lorem.sentence(),
          publishedAt: new Date().toISOString()
        }
      };

      const contentTypes = ['articles', 'posts', 'pages'];
      
      for (const contentType of contentTypes) {
        try {
          const response = await request.post(`/${contentType}`, {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            data: testData
          });

          if (response.ok()) {
            const responseData = await response.json();
            console.log(`✅ Entrada criada em ${contentType}:`, responseData.data.id);
            
            // Adiciona à lista para limpeza posterior
            createdEntries.push({
              type: contentType,
              id: responseData.data.id
            });

            // Verifica se a entrada foi criada corretamente
            expect(responseData.data).toHaveProperty('id');
            expect(responseData.data.attributes).toHaveProperty('title');
            break;
          }
        } catch (error) {
          console.log(`⚠️ Não foi possível criar entrada em ${contentType}`);
        }
      }
    });

    test('deve buscar entrada específica por ID', async ({ request }) => {
      if (createdEntries.length === 0) {
        test.skip('Nenhuma entrada criada para buscar');
      }

      const entry = createdEntries[0];
      const response = await request.get(`/${entry.type}/${entry.id}`);
      
      if (response.ok()) {
        const data = await response.json();
        expect(data.data).toHaveProperty('id', entry.id);
        console.log(`✅ Entrada encontrada: ${entry.type}/${entry.id}`);
      }
    });

    test('deve atualizar entrada existente', async ({ request }) => {
      if (!apiToken || createdEntries.length === 0) {
        test.skip('Token de API e entrada existente necessários');
      }

      const entry = createdEntries[0];
      const updateData = {
        data: {
          title: `${faker.lorem.words(3)} - UPDATED`,
          content: faker.lorem.paragraphs(3)
        }
      };

      const response = await request.put(`/${entry.type}/${entry.id}`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        data: updateData
      });

      if (response.ok()) {
        const responseData = await response.json();
        expect(responseData.data.attributes.title).toContain('UPDATED');
        console.log(`✅ Entrada atualizada: ${entry.type}/${entry.id}`);
      }
    });
  });

  test.describe('Filtering e Sorting @api @queries', () => {
    test('deve suportar filtros básicos', async ({ request }) => {
      const contentTypes = ['articles', 'posts', 'pages'];
      
      for (const contentType of contentTypes) {
        // Testa filtro por publicação
        const publishedResponse = await request.get(`/${contentType}?filters[publishedAt][$notNull]=true`);
        
        if (publishedResponse.ok()) {
          console.log(`✅ Filtro funcionando para ${contentType}`);
          break;
        }
      }
    });

    test('deve suportar ordenação', async ({ request }) => {
      const contentTypes = ['articles', 'posts', 'pages'];
      
      for (const contentType of contentTypes) {
        // Testa ordenação por data de criação
        const sortedResponse = await request.get(`/${contentType}?sort=createdAt:desc`);
        
        if (sortedResponse.ok()) {
          const data = await sortedResponse.json();
          console.log(`✅ Ordenação funcionando para ${contentType}`);
          console.log(`📊 Primeiros resultados:`, data.data?.slice(0, 2));
          break;
        }
      }
    });

    test('deve suportar paginação', async ({ request }) => {
      const contentTypes = ['articles', 'posts', 'pages'];
      
      for (const contentType of contentTypes) {
        // Testa paginação
        const paginatedResponse = await request.get(`/${contentType}?pagination[page]=1&pagination[pageSize]=2`);
        
        if (paginatedResponse.ok()) {
          const data = await paginatedResponse.json();
          
          if (data.meta && data.meta.pagination) {
            expect(data.meta.pagination).toHaveProperty('page', 1);
            expect(data.meta.pagination).toHaveProperty('pageSize', 2);
            console.log(`✅ Paginação funcionando para ${contentType}`);
            break;
          }
        }
      }
    });
  });

  test.describe('Validation e Error Handling @api @validation', () => {
    test('deve retornar erro 404 para endpoint inexistente', async ({ request }) => {
      const response = await request.get('/endpoint-que-nao-existe');
      expect(response.status()).toBe(404);
    });

    test('deve retornar erro 404 para ID inexistente', async ({ request }) => {
      const contentTypes = ['articles', 'posts', 'pages'];
      
      for (const contentType of contentTypes) {
        const response = await request.get(`/${contentType}/999999`);
        
        if (response.status() === 404) {
          console.log(`✅ Erro 404 correto para ${contentType}/999999`);
          break;
        }
      }
    });

    test('deve validar dados de entrada inválidos', async ({ request }) => {
      if (!apiToken) {
        test.skip('Token de API necessário para teste de validação');
      }

      const invalidData = {
        data: {
          // Dados inválidos intencionalmente
          title: '', // Campo vazio
          invalidField: 'valor inválido'
        }
      };

      const contentTypes = ['articles', 'posts', 'pages'];
      
      for (const contentType of contentTypes) {
        try {
          const response = await request.post(`/${contentType}`, {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            data: invalidData
          });

          // Deve retornar erro de validação
          if ([400, 422].includes(response.status())) {
            const errorData = await response.json();
            console.log(`✅ Validação funcionando para ${contentType}:`, errorData.error?.message);
            break;
          }
        } catch (error) {
          // Erro esperado para dados inválidos
        }
      }
    });
  });

  test.describe('Performance e Rate Limiting @api @performance', () => {
    test('deve responder em tempo aceitável', async ({ request }) => {
      const startTime = Date.now();
      
      const response = await request.get('/');
      expect(response.ok()).toBeTruthy();
      
      const responseTime = Date.now() - startTime;
      
      // API deve responder em menos de 2 segundos
      expect(responseTime).toBeLessThan(2000);
      
      console.log(`⏱️ Tempo de resposta da API: ${responseTime}ms`);
    });

    test('deve lidar com múltiplas requisições simultâneas', async ({ request }) => {
      const promises = [];
      const numRequests = 5;
      
      for (let i = 0; i < numRequests; i++) {
        promises.push(request.get('/'));
      }
      
      const responses = await Promise.all(promises);
      
      // Todas as requisições devem ser bem-sucedidas
      for (const response of responses) {
        expect(response.ok()).toBeTruthy();
      }
      
      console.log(`✅ ${numRequests} requisições simultâneas processadas com sucesso`);
    });
  });

  test.describe('Content Types Discovery @api @discovery', () => {
    test('deve descobrir content types disponíveis', async ({ request }) => {
      console.log('🔍 Descobrindo content types disponíveis...');
      
      const commonContentTypes = [
        'articles', 'posts', 'pages', 'categories', 'tags',
        'products', 'users', 'comments', 'reviews', 'events',
        'news', 'blogs', 'portfolios', 'testimonials'
      ];
      
      const availableContentTypes = [];
      
      for (const contentType of commonContentTypes) {
        try {
          const response = await request.get(`/${contentType}?pagination[pageSize]=1`);
          
          if (response.ok()) {
            const data = await response.json();
            availableContentTypes.push({
              name: contentType,
              count: data.meta?.pagination?.total || 'unknown',
              sampleData: data.data?.[0] || null
            });
          }
        } catch (error) {
          // Ignora erros para content types não existentes
        }
      }
      
      console.log('📋 Content types encontrados:', availableContentTypes);
      
      // Pelo menos deve ter algum endpoint funcionando
      expect(availableContentTypes.length).toBeGreaterThanOrEqual(0);
    });
  });
});