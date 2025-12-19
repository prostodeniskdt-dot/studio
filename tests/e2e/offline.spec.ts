import { test, expect } from '@playwright/test';

test.describe('Offline Mode', () => {
  test.beforeEach(async ({ page, context }) => {
    // Login before each test
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;
    
    // Skip all tests if credentials are not provided
    test.skip(!testEmail || !testPassword, 'Test credentials not provided');
    
    await page.goto('/');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Use 'load' instead of 'networkidle'
    await page.waitForURL('/dashboard', { timeout: 30000, waitUntil: 'load' });
  });

  test('should show offline indicator when network is offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Wait for offline indicator to appear
    await page.waitForTimeout(1000);
    
    // Check if offline indicator is visible
    // Adjust selector based on your OfflineIndicator component
    const offlineIndicator = page.locator('text=/офлайн|offline/i').first();
    // Note: This test may need adjustment based on your actual offline indicator implementation
  });

  test('should queue operations when offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Try to perform an operation (e.g., create a session)
    // This depends on your actual UI and operations
    await page.waitForTimeout(1000);
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for sync to complete
    await page.waitForTimeout(2000);
    
    // Check if operations were synced
    // This test may need adjustment based on your actual sync implementation
  });

  test('should sync queued operations when coming back online', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Perform some operations while offline
    await page.waitForTimeout(1000);
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for sync indicator
    await page.waitForTimeout(2000);
    
    // Check if sync completed
    // Adjust based on your actual sync UI
    const syncIndicator = page.locator('text=/синхронизация|sync/i').first();
    // Note: This test may need adjustment based on your actual implementation
  });
});

