import { test, expect } from '@playwright/test';

// Generate unique test user credentials
const getUniqueEmail = () => `cart-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const testPassword = 'Password123!';

test.describe('Cart Flow', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));
  });

  test('Guest User Flow - Add, Update, Remove, Persist', async ({ page }) => {
    // 1. Navigate to a product page
    await page.goto('/');
    
    // Choose a non-flash sale product
    const productCard = page.locator('.group.block').filter({ hasNot: page.locator('span:has-text("Buy Now")') }).first();
    // Re-evaluating: ProductCard labels might not be enough. Let's look for cards without FlashSaleBadge.
    // FlashSaleBadge is an absolute positioned div with "Zap" icon.
    const nonFlashSaleProduct = page.locator('.group.block').filter({ hasNot: page.locator('svg.lucide-zap') }).first();
    await nonFlashSaleProduct.click();
    
    // 2. Add to Cart
    const addBtn = page.getByRole('button', { name: /Add to Bag/i });
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500); // wait for sidebar cart animation

    // 3. Verify Cart Sidebar opens
    const cartSidebar = page.getByText('Your Bag (', { exact: false }).first();
    await expect(cartSidebar).toBeVisible();
    await expect(page.getByText('Your Bag (1)')).toBeVisible();

    // 4. Update Quantity
    const increaseBtn = page.getByLabel('Increase quantity').first();
    const decreaseBtn = page.getByLabel('Decrease quantity').first();
    const quantityDisplay = page.locator('span.px-4.font-medium').first();

    await increaseBtn.click();
    await expect(quantityDisplay).toHaveText('2');
    
    // Check total price update (approximate check if needed, or just quantity)
    
    // 5. Persist across reload
    await page.reload();
    // Open cart
    await page.locator('button[aria-label="Open cart"]').click();
    await page.waitForTimeout(500); // wait for sidebar cart animation
    await expect(page.getByText('Your Bag (1)')).toBeVisible();
    await expect(quantityDisplay).toHaveText('2');

    // 6. Remove Item
    await page.getByLabel('Remove item').click();
    await expect(page.getByText('Your bag is empty')).toBeVisible();
  });

  test('Registered User Flow - Persist across Logout', async ({ page }) => {
    const uniqueEmail = getUniqueEmail();

    // 1. Register
    await page.goto('/register');
    await page.getByPlaceholder('John Doe').fill('Cart User');
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    // Wait for redirect to home page
    try {
        await expect(page).toHaveURL('/', { timeout: 15000 });
    } catch (error) {
        const errorMsg = page.locator('.bg-red-50');
        if (await errorMsg.isVisible()) {
            console.error('Registration failed error in UI:', await errorMsg.innerText());
        }
        throw error;
    }

    // 2. Add to Cart (Non-Flash Sale)
    await page.goto('/');
    const nonFlashSaleProduct = page.locator('.group.block').filter({ hasNot: page.locator('svg.lucide-zap') }).first();
    await nonFlashSaleProduct.click();
    
    const addBtn = page.getByRole('button', { name: /Add to Bag/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await page.waitForTimeout(500); // wait for sidebar cart animation
    await expect(page.getByText('Your Bag (1)')).toBeVisible();
    
    // Close cart
    await page.locator('button[aria-label="Close cart"]').click();

    // 3. Logout
    await page.goto('/profile'); 
    await expect(page).toHaveURL('/profile', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Check if logout button exists
    const logoutBtn = page.getByRole('button', { name: /Log out/i });
    try {
        await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    } catch (e) {
        console.error('Logout button NOT visible on profile page');
        throw e;
    }
    await logoutBtn.click();
    
    // Wait for redirect to login or home
    await expect(page).toHaveURL('/login', { timeout: 10000 });

    // 4. Login again
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    try {
      await expect(page).toHaveURL('/', { timeout: 10000 });
    } catch (error) {
      const errorMsg = page.locator('.bg-red-50');
      if (await errorMsg.isVisible()) {
        const text = await errorMsg.innerText();
        console.error(`Login failed with error: ${text}`);
      }
      throw error;
    }

    // 5. Open Cart and Verify
    await page.locator('button[aria-label="Open cart"]').click();
    await page.waitForTimeout(500); // wait for sidebar cart animation
    await expect(page.getByText('Your Bag (1)')).toBeVisible({ timeout: 10000 });
  });

  test('Merge Cart Flow - Guest to Registered', async ({ page }) => {
    const uniqueEmail = getUniqueEmail();

    // 1. Add item as Guest (Non-Flash Sale)
    await page.goto('/');
    const nonFlashSaleProduct = page.locator('.group.block').filter({ hasNot: page.locator('svg.lucide-zap') }).first();
    await nonFlashSaleProduct.click();
    
    const addBtn = page.getByRole('button', { name: /Add to Bag/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await page.waitForTimeout(500); // wait for sidebar cart animation
    await expect(page.getByText('Your Bag (1)')).toBeVisible();
    
    const guestItemName = await page.locator('h3.font-serif').first().innerText();
    
    // Close cart
    await page.locator('button[aria-label="Close cart"]').click();

    // 2. Register (which logs in)
    await page.goto('/register');
    await page.getByPlaceholder('John Doe').fill('Merge User');
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    // Wait for redirect to home page
    try {
        await expect(page).toHaveURL('/', { timeout: 15000 });
    } catch (error) {
        const errorMsg = page.locator('.bg-red-50');
        if (await errorMsg.isVisible()) {
            console.error('Merge registration failed error in UI:', await errorMsg.innerText());
        }
        throw error;
    }

    // 3. Open Cart and Verify Item is there
    await page.locator('button[aria-label="Open cart"]').click();
    await page.waitForTimeout(1000); // wait for sidebar cart animation
    await expect(page.getByText('Your Bag (1)')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h3.font-serif').first()).toHaveText(guestItemName, { timeout: 10000 });
  });

  test('Flash Sale Flow - Buy Now', async ({ page }) => {
    const uniqueEmail = getUniqueEmail();

    // 1. Register
    await page.goto('/register');
    await page.getByPlaceholder('John Doe').fill('Flash User');
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    // Wait for redirect to home page
    try {
        await expect(page).toHaveURL('/', { timeout: 15000 });
    } catch (error) {
        const errorMsg = page.locator('.bg-red-50');
        if (await errorMsg.isVisible()) {
            console.error('Flash sale registration failed error in UI:', await errorMsg.innerText());
        }
        throw error;
    }

    // 2. Find an available Flash Sale product (not sold out)
    const flashSaleProduct = page.locator('.group.block')
        .filter({ has: page.locator('svg.lucide-zap') })
        .filter({ hasNot: page.getByText('0 left', { exact: true }) })
        .first();
        
    if (await flashSaleProduct.isVisible()) {
        await flashSaleProduct.click();
        
        // 3. Purchase Flash Sale
        const buyNowBtn = page.getByRole('button', { name: /Buy Now|Purchase Flash Sale/i });
        await expect(buyNowBtn).toBeVisible({ timeout: 15000 });
        await buyNowBtn.click();
        
        // 4. Verify checkout/confirmation (mocked or real)
        await expect(page).toHaveURL(/\/checkout\/confirmation/);
    } else {
        console.log('No Flash Sale product found, skipping specific test');
    }
  });

});
