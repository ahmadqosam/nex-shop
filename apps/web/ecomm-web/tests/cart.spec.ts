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
    // Click first product card
    await page.locator('a[href^="/product/"]').first().click();
    
    // 2. Add to Cart
    await expect(page.getByRole('button', { name: /Add to Bag/i })).toBeVisible();
    await page.getByRole('button', { name: /Add to Bag/i }).click();

    // 3. Verify Cart Sidebar opens
    const cartSidebar = page.locator('div.fixed.inset-0.z-\\[200\\]');
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
    await expect(page).toHaveURL('/');

    // 2. Add to Cart
    await page.locator('a[href^="/product/"]').first().click();
    await page.getByRole('button', { name: /Add to Bag/i }).click();
    await expect(page.getByText('Your Bag (1)')).toBeVisible();
    
    // Close cart
    await page.locator('button[aria-label="Close cart"]').click();

    // 3. Logout
    // Assuming profile page has logout for now, or use API?
    // Let's try to access profile page
    await page.goto('/profile'); 
    await expect(page).toHaveURL('/profile');
    
    // Check if logout button exists
    const logoutBtn = page.getByRole('button', { name: /Log out/i });
    if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
    } else {
        // Fallback: Use profile icon in navbar if profile page is not fully implemented
        // But we are on profile page.
        // Let's assume there is a logout button there.
        // If fails, we might need to Inspect Profile page.
    }
    
    // Wait for redirect to login or home
    await expect(page).toHaveURL('/login');

    // 4. Login again
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/');

    // 5. Open Cart and Verify
    await page.locator('button[aria-label="Open cart"]').click();
    await expect(page.getByText('Your Bag (1)')).toBeVisible();
  });

  test('Merge Cart Flow - Guest to Registered', async ({ page }) => {
    const uniqueEmail = getUniqueEmail();

    // 1. Add item as Guest
    await page.goto('/');
    await page.locator('a[href^="/product/"]').first().click();
    await page.getByRole('button', { name: /Add to Bag/i }).click();
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
    await expect(page).toHaveURL('/');

    // 3. Open Cart and Verify Item is there
    await page.locator('button[aria-label="Open cart"]').click();
    
    await expect(page.getByText('Your Bag (1)')).toBeVisible();
    await expect(page.locator('h3.font-serif').first()).toHaveText(guestItemName);
  });

});
