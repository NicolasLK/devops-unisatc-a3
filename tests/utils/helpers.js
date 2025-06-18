// tests/utils/helpers.js
import { faker } from '@faker-js/faker/locale/pt_BR';

/**
 * Utilitários e helpers para testes E2E
 * Projeto: DevOps UNISATC A3
 */

export class TestHelpers {
  /**
   * Aguarda elemento estar visível com timeout personalizado
   */
  static async waitForElement(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      return true;
    } catch (error) {
      console.log(`⚠️ Elemento não encontrado: ${selector}`);
      return false;
    }
  }

  /**
   * Faz login como administrador
   */
  static async loginAsAdmin(page, email = null, password = null) {
    const adminEmail = email || process.env.ADMIN_EMAIL || 'admin@test.com';
    const adminPassword = password || process.env.ADMIN_PASSWORD || 'Test123456!';

    await page.goto('/admin/auth/login');
    await page.waitForLoadState('networkidle');

    // Verifica se é primeira vez (criação de admin)
    const isFirstTime = await page.locator('[name="firstname"]').isVisible();

    if (isFirstTime) {
      console.log('🔧 Criando primeiro administrador...');
      await page.fill('[name="firstname"]', 'Admin');
      await page.fill('[name="lastname"]', 'Test');
      await page.fill('[name="email"]', adminEmail);
      await page.fill('[name="password"]', adminPassword);
      await page.fill('[name="confirmPassword"]', adminPassword);
      
      const termsCheckbox = page.locator('[name="news"]');
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
    } else {
      console.log('🔑 Fazendo login como administrador...');
      await page.fill('[name="email"]', adminEmail);
      await page.fill('[name="password"]', adminPassword);
    }

    await page.click('[type="submit"]');
    await page.waitForURL('**/admin/**');
    
    console.log('✅ Login realizado com sucesso');
  }

  /**
   * Gera dados fake para testes
   */
  static generateTestData(type = 'article') {
    const data = {
      article: {
        title: faker.lorem.words(faker.number.int({ min: 2, max: 5 })),
        content: faker.lorem.paragraphs(faker.number.int({ min: 2, max: 4 })),
        description: faker.lorem.sentence(),
        slug: faker.helpers.slugify(faker.lorem.words(3)).toLowerCase(),
        publishedAt: faker.date.recent().toISOString()
      },
      category: {
        name: faker.commerce.department(),
        description: faker.lorem.sentence(),
        slug: faker.helpers.slugify(faker.commerce.department()).toLowerCase()
      },
      user: {
        firstname: faker.person.firstName(),
        lastname: faker.person.lastName(),
        email: faker.internet.email(),
        password: 'Test123456!',
        username: faker.internet.userName()
      },
      product: {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.commerce.price(),
        category: faker.commerce.department()
      }
    };

    return data[type] || data.article;
  }

  /**
   * Tira screenshot com nome personalizado
   */
  static async takeScreenshot(page, name, path = 'screenshots') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    
    await page.screenshot({ 
      path: `${path}/${filename}`,
      fullPage: true 
    });
    
    console.log(`📸 Screenshot salvo: ${filename}`);
    return filename;
  }

  /**
   * Aguarda API estar disponível
   */
  static async waitForApiReady(request, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await request.get('/_health');
        if (response.status() === 204) {
          console.log('✅ API está pronta');
          return true;
        }
      } catch (error) {
        // Continua tentando
      }
      
      console.log(`⏳ Aguardando API... (tentativa ${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('API não ficou disponível no tempo esperado');
  }

  /**
   * Cria token de API para testes
   */
  static async createApiToken(request, adminJwt) {
    try {
      const response = await request.post('/admin/api-tokens', {
        headers: {
          'Authorization': `Bearer ${adminJwt}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: `E2E Test Token ${Date.now()}`,
          description: 'Token gerado automaticamente para testes E2E',
          type: 'full-access',
          lifespan: null
        }
      });

      if (response.ok()) {
        const data = await response.json();
        return data.data.accessKey;
      }
    } catch (error) {
      console.log('⚠️ Erro ao criar token de API:', error.message);
    }
    
    return null;
  }

  /**
   * Limpa dados de teste
   */
  static async cleanupTestData(request, apiToken, contentType, ids) {
    if (!apiToken || !ids || ids.length === 0) return;

    console.log(`🧹 Limpando ${ids.length} itens de ${contentType}...`);
    
    for (const id of ids) {
      try {
        await request.delete(`/${contentType}/${id}`, {
          headers: {
            'Authorization': `Bearer ${apiToken}`
          }
        });
      } catch (error) {
        console.log(`⚠️ Erro ao deletar ${contentType}/${id}:`, error.message);
      }
    }
    
    console.log('✅ Limpeza concluída');
  }

  /**
   * Aguarda elemento com texto específico
   */
  static async waitForText(page, text, timeout = 10000) {
    try {
      await page.waitForSelector(`text=${text}`, { timeout });
      return true;
    } catch (error) {
      console.log(`⚠️ Texto não encontrado: ${text}`);
      return false;
    }
  }

  /**
   * Preenche formulário com dados
   */
  static async fillForm(page, formData) {
    for (const [field, value] of Object.entries(formData)) {
      const selector = `[name="${field}"]`;
      
      try {
        const element = page.locator(selector);
        
        if (await element.isVisible()) {
          // Verifica tipo do campo
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          const inputType = await element.getAttribute('type');
          
          if (tagName === 'select') {
            await element.selectOption(value);
          } else if (inputType === 'checkbox') {
            if (value) await element.check();
            else await element.uncheck();
          } else if (inputType === 'radio') {
            await element.check();
          } else {
            await element.fill(value.toString());
          }
          
          console.log(`✅ Campo preenchido: ${field} = ${value}`);
        } else {
          console.log(`⚠️ Campo não encontrado: ${field}`);
        }
      } catch (error) {
        console.log(`❌ Erro ao preencher campo ${field}:`, error.message);
      }
    }
  }

  /**
   * Navega para seção do admin
   */
  static async navigateToAdminSection(page, section) {
    const sections = {
      'content-manager': 'Content Manager',
      'content-type-builder': 'Content-Type Builder',
      'media-library': 'Media Library',
      'settings': 'Settings'
    };

    const sectionText = sections[section] || section;
    
    try {
      await page.click(`text=${sectionText}`);
      await page.waitForLoadState('networkidle');
      console.log(`✅ Navegou para: ${sectionText}`);
    } catch (error) {
      console.log(`❌ Erro ao navegar para ${sectionText}:`, error.message);
      throw error;
    }
  }

  /**
   * Verifica se elemento existe sem falhar
   */
  static async elementExists(page, selector) {
    try {
      return await page.locator(selector).isVisible();
    } catch (error) {
      return false;
    }
  }

  /**
   * Aguarda network estar idle
   */
  static async waitForNetworkIdle(page, timeout = 30000) {
    try {
      await page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      console.log('⚠️ Timeout aguardando network idle');
    }
  }

  /**
   * Faz scroll até elemento
   */
  static async scrollToElement(page, selector) {
    try {
      await page.locator(selector).scrollIntoViewIfNeeded();
    } catch (error) {
      console.log(`⚠️ Erro ao fazer scroll para ${selector}:`, error.message);
    }
  }

  /**
   * Obtém texto de elemento
   */
  static async getElementText(page, selector) {
    try {
      return await page.locator(selector).textContent();
    } catch (error) {
      console.log(`⚠️ Erro ao obter texto de ${selector}:`, error.message);
      return null;
    }
  }

  /**
   * Gera dados de upload de arquivo
   */
  static generateTestFile(type = 'image') {
    const files = {
      image: {
        name: `test-image-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      },
      document: {
        name: `test-document-${Date.now()}.pdf`,
        mimeType: 'application/pdf',
        buffer: Buffer.from('fake-pdf-data')
      },
      text: {
        name: `test-file-${Date.now()}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from('Conteúdo de teste para arquivo')
      }
    };

    return files[type] || files.text;
  }

  /**
   * Faz upload de arquivo
   */
  static async uploadFile(page, fileSelector, fileData) {
    try {
      const fileInput = page.locator(fileSelector);
      
      await fileInput.setInputFiles({
        name: fileData.name,
        mimeType: fileData.mimeType,
        buffer: fileData.buffer
      });
      
      console.log(`📁 Arquivo enviado: ${fileData.name}`);
    } catch (error) {
      console.log(`❌ Erro no upload: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica performance de carregamento
   */
  static async checkPerformance(page, url, maxLoadTime = 5000) {
    const startTime = Date.now();
    
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️ Tempo de carregamento: ${loadTime}ms`);
    
    if (loadTime > maxLoadTime) {
      console.log(`⚠️ Carregamento lento: ${loadTime}ms > ${maxLoadTime}ms`);
    }
    
    return loadTime;
  }

  /**
   * Gera relatório de erro detalhado
   */
  static async generateErrorReport(page, testName, error) {
    const timestamp = new Date().toISOString();
    const errorReport = {
      test: testName,
      timestamp,
      error: error.message,
      url: page.url(),
      viewport: await page.viewportSize(),
      userAgent: await page.evaluate(() => navigator.userAgent)
    };

    // Tira screenshot do erro
    const screenshotPath = await this.takeScreenshot(page, `error-${testName}`);
    errorReport.screenshot = screenshotPath;

    console.log('🚨 Relatório de erro:', JSON.stringify(errorReport, null, 2));
    
    return errorReport;
  }

  /**
   * Valida estrutura de resposta da API
   */
  static validateApiResponse(response, expectedStructure) {
    const errors = [];
    
    function validateObject(obj, structure, path = '') {
      for (const [key, expectedType] of Object.entries(structure)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (!(key in obj)) {
          errors.push(`Campo obrigatório ausente: ${currentPath}`);
          continue;
        }
        
        const value = obj[key];
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (actualType !== expectedType && expectedType !== 'any') {
          errors.push(`Tipo incorreto em ${currentPath}: esperado ${expectedType}, recebido ${actualType}`);
        }
        
        if (expectedType === 'object' && value !== null) {
          // Validação recursiva para objetos aninhados
          validateObject(value, {}, currentPath);
        }
      }
    }
    
    validateObject(response, expectedStructure);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Aguarda condição customizada
   */
  static async waitForCondition(conditionFn, timeout = 10000, interval = 500) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await conditionFn();
        if (result) {
          return true;
        }
      } catch (error) {
        // Continua tentando
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condição não atendida em ${timeout}ms`);
  }

  /**
   * Mock de resposta da API
   */
  static async mockApiResponse(page, url, response) {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
    
    console.log(`🎭 Mock configurado para: ${url}`);
  }

  /**
   * Intercepta requisições da API
   */
  static async interceptApiRequests(page, pattern) {
    const requests = [];
    
    await page.route(pattern, route => {
      requests.push({
        url: route.request().url(),
        method: route.request().method(),
        headers: route.request().headers(),
        timestamp: Date.now()
      });
      
      route.continue();
    });
    
    return requests;
  }

  /**
   * Limpa cache e cookies
   */
  static async clearBrowserData(context) {
    await context.clearCookies();
    await context.clearPermissions();
    
    console.log('🧹 Cache e cookies limpos');
  }

  /**
   * Configura ambiente de teste
   */
  static async setupTestEnvironment(page) {
    // Desabilita animações para testes mais rápidos
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-delay: 0.01ms !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `
    });
    
    // Intercepta erros de console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🚨 Console Error: ${msg.text()}`);
      }
    });
    
    // Intercepta erros de página
    page.on('pageerror', error => {
      console.log(`🚨 Page Error: ${error.message}`);
    });
    
    console.log('🔧 Ambiente de teste configurado');
  }
}