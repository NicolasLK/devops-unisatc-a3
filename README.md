# 🎭 Testes End-to-End com Playwright

## Projeto DevOps UNISATC A3 - Strapi Application

Esta documentação descreve a implementação completa de testes end-to-end (E2E) para a aplicação Strapi usando Playwright.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Instalação e Configuração](#instalação-e-configuração)
- [Estrutura dos Testes](#estrutura-dos-testes)
- [Execução dos Testes](#execução-dos-testes)
- [CI/CD](#cicd)
- [Docker](#docker)
- [Utilitários](#utilitários)
- [Boas Práticas](#boas-práticas)

## 🎯 Visão Geral

Os testes E2E cobrem:

- **Painel Administrativo**: Navegação, criação de content types, gerenciamento de conteúdo
- **API REST**: Endpoints, autenticação, CRUD operations, validações
- **Integração**: Fluxos completos entre admin e API
- **Performance**: Tempos de carregamento e responsividade
- **Cross-browser**: Chrome, Firefox, Safari
- **Mobile**: Testes responsivos

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- pnpm 8+
- Strapi rodando localmente

### 1. Instalação das Dependências

```bash
# Instalar dependências
pnpm install

# Instalar browsers do Playwright
pnpm exec playwright install
```

### 2. Configuração do Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar variáveis de ambiente
nano .env
```

### 3. Variáveis de Ambiente Principais

```bash
# URLs da aplicação
STRAPI_URL=http://localhost:1337
STRAPI_API_URL=http://localhost:1337/api

# Credenciais de teste
ADMIN_EMAIL=admin@test.com
ADMIN_PASSWORD=Test123456!

# Configurações de teste
NODE_ENV=test
HEADLESS=false
```

## 📁 Estrutura dos Testes

```
tests/
├── global.setup.js          # Setup global (autenticação, dados)
├── global.teardown.js       # Limpeza final
├── admin.test.js            # Testes do painel admin
├── api.test.js              # Testes da API REST
├── integration.test.js      # Testes de integração
├── mobile.test.js           # Testes mobile
├── utils/
│   ├── helpers.js           # Utilitários e helpers
│   └── fixtures.js          # Dados de teste
├── fixtures/
│   ├── test-data.json       # Dados estáticos
│   └── mock-responses.json  # Respostas mockadas
└── screenshots/             # Screenshots de falhas
```

## 🧪 Execução dos Testes

### Comandos Básicos

```bash
# Executar todos os testes
pnpm test

# Executar com interface gráfica
pnpm test:ui

# Executar em modo debug
pnpm test:debug

# Executar com browser visível
pnpm test:headed
```

### Execução por Categoria

```bash
# Testes de smoke (essenciais)
pnpm test:smoke

# Testes do admin
pnpm test:admin

# Testes de API
pnpm test:api

# Testes de integração
pnpm run test --grep="@integration"
```

### Execução por Browser

```bash
# Chrome apenas
pnpm exec playwright test --project=chromium

# Firefox apenas
pnpm exec playwright test --project=firefox

# Mobile Chrome
pnpm exec playwright test --project="Mobile Chrome"
```

## 🏷️ Tags de Teste

Os testes são organizados usando tags para execução seletiva:

- `@smoke` - Testes essenciais, execução rápida
- `@admin` - Testes do painel administrativo
- `@api` - Testes da API REST
- `@content` - Testes relacionados a conteúdo
- `@auth` - Testes de autenticação
- `@media` - Testes de upload/mídia
- `@integration` - Testes de integração
- `@performance` - Testes de performance
- `@regression` - Testes de regressão

## 📊 Relatórios

### Relatório HTML

```bash
# Gerar e visualizar relatório
pnpm test:report
```

### Relatórios em CI

- **HTML**: `playwright-report/index.html`
- **JSON**: `test-results/results.json`
- **JUnit**: `test-results/junit.xml`

## 🐳 Docker

### Execução com Docker Compose

```bash
# Subir ambiente de teste completo
docker-compose -f docker-compose.test.yml up

# Executar apenas os testes
docker-compose -f docker-compose.test.yml run playwright-tests

# Limpar ambiente
docker-compose -f docker-compose.test.yml down -v
```

### Build do Container de Testes

```bash
# Build da imagem
docker build -f Dockerfile.playwright -t strapi-e2e-tests .

# Executar testes
docker run --rm \
  -e STRAPI_URL=http://host.docker.internal:1337 \
  -v $(pwd)/test-results:/app/test-results \
  strapi-e2e-tests
```

## 🔄 CI/CD

### GitHub Actions

O workflow `.github/workflows/e2e-tests.yml` executa:

1. **Setup**: Instalação de dependências
2. **Build**: Build da aplicação Strapi
3. **Smoke Tests**: Testes essenciais
4. **Admin Tests**: Testes do painel (Chrome + Firefox)
5. **API Tests**: Testes da API
6. **Integration Tests**: Testes de integração
7. **Report**: Consolidação de relatórios

### Execução Manual

```bash
# Workflow dispatch com parâmetros
gh workflow run e2e-tests.yml -f test_type=smoke
```

### Configuração de Secrets

```yaml
# Secrets necessários no GitHub
ADMIN_EMAIL: admin@test.com
ADMIN_PASSWORD: Test123456!
STRAPI_API_TOKEN: your_api_token_here
```

## 🛠️ Utilitários

### TestHelpers

```javascript
import { TestHelpers } from './utils/helpers.js';

// Login automático
await TestHelpers.loginAsAdmin(page);

// Dados fake
const testData = TestHelpers.generateTestData('article');

// Screenshot
await TestHelpers.takeScreenshot(page, 'test-failure');

// Aguardar API
await TestHelpers.waitForApiReady(request);
```

### Debugging

```javascript
// Pausar execução para debug
await page.pause();

// Console logs
console.log('🔍 Debug info:', await page.title());

// Screenshots automáticos em falhas
// (configurado automaticamente)
```

## 📈 Performance

### Métricas Monitoradas

- **Tempo de carregamento do admin**: < 15s
- **Tempo de resposta da API**: < 2s
- **Tempo de navegação**: < 5s
- **Tempo de criação de conteúdo**: < 10s

### Otimizações

```javascript
// Desabilita animações para testes mais rápidos
await page.addStyleTag({
  content: `* { animation-duration: 0.01ms !important; }`
});

// Aguarda network idle
await page.waitForLoadState('networkidle');
```

## 🔧 Configuração Avançada

### Playwright Config

```javascript
// playwright.config.js personalizado
export default defineConfig({
  timeout: 60000,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL: 'http://localhost:1337',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  }
});
```

### Configuração de Browser

```javascript
// Contexto customizado
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo'
});
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Strapi não inicia
```bash
# Verificar porta
lsof -i :1337

# Limpar cache
rm -rf .tmp/
pnpm build
```

#### 2. Testes falhando por timeout
```bash
# Aumentar timeout
TIMEOUT=120000 pnpm test
```

#### 3. Browsers não instalados
```bash
# Reinstalar browsers
pnpm exec playwright install --force
```

#### 4. Problemas de permissão
```bash
# Ajustar permissões
chmod +x node_modules/.bin/playwright
```

### Debug de Testes

```bash
# Executar com logs detalhados
DEBUG=pw:api pnpm test

# Executar teste específico em debug
pnpm exec playwright test admin.test.js --debug

# Executar com browser aberto
pnpm test:headed
```

## 📝 Boas Práticas

### 1. Estrutura de Testes

- Use `describe` para agrupar testes relacionados
- Nomeie testes de forma descritiva
- Use tags para categorização
- Implemente setup/teardown adequados

### 2. Seletores

```javascript
// ✅ Bom - seletores estáveis
page.locator('[data-testid="submit-button"]')
page.locator('text=Submit')

// ❌ Evitar - seletores frágeis
page.locator('.btn-primary-lg-md')
```

### 3. Assertions

```javascript
// ✅ Assertions específicas
await expect(page.locator('[data-testid="title"]')).toHaveText('Expected Title');

// ✅ Aguardar elementos
await expect(page.locator('text=Success')).toBeVisible();
```

### 4. Data Management

```javascript
// ✅ Limpar dados após testes
test.afterEach(async ({ request }) => {
  await TestHelpers.cleanupTestData(request, apiToken, 'articles', createdIds);
});
```

### 5. Error Handling

```javascript
// ✅ Try/catch para operações opcionais
try {
  await page.click('text=Optional Button', { timeout: 5000 });
} catch (error) {
  console.log('Botão opcional não encontrado, continuando...');
}
```

## 📞 Suporte

### Recursos Adicionais

- [Documentação do Playwright](https://playwright.dev/)
- [Documentação do Strapi](https://docs.strapi.io/)
- [Exemplos de Testes](./tests/examples/)

### Contribuição

1. Fork o repositório
2. Crie branch para feature: `git checkout -b feature/nova-funcionalidade`
3. Commit mudanças: `git commit -m 'Add nova funcionalidade'`
4. Push para branch: `git push origin feature/nova-funcionalidade`
5. Abra Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

# Executar todos os testes
pnpm test

# Testes essenciais apenas
pnpm test:smoke

# Testes do admin
pnpm test:admin

# Testes de API
pnpm test:api

# Interface gráfica
pnpm test:ui

# Com browser visível
pnpm test:headed

**Desenvolvido para o projeto DevOps UNISATC A3** 🎓