import { expect, test } from '@playwright/test';

test.describe('Pantallas públicas', () => {
  test('la página de inicio de sesión muestra el formulario', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
  });

  test('no deja ingresar con campos vacíos', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page.getByText('Este campo es obligatorio.').first()).toBeVisible();
  });

  test('el registro pide el Gmail de recuperación', async ({ page }) => {
    await page.goto('/registro');
    await expect(page.getByPlaceholder('tucorreo@gmail.com')).toBeVisible();
  });

  test('recuperar contraseña explica que el código llega al Gmail', async ({ page }) => {
    await page.goto('/recuperar');
    await expect(page.getByText(/Gmail de recuperación/)).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  });
});
