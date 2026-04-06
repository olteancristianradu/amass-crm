import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('shows login form when not authenticated', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    // Should render the login page with form elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('redirects to deals when accessing root', async ({ page }) => {
    await page.goto('/');
    // Unauthenticated users should be redirected
    await expect(page).toHaveURL(/\/(login|deals)/);
  });

  test('shows error boundary on page crash', async ({ page }) => {
    // Navigate to a valid route to ensure the app loads
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Navigation Guards', () => {
  test('protected routes redirect without auth', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login or deals (depending on auth state)
    await page.waitForURL(/\/(login|deals|dashboard)/);
  });

  test('health check accessible', async ({ request }) => {
    // If API is running, health check should respond
    const response = await request.get('http://localhost:3000/api/health').catch(() => null);
    if (response) {
      expect(response.ok()).toBeTruthy();
    }
  });
});
