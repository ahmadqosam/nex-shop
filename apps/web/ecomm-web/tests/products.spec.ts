import { test, expect } from '@playwright/test';

test.describe('Product Flow', () => {
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
        await expect(page.getByRole('button', { name: /Add to Bag/i })).toBeVisible();
    });

    test('Add to Cart Flow', async ({ page }) => {
         await page.goto('/products');
         await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
         
         const firstCard = page.locator('a[href^="/product/"]').first();
         const productName = await firstCard.locator('h3').textContent();
         await firstCard.click();

         // Wait for loading on detail page
         await expect(page.getByRole('status')).not.toBeVisible({ timeout: 10000 });

         // Add to cart
         const addToBagBtn = page.getByRole('button', { name: /Add to Bag/i });
         await expect(addToBagBtn).toBeVisible();
         await addToBagBtn.click();

         // Verify cart drawer opens
         await expect(page.getByText(/Your Bag/)).toBeVisible();
         
         // Verify item in cart
         // Use a more specific locator if possible, or just text
         // The productName should be visible in the cart sidebar
         // We might match multiple if the product name is generic or repeated, but usually safe for this verification
         await expect(page.locator('div[class*="fixed"]').getByText(productName!)).toBeVisible();
         await expect(page.getByRole('button', { name: 'Checkout Now' })).toBeVisible();
    });
});
