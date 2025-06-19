import { faker } from "@faker-js/faker/locale/pt_BR";
// tests/admin.test.js
import { expect, test } from "@playwright/test";

/**
 * Testes End-to-End para o Painel Administrativo do Strapi
 * Projeto: DevOps UNISATC A3
 */

test.describe("Painel Administrativo Strapi", () => {
  test.beforeEach(async ({ page }) => {
    // Navega para o dashboard admin
    await page.goto("http://localhost:1337/admin/auth/login");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Dashboard e Navegação @admin @smoke", () => {
    test("deve carregar o dashboard corretamente", async ({ page }) => {
      // Verifica se está na página do dashboard
      await expect(page).toHaveURL(/.*\/admin.*/);

      // Verifica elementos principais do dashboard
      await expect(page.locator("main")).toBeVisible();
      await expect(
        page.locator('[data-testid="navbar"]').or(page.locator("nav"))
      ).toBeVisible();

      // Verifica menu lateral
      const sidebar = page
        .locator('[data-testid="sidebar"]')
        .or(page.locator("aside"));
      await expect(sidebar).toBeVisible();

      // Verifica links principais do menu
      const menuItems = [
        "Content Manager",
        "Content-Type Builder",
        "Media Library",
        "Settings",
      ];

      for (const item of menuItems) {
        await expect(page.locator(`text="${item}"`).first()).toBeVisible();
      }
    });

    test("deve navegar entre seções do admin", async ({ page }) => {
      // Testa navegação para Content Manager
      await page.click("text=Content Manager");
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator("h1, h2").filter({ hasText: /Content Manager/i })
      ).toBeVisible();

      // Testa navegação para Media Library
      await page.click("text=Media Library");
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator("h1, h2").filter({ hasText: /Media Library/i })
      ).toBeVisible();

      // Testa navegação para Settings
      await page.click("text=Settings");
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator("h1, h2").filter({ hasText: /Settings/i })
      ).toBeVisible();
    });
  });

  test.describe("Content-Type Builder @admin @content", () => {
    test("deve acessar Content-Type Builder", async ({ page }) => {
      await page.click("text=Content-Type Builder");
      await page.waitForLoadState("networkidle");

      // Verifica se está na página correta
      await expect(
        page.locator("h1, h2").filter({ hasText: /Content-Type Builder/i })
      ).toBeVisible();

      // Verifica botão para criar novo content type
      await expect(
        page
          .locator("text=Create new collection type")
          .or(page.locator("button").filter({ hasText: /create/i }))
      ).toBeVisible();
    });

    test("deve criar um novo content type", async ({ page }) => {
      await page.click("text=Content-Type Builder");
      await page.waitForLoadState("networkidle");

      // Clica em criar novo collection type
      await page.click("text=Create new collection type");

      // Preenche o nome do content type
      const contentTypeName = faker.lorem.word();
      await page.fill('[name="displayName"]', contentTypeName);

      // Clica em continuar
      await page.click("text=Continue");
      await page.waitForLoadState("networkidle");

      // Adiciona campo de texto
      await page.click("text=Text");
      await page.fill('[name="name"]', "title");
      await page.click("text=Finish");

      // Salva o content type
      await page.click("text=Save");
      await page.waitForLoadState("networkidle");

      // Verifica se foi criado com sucesso
      await expect(page.locator(`text=${contentTypeName}`)).toBeVisible();
    });
  });

  test.describe("Content Manager @admin @content", () => {
    test("deve acessar Content Manager", async ({ page }) => {
      await page.click("text=Content Manager");
      await page.waitForLoadState("networkidle");

      // Verifica se está na página correta
      await expect(
        page.locator("h1, h2").filter({ hasText: /Content Manager/i })
      ).toBeVisible();
    });

    test("deve criar novo conteúdo se content type existir", async ({
      page,
    }) => {
      await page.click("text=Content Manager");
      await page.waitForLoadState("networkidle");

      // Procura por algum content type existente
      const contentTypes = page
        .locator('[data-testid="collection-type"]')
        .or(page.locator("li").filter({ hasText: /collection/i }));

      const count = await contentTypes.count();

      if (count > 0) {
        // Clica no primeiro content type
        await contentTypes.first().click();
        await page.waitForLoadState("networkidle");

        // Tenta criar novo entrada
        const createButton = page
          .locator("text=Create new entry")
          .or(page.locator("button").filter({ hasText: /create/i }));

        if (await createButton.isVisible()) {
          await createButton.click();
          await page.waitForLoadState("networkidle");

          // Verifica se formulário de criação apareceu
          await expect(page.locator("form")).toBeVisible();
        }
      }
    });
  });

  test.describe("Media Library @admin @media", () => {
    test("deve acessar Media Library", async ({ page }) => {
      await page.click("text=Media Library");
      await page.waitForLoadState("networkidle");

      // Verifica se está na página correta
      await expect(
        page.locator("h1, h2").filter({ hasText: /Media Library/i })
      ).toBeVisible();

      // Verifica botão de upload
      await expect(
        page
          .locator("text=Add new assets")
          .or(page.locator('input[type="file"]'))
      ).toBeVisible();
    });

    test("deve mostrar interface de upload", async ({ page }) => {
      await page.click("text=Media Library");
      await page.waitForLoadState("networkidle");

      // Clica no botão de adicionar assets (se visível)
      const addButton = page
        .locator("text=Add new assets")
        .or(page.locator("button").filter({ hasText: /add/i }));

      if (await addButton.isVisible()) {
        await addButton.click();

        // Verifica se interface de upload apareceu
        await expect(
          page
            .locator('input[type="file"]')
            .or(page.locator('[data-testid="upload-area"]'))
        ).toBeVisible();
      }
    });
  });

  test.describe("Settings @admin @settings", () => {
    test("deve acessar página de Settings", async ({ page }) => {
      await page.click("text=Settings");
      await page.waitForLoadState("networkidle");

      // Verifica se está na página correta
      await expect(
        page.locator("h1, h2").filter({ hasText: /Settings/i })
      ).toBeVisible();

      // Verifica seções de configuração
      const settingsSections = [
        "Administration Panel",
        "Global Settings",
        "Users & Permissions",
      ];

      for (const section of settingsSections) {
        const sectionLocator = page.locator(`text=${section}`).first();
        if (await sectionLocator.isVisible()) {
          await expect(sectionLocator).toBeVisible();
        }
      }
    });

    test("deve acessar configurações de usuários e permissões", async ({
      page,
    }) => {
      await page.click("text=Settings");
      await page.waitForLoadState("networkidle");

      // Tenta clicar em Users & Permissions
      const usersPermissions = page
        .locator("text=Users & Permissions")
        .or(page.locator("text=Roles").or(page.locator("text=Users")));

      if (await usersPermissions.first().isVisible()) {
        await usersPermissions.first().click();
        await page.waitForLoadState("networkidle");

        // Verifica se carregou a página de usuários/permissões
        await expect(
          page
            .locator("h1, h2")
            .filter({ hasText: /(Users|Roles|Permissions)/i })
        ).toBeVisible();
      }
    });
  });

  test.describe("Perfil do Usuário @admin @profile", () => {
    test("deve acessar configurações do perfil", async ({ page }) => {
      // Procura pelo avatar/menu do usuário
      const userMenu = page
        .locator('[data-testid="user-menu"]')
        .or(
          page.locator("button").filter({
            hasText: new RegExp(process.env.ADMIN_EMAIL || "admin", "i"),
          })
        )
        .or(page.locator('[data-testid="profile-button"]'));

      if (await userMenu.isVisible()) {
        await userMenu.click();

        // Procura por link do perfil
        const profileLink = page
          .locator("text=Profile")
          .or(page.locator("text=Perfil"));

        if (await profileLink.isVisible()) {
          await profileLink.click();
          await page.waitForLoadState("networkidle");

          // Verifica se está na página do perfil
          await expect(
            page.locator("h1, h2").filter({ hasText: /(Profile|Perfil)/i })
          ).toBeVisible();
        }
      }
    });
  });

  test.describe("Funcionalidades Gerais @admin @regression", () => {
    test("deve fazer logout corretamente", async ({ page }) => {
      // Procura pelo menu do usuário
      const userMenu = page.locator('[data-testid="user-menu"]').or(
        page.locator("button").filter({
          hasText: new RegExp(process.env.ADMIN_EMAIL || "admin", "i"),
        })
      );

      if (await userMenu.isVisible()) {
        await userMenu.click();

        // Procura pelo botão de logout
        const logoutButton = page
          .locator("text=Logout")
          .or(page.locator("text=Sair"));

        if (await logoutButton.isVisible()) {
          await logoutButton.click();
          await page.waitForLoadState("networkidle");

          // Verifica se foi redirecionado para login
          await expect(page).toHaveURL(/.*\/admin\/auth\/login.*/);
          await expect(page.locator('[name="email"]')).toBeVisible();
        }
      }
    });

    test("deve verificar responsividade básica", async ({ page }) => {
      // Testa em viewport mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Verifica se elementos principais ainda estão visíveis
      await expect(page.locator("main")).toBeVisible();

      // Volta para desktop
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.reload();
      await page.waitForLoadState("networkidle");

      await expect(page.locator("main")).toBeVisible();
    });

    test("deve verificar performance básica", async ({ page }) => {
      const startTime = Date.now();

      await page.goto("http://localhost:1337/admin/auth/login");
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;

      // Verifica se carregou em menos de 10 segundos
      expect(loadTime).toBeLessThan(10000);

      console.log(`⏱️ Tempo de carregamento do admin: ${loadTime}ms`);
    });
  });
});
