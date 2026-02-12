import { test, expect } from '@playwright/test';

test('Global Application Flow', async ({ page }) => {
  page.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));
  const uniqueEmail = `global-test-${Date.now()}@example.com`;
  
  // 0. Register first (required for checkout)
  await page.goto('/register');
  await page.getByPlaceholder('John Doe').fill('Global User');
  await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
  await page.getByPlaceholder('••••••••').fill('Password123!');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL('/');

  // 1. Go to Home
  await page.goto('/');
  await expect(page).toHaveTitle(/Nex Luxury Audio/);
  await expect(page.getByText(/Flash Sale/).first()).toBeVisible();

  // 2. Navigate to /products via Navbar
  const productsLink = page.locator('nav').getByRole('link', { name: 'Products' });
  await expect(productsLink).toBeVisible({ timeout: 10000 });
  await productsLink.click({ force: true });
  await page.waitForURL('/products');
  
  // 3. Click first non-flash-sale product in list
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // Allow React hydration
  const productLink = page.locator('.group.block').filter({ hasNot: page.locator('svg.lucide-zap') }).first();
  await expect(productLink).toBeVisible({ timeout: 15000 });
  await productLink.click({ force: true });
  
  // 4. Wait for Product Detail Page to fully load
  await page.waitForURL(/\/product\//);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  
  // 5. Find and click Add to Bag button
  const addToBagBtn = page.getByRole('button', { name: /Add to Bag/i });
  await expect(addToBagBtn).toBeVisible({ timeout: 15000 });
  await addToBagBtn.click({ force: true });
  
  // 6. Cart should open
  await page.waitForTimeout(1000); // Wait for sidebar animation
  await expect(page.getByText(/Your Bag/i).first()).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(500);
  
  // 7. Proceed to Checkout
  const checkoutBtn = page.getByRole('button', { name: /Checkout Now/i });
  await expect(checkoutBtn).toBeVisible({ timeout: 15000 });
  await checkoutBtn.click({ force: true });
  await page.waitForURL('/checkout');
  
  // 8. Fill Checkout Form
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => window.scrollTo(0, 0)); // Ensure top is visible
  
  await page.getByPlaceholder(/e.g. Eduard/i).fill('John');
  await page.getByPlaceholder(/e.g. Franz/i).fill('Doe');
  await page.locator('input[type="text"]').nth(2).fill('5551234567'); // Phone
  
  // Address & Zip
  await page.getByPlaceholder(/Royal Ln/i).fill('123 Main St');
  await page.getByPlaceholder(/45463/i).fill('10001');
  
  // Fill payment info
  await page.getByPlaceholder('0000 0000 0000 0000').fill('4111111111111111');
  await page.getByPlaceholder(/MM \/ YY/i).fill('12/25');
  await page.getByPlaceholder('***').fill('123');
  await page.getByPlaceholder(/name on card/i).fill('JOHN DOE');
  
  // 9. Agree to terms and Submit
  await page.locator('input[type="checkbox"]').check({ force: true });
  await page.waitForTimeout(1000); // wait for checkout button to be enabled
  const checkoutButton = page.getByRole('button', { name: /Checkout/i }).last(); // The one in OrderSummary
  await checkoutButton.click({ force: true });
  
  // 10. Success
  await page.waitForTimeout(2000);
  await expect(page.getByText('Order Confirmed')).toBeVisible({ timeout: 20 * 1000 });
  
  // 11. Back to Home
  const backHomeBtn = page.getByRole('button', { name: /Continue Shopping/i });
  await backHomeBtn.click({ force: true });
  await expect(page).toHaveURL('/');
});
