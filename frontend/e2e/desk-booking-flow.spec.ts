import { test, expect } from '@playwright/test';

/**
 * End-to-end test: Complete Desk Booking Flow
 *
 * Validates: Requirement 15.3
 * Flow: Register user → Login → View desk availability → Select desk → Confirm booking → Verify confirmation
 */

const TEST_USER = {
  email: `e2e-${Date.now()}@testuser.com`,
  name: 'E2E Test User',
  password: 'SecurePass123!',
};

test.describe('Complete Desk Booking Flow', () => {
  test('register → login → view availability → select desk → book → verify confirmation', async ({
    page,
  }) => {
    // Step 1: Register a new user
    await test.step('Register a new user account', async () => {
      await page.goto('/register');
      await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

      await page.getByLabel('Email').fill(TEST_USER.email);
      await page.getByLabel('Name').fill(TEST_USER.name);
      await page.getByLabel('Password').fill(TEST_USER.password);
      await page.getByRole('button', { name: /create account/i }).click();

      // After successful registration, should redirect to login page
      await expect(page).toHaveURL(/\/login/);
    });

    // Step 2: Login with the registered user
    await test.step('Login with registered credentials', async () => {
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

      await page.getByLabel('Email').fill(TEST_USER.email);
      await page.getByLabel('Password').fill(TEST_USER.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // After successful login, should redirect to desks page
      await expect(page).toHaveURL(/\/desks/);
    });

    // Step 3: View desk availability
    await test.step('View desk availability on the desk booking page', async () => {
      await expect(page.getByRole('heading', { name: /desk booking/i })).toBeVisible();

      // The date picker should be visible with today's date pre-selected
      await expect(page.getByLabelText(/booking date/i)).toBeVisible();

      // Wait for desk availability to load (either desks appear or empty state)
      await expect(
        page.getByRole('button', { name: /desk/i }).first().or(
          page.getByText(/no desks available/i)
        )
      ).toBeVisible({ timeout: 10_000 });
    });

    // Step 4: Select an available desk
    await test.step('Select an available desk from the floor map', async () => {
      // Find an available desk button (not disabled) and click it
      const availableDesk = page.getByRole('button', { name: /available/i }).first();

      // If no desks are available, skip the booking steps
      const deskCount = await availableDesk.count();
      if (deskCount === 0) {
        test.skip(true, 'No available desks to book — skipping booking steps');
        return;
      }

      await availableDesk.click();

      // Booking confirmation dialog should appear
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/confirm booking/i)).toBeVisible();
    });

    // Step 5: Confirm the booking
    await test.step('Confirm the desk booking', async () => {
      const confirmButton = page.getByRole('button', { name: /confirm/i });
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();
    });

    // Step 6: Verify booking confirmation
    await test.step('Verify booking success notification', async () => {
      // The success notification should appear
      await expect(page.getByRole('alert').filter({ hasText: /successfully booked/i })).toBeVisible({
        timeout: 10_000,
      });

      // The dialog should be closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });
});
