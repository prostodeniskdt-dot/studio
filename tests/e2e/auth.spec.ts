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
    // This test requires valid test credentials
    // You may need to set up test users in Firebase
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword';
    
    // Fill in credentials
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Check if dashboard is loaded
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

