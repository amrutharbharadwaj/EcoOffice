# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: desk-booking-flow.spec.ts >> Complete Desk Booking Flow >> register → login → view availability → select desk → book → verify confirmation
- Location: e2e\desk-booking-flow.spec.ts:17:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/login/
Received string:  "http://localhost:5173/register"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × unexpected value "http://localhost:5173/register"

```

```yaml
- heading "Create an Account" [level=1]
- alert: Internal Server Error
- text: Email
- textbox "Email":
  - /placeholder: you@example.com
  - text: e2e-1781511217793@testuser.com
- text: Name
- textbox "Name":
  - /placeholder: Your full name
  - text: E2E Test User
- text: Password
- textbox "Password":
  - /placeholder: At least 8 characters
  - text: SecurePass123!
- button "Create Account"
- paragraph:
  - text: Already have an account?
  - link "Sign In":
    - /url: /login
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * End-to-end test: Complete Desk Booking Flow
  5  |  *
  6  |  * Validates: Requirement 15.3
  7  |  * Flow: Register user → Login → View desk availability → Select desk → Confirm booking → Verify confirmation
  8  |  */
  9  | 
  10 | const TEST_USER = {
  11 |   email: `e2e-${Date.now()}@testuser.com`,
  12 |   name: 'E2E Test User',
  13 |   password: 'SecurePass123!',
  14 | };
  15 | 
  16 | test.describe('Complete Desk Booking Flow', () => {
  17 |   test('register → login → view availability → select desk → book → verify confirmation', async ({
  18 |     page,
  19 |   }) => {
  20 |     // Step 1: Register a new user
  21 |     await test.step('Register a new user account', async () => {
  22 |       await page.goto('/register');
  23 |       await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
  24 | 
  25 |       await page.getByLabel('Email').fill(TEST_USER.email);
  26 |       await page.getByLabel('Name').fill(TEST_USER.name);
  27 |       await page.getByLabel('Password').fill(TEST_USER.password);
  28 |       await page.getByRole('button', { name: /create account/i }).click();
  29 | 
  30 |       // After successful registration, should redirect to login page
> 31 |       await expect(page).toHaveURL(/\/login/);
     |                          ^ Error: expect(page).toHaveURL(expected) failed
  32 |     });
  33 | 
  34 |     // Step 2: Login with the registered user
  35 |     await test.step('Login with registered credentials', async () => {
  36 |       await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  37 | 
  38 |       await page.getByLabel('Email').fill(TEST_USER.email);
  39 |       await page.getByLabel('Password').fill(TEST_USER.password);
  40 |       await page.getByRole('button', { name: /sign in/i }).click();
  41 | 
  42 |       // After successful login, should redirect to desks page
  43 |       await expect(page).toHaveURL(/\/desks/);
  44 |     });
  45 | 
  46 |     // Step 3: View desk availability
  47 |     await test.step('View desk availability on the desk booking page', async () => {
  48 |       await expect(page.getByRole('heading', { name: /desk booking/i })).toBeVisible();
  49 | 
  50 |       // The date picker should be visible with today's date pre-selected
  51 |       await expect(page.getByLabelText(/booking date/i)).toBeVisible();
  52 | 
  53 |       // Wait for desk availability to load (either desks appear or empty state)
  54 |       await expect(
  55 |         page.getByRole('button', { name: /desk/i }).first().or(
  56 |           page.getByText(/no desks available/i)
  57 |         )
  58 |       ).toBeVisible({ timeout: 10_000 });
  59 |     });
  60 | 
  61 |     // Step 4: Select an available desk
  62 |     await test.step('Select an available desk from the floor map', async () => {
  63 |       // Find an available desk button (not disabled) and click it
  64 |       const availableDesk = page.getByRole('button', { name: /available/i }).first();
  65 | 
  66 |       // If no desks are available, skip the booking steps
  67 |       const deskCount = await availableDesk.count();
  68 |       if (deskCount === 0) {
  69 |         test.skip(true, 'No available desks to book — skipping booking steps');
  70 |         return;
  71 |       }
  72 | 
  73 |       await availableDesk.click();
  74 | 
  75 |       // Booking confirmation dialog should appear
  76 |       await expect(page.getByRole('dialog')).toBeVisible();
  77 |       await expect(page.getByText(/confirm booking/i)).toBeVisible();
  78 |     });
  79 | 
  80 |     // Step 5: Confirm the booking
  81 |     await test.step('Confirm the desk booking', async () => {
  82 |       const confirmButton = page.getByRole('button', { name: /confirm/i });
  83 |       await expect(confirmButton).toBeVisible();
  84 |       await confirmButton.click();
  85 |     });
  86 | 
  87 |     // Step 6: Verify booking confirmation
  88 |     await test.step('Verify booking success notification', async () => {
  89 |       // The success notification should appear
  90 |       await expect(page.getByRole('alert').filter({ hasText: /successfully booked/i })).toBeVisible({
  91 |         timeout: 10_000,
  92 |       });
  93 | 
  94 |       // The dialog should be closed
  95 |       await expect(page.getByRole('dialog')).not.toBeVisible();
  96 |     });
  97 |   });
  98 | });
  99 | 
```