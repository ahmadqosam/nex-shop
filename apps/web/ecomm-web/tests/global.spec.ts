import { test, expect } from '@playwright/test';

test('Global Application Flow', async ({ page }) => {
  // 1. Go to Home
  await page.goto('/');
  await expect(page).toHaveTitle(/Nex Luxury Audio/);
  await expect(page.getByText(/Flash Sale/)).toBeVisible();

  // 2. Navigate to /products via Navbar
  const productsLink = page.getByRole('link', { name: 'Products' }).first();
  await expect(productsLink).toBeVisible();
  await productsLink.click({ force: true });
  await page.waitForURL('/products');
  
  // 3. Click first product in list - wait for products to render
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500); // Allow React hydration
  const productLink = page.locator('a[href^="/product/"]').first();
  await expect(productLink).toBeVisible({ timeout: 15000 });
  await productLink.click({ force: true });
  
  // 4. Wait for Product Detail Page to fully load
  await page.waitForURL(/\/product\//);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500); // Allow React hydration
  
  // 5. Find and click Add to Bag button
  const addToBagBtn = page.locator('button:has-text("Add to Bag")');
  await expect(addToBagBtn).toBeVisible({ timeout: 15000 });
  await addToBagBtn.click({ force: true });
  
  // 6. Cart should open - wait for the sidebar to appear
  await expect(page.getByText('Your Bag')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(500); // Wait for cart state to settle
  
  // 7. Proceed to Checkout
  const checkoutBtn = page.locator('button:has-text("Checkout Now")');
  await expect(checkoutBtn).toBeVisible({ timeout: 15000 });
  await checkoutBtn.click({ force: true });
  await page.waitForURL('/checkout');
  
  // 8. Fill Checkout Form - use input selectors since labels aren't associated
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // Wait for form to render
  
  // Get all text inputs in the shipping section (first 5 inputs)
  const textInputs = page.locator('input[type="text"]');
  await expect(textInputs.first()).toBeVisible({ timeout: 15000 });
  
  // Fill shipping info: First Name, Last Name, Address, City, ZIP Code
  await textInputs.nth(0).fill('John');  // First Name
  await textInputs.nth(1).fill('Doe');   // Last Name
  await textInputs.nth(2).fill('123 Main St'); // Address
  await textInputs.nth(3).fill('New York'); // City
  await textInputs.nth(4).fill('10001'); // ZIP Code
  
  // Fill payment info
  await page.getByPlaceholder('0000 0000 0000 0000').fill('4111111111111111'); // Card Number
  await page.getByPlaceholder('MM/YY').fill('12/25'); // Expiry
  await page.getByPlaceholder('123').fill('123'); // CVC
  
  // 9. Submit
  const payBtn = page.locator('button:has-text("Pay")');
  await payBtn.click({ force: true });
  
  // 10. Success
  await expect(page.getByText('Processing Securely...')).toBeVisible();
  await expect(page.getByText('Order Confirmed!')).toBeVisible({ timeout: 15000 });
  
  // 11. Back to Home
  const backHomeBtn = page.locator('button:has-text("Back to Home")');
  await backHomeBtn.click({ force: true });
  await expect(page).toHaveURL('/');
});
