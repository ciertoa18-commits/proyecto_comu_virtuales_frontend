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

  test('el registro pide el Gmail personal como obligatorio', async ({ page }) => {
    await page.goto('/registro');
    await expect(page.getByText('Gmail personal')).toBeVisible();
    await expect(page.getByPlaceholder('tucorreo@gmail.com')).toBeVisible();
    await expect(page.getByText('Teléfono (opcional)')).toBeVisible();
  });

  test('al volver al login después de cerrar sesión no aparece el aviso de sesión cerrada', async ({ page }) => {
    await page.goto('/login?motivo=salio');
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByText(/Sesión cerrada/)).toHaveCount(0);
  });

  test('la página no usa emojis', async ({ page }) => {
    await page.goto('/registro');
    const texto = await page.locator('body').innerText();
    expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  test('recuperar contraseña explica que el código llega al Gmail', async ({ page }) => {
    await page.goto('/recuperar');
    await expect(page.getByText(/Gmail personal/)).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  });
});
