import { test, expect } from '@playwright/test';

test.describe('Product Flow', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));
    });

    test('Products Load and Navigation Works', async ({ page }) => {
        // Go to products page
        await page.goto('/products');
        
        // Wait for loading to finish
        await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

        // Check if products are displayed
        const productCards = page.locator('a[href^="/product/"]');
        await expect(productCards.first()).toBeVisible();
        
        // Get info of first product
        const firstCard = productCards.first();
        const productName = await firstCard.locator('h3').textContent();
        console.log(`Testing with product: ${productName}`);
        
        // Click first product
        await firstCard.click();

        // Verify navigation
        await expect(page).toHaveURL(/\/product\/.+/);

        // Verify details page
        // Wait for loading on detail page
        await expect(page.getByRole('status')).not.toBeVisible({ timeout: 10000 });
        await expect(page.locator('h1')).toHaveText(productName!); 
        
        // Handle Flash Sale vs Normal
        const addBtn = page.getByRole('button', { name: /Add to Bag/i });
        const flashBtn = page.getByRole('button', { name: /Purchase Flash Sale|Buy Now/i });
        
        await expect(addBtn.or(flashBtn)).toBeVisible();
    });

     test('Add to Cart Flow', async ({ page }) => {
          await page.goto('/products');
          await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
          
          // Select a non-flash sale product for "Add to Bag" testing
          // Look for product cards (a[href^="/product/"]) that DON'T have a zap icon (flash sale)
          const productCard = page.locator('a[href^="/product/"]').filter({ 
              hasNot: page.locator('svg.lucide-zap') 
          }).first();
          
          await expect(productCard).toBeVisible({ timeout: 10000 });
          let productName = await productCard.locator('h3').textContent();
          productName = productName?.trim() || '';
          await productCard.click();
 
          // Wait for loading on detail page
          await expect(page.getByRole('status')).not.toBeVisible({ timeout: 10000 });
 
          // Add to cart
          const addToBagBtn = page.getByRole('button', { name: /Add to Bag/i });
          await expect(addToBagBtn).toBeVisible({ timeout: 10000 });
          await addToBagBtn.click();
 
          // Verify cart drawer opens
          const sidebar = page.getByRole('heading', { name: /Your Bag/i }).locator('..'); // Parent container of heading
          await expect(page.getByText(/Your Bag/i).first()).toBeVisible({ timeout: 15000 });
          
          // Verify item in cart - find the name inside an h3 in the sidebar
          console.log(`Searching in cart for product: "${productName}"`);
          // The sidebar has h3 for item names. Let's look for it globally first within the page but only if visible.
          // Or use the Your Bag heading as a landmark if possible.
          const cartItem = page.locator('h3').filter({ hasText: new RegExp(productName, 'i') }).first();
          await expect(cartItem).toBeVisible({ timeout: 15000 });
          
          await expect(page.getByRole('button', { name: 'Checkout Now' })).toBeVisible();
     });
});
