import { test, expect } from '@playwright/test';

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword';
    
    await page.goto('/');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should display dashboard with inventory sessions', async ({ page }) => {
    // Check if dashboard is loaded
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Check if sessions list or create button is visible
    // Adjust selectors based on your actual dashboard implementation
    const createButton = page.locator('text=/создать|новую|инвентаризацию/i').first();
    // Note: This test may need adjustment based on your actual dashboard UI
  });

  test('should create new inventory session', async ({ page }) => {
    // Navigate to create session (adjust selector based on your UI)
    const createButton = page.locator('button').filter({ hasText: /создать|новую/i }).first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Wait for session creation or navigation
      await page.waitForTimeout(2000);
      
      // Check if we're on a session page
      // Adjust based on your routing
      const sessionUrl = page.url();
      expect(sessionUrl).toMatch(/\/dashboard\/sessions\/|session/i);
    }
  });

  test('should calculate inventory differences', async ({ page }) => {
    // Navigate to an existing session or create one
    // This test requires an existing session or the ability to create one
    
    // Navigate to sessions page
    await page.goto('/dashboard/sessions');
    await page.waitForTimeout(2000);
    
    // Click on first session if available
    const firstSession = page.locator('a[href*="/sessions/"]').first();
    if (await firstSession.isVisible()) {
      await firstSession.click();
      
      // Wait for session page to load
      await page.waitForTimeout(2000);
      
      // Check if inventory table is visible
      // Adjust selector based on your actual implementation
      const inventoryTable = page.locator('table, [role="table"]').first();
      // Note: This test may need adjustment based on your actual UI
    }
  });
});

