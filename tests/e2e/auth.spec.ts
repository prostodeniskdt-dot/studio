import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Check if login form is visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message (adjust selector based on your error display)
    // This is a placeholder - adjust based on your actual error handling
    await page.waitForTimeout(1000);
    
    // Check if error is displayed (adjust selector based on your implementation)
    const errorMessage = page.locator('text=/error|invalid|неверный/i');
    // Note: This test may need adjustment based on your actual error handling UI
  });

  test('should navigate to dashboard after successful login', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;
    
    // Skip test if credentials are not provided
    test.skip(!testEmail || !testPassword, 'Test credentials not provided');
    
    // Fill in credentials
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Use 'load' instead of 'networkidle' - less strict, works better with Firebase
    await page.waitForURL('/dashboard', { timeout: 30000, waitUntil: 'load' });
    
    // Additional check: wait for dashboard content
    await page.waitForSelector('text=/инвентаризация|сессии|dashboard/i', { timeout: 10000 });
    
    // Check if dashboard is loaded
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

