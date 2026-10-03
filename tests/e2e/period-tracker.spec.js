const { test: base, expect } = require('@playwright/test');

const test = base.extend({
  app: async ({ page }, use) => {
    const consoleErrors = [];
    page.on('pageerror', error => consoleErrors.push(error.message));
    page.on('response', response => {
      const pathname = new URL(response.url()).pathname;
      if (response.status() >= 400 && pathname !== '/favicon.ico') {
        consoleErrors.push(`HTTP ${response.status()} ${response.url()}`);
      }
    });
    page.on('requestfailed', request => {
      if (new URL(request.url()).pathname !== '/favicon.ico') {
        consoleErrors.push(`Request failed ${request.url()}: ${request.failure()?.errorText || 'unknown error'}`);
      }
    });
    page.on('console', message => {
      // Resource failures are checked with response/requestfailed so the
      // browser's generic message for its implicit missing favicon is ignored.
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Your cycle, in your own words.' })).toBeVisible();
    await use({ page, consoleErrors });

    expect(consoleErrors, 'browser console and uncaught page errors').toEqual([]);
  }
});

async function addPeriod(page, startDate, durationDays = '') {
  await page.getByLabel('Start date').fill(startDate);
  if (durationDays !== '') await page.locator('#duration').fill(String(durationDays));
  await page.getByRole('button', { name: 'Save period' }).click();
}

async function saveStatus(page, month, value) {
  await page.locator('#status-month').fill(month);
  await page.locator(`input[name="monthlyStatus"][value="${value}"]`).check();
  await page.getByRole('button', { name: 'Save monthly status' }).click();
}

test('loads the app, exposes main navigation, and changes calendar months', async ({ app }) => {
  const { page } = app;
  await expect(page).toHaveTitle('Menstrual Tracker');
  await expect(page.getByRole('heading', { name: 'Period calendar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Year summary' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();

  const monthInput = page.locator('#calendar-month');
  const initialMonth = await monthInput.inputValue();
  await page.getByRole('button', { name: 'Next month' }).click();
  const [year, month] = initialMonth.split('-').map(Number);
  const nextMonth = month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, '0')}`;
  await expect(monthInput).toHaveValue(nextMonth);
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(monthInput).toHaveValue(initialMonth);

  await page.getByRole('link', { name: 'Period records' }).click();
  await expect(page).toHaveURL(/#records-section$/);
  await expect(page.getByRole('button', { name: 'Save period' })).toBeEnabled();
});

test('adds and edits a period and marks its inclusive range on the calendar', async ({ app }) => {
  const { page } = app;
  await addPeriod(page, '2025-03-30', 4);

  await expect(page.locator('.record-card')).toHaveCount(1);
  await expect(page.locator('.record-card')).toContainText('Duration: 4 days');
  await expect(page.locator('.calendar-day.period-day')).toHaveText(['30', '31']);

  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.locator('.calendar-day.period-day')).toHaveText(['1', '2']);
  await page.getByRole('button', { name: 'Previous month' }).click();

  await page.getByRole('button', { name: /Edit period starting/ }).click();
  await expect(page.getByLabel('Start date')).toHaveValue('2025-03-30');
  await expect(page.locator('#duration')).toHaveValue('4');
  await page.getByLabel('Start date').fill('2025-04-05');
  await page.locator('#duration').fill('2');
  await page.getByRole('button', { name: 'Update period' }).click();

  await expect(page.locator('#calendar-month')).toHaveValue('2025-04');
  await expect(page.locator('.record-card')).toHaveCount(1);
  await expect(page.locator('.record-card')).toContainText('Duration: 2 days');
  await expect(page.locator('.calendar-day.period-day')).toHaveText(['5', '6']);
});

test('deletes a period only after confirmation', async ({ app }) => {
  const { page } = app;
  await addPeriod(page, '2025-06-12', 3);
  await expect(page.locator('.record-card')).toHaveCount(1);

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /Delete period starting/ }).click();

  await expect(page.locator('.record-card')).toHaveCount(0);
  await expect(page.locator('#period-list')).toContainText('No information recorded for this month.');
  await expect(page.locator('#app-message')).toContainText('Period record deleted.');
});

test('saves every monthly status and clears a month back to no information', async ({ app }) => {
  const { page } = app;
  await saveStatus(page, '2025-01', 'period_recorded');
  await saveStatus(page, '2025-02', 'period_did_not_arrive');
  await saveStatus(page, '2025-03', 'not_sure');
  await saveStatus(page, '2025-04', 'not_sure');
  await saveStatus(page, '2025-04', 'no_information_recorded');

  await expect(page.locator('#current-status')).toHaveText('April 2025: No information recorded');
  const statuses = await page.evaluate(() => JSON.parse(localStorage.getItem('periodTrackerData')).monthlyStatuses);
  expect(statuses).toEqual({
    '2025-01': 'period_recorded',
    '2025-02': 'period_did_not_arrive',
    '2025-03': 'not_sure'
  });
});

test('shows correct yearly counts and updates the chart when statuses change', async ({ app }) => {
  const { page } = app;
  await addPeriod(page, '2025-01-14', 2);
  await saveStatus(page, '2025-02', 'period_did_not_arrive');
  await saveStatus(page, '2025-03', 'not_sure');
  await saveStatus(page, '2025-04', 'period_recorded');
  await page.locator('#summary-year').selectOption('2025');

  await expect(page.locator('#tracked-months')).toHaveText('4');
  await expect(page.locator('#arrived-months')).toHaveText('2');
  await expect(page.locator('#missed-months')).toHaveText('1');
  await expect(page.locator('#unsure-months')).toHaveText('1');
  await expect(page.locator('#unknown-months')).toHaveText('8');

  const chart = page.locator('#year-chart');
  await expect(chart).toHaveClass(/has-data/);
  await expect(chart).toHaveAttribute('aria-label', 'Among 3 months marked arrived or did not arrive, 2 period arrived and 1 period didn\'t arrive');
  await expect(chart).toHaveCSS('--arrived-share', '67%');
  await expect.poll(() => chart.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('conic-gradient');

  await saveStatus(page, '2025-02', 'period_recorded');
  await page.locator('#summary-year').selectOption('2025');
  await expect(page.locator('#arrived-months')).toHaveText('3');
  await expect(page.locator('#missed-months')).toHaveText('0');
  await expect(chart).toHaveAttribute('aria-label', 'Among 3 months marked arrived or did not arrive, 3 period arrived and 0 period didn\'t arrive');
  await expect(chart).toHaveCSS('--arrived-share', '100%');
});

test('rejects a blank date and invalid duration without saving data', async ({ app }) => {
  const { page } = app;
  await page.getByRole('button', { name: 'Save period' }).click();
  await expect(page.locator('#period-error')).toHaveText('Enter a valid start date.');
  await expect(page.getByLabel('Start date')).toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel('Start date').fill('2025-07-08');
  await page.locator('#duration').fill('1.5');
  await page.getByRole('button', { name: 'Save period' }).click();
  await expect(page.locator('#period-error')).toHaveText('Enter a positive whole number of days, or leave duration blank if unknown.');
  await expect(page.locator('#duration')).toHaveAttribute('aria-invalid', 'true');

  await page.locator('#duration').fill('0');
  await page.getByRole('button', { name: 'Save period' }).click();
  await expect(page.locator('#period-error')).toContainText('positive whole number');
  const savedData = await page.evaluate(() => localStorage.getItem('periodTrackerData'));
  expect(savedData).toBeNull();
});

test('keeps a period record and monthly status after a page refresh', async ({ app }) => {
  const { page } = app;
  await addPeriod(page, '2025-08-16', 3);
  await saveStatus(page, '2025-08', 'not_sure');
  await page.reload();

  await page.locator('#calendar-month').fill('2025-08');
  await expect(page.locator('.record-card')).toHaveCount(1);
  await expect(page.locator('.record-card')).toContainText('Duration: 3 days');
  await expect(page.locator('#current-status')).toHaveText('August 2025: Not sure');
});

test('remains usable at a 390px mobile viewport without horizontal overflow', async ({ app }) => {
  const { page } = app;
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Period calendar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await addPeriod(page, '2025-09-04', 2);
  await expect(page.locator('.record-card')).toHaveCount(1);
  await saveStatus(page, '2025-09', 'not_sure');
  await expect(page.locator('#current-status')).toHaveText('September 2025: Not sure');
});

test('keeps the desktop layout within the viewport and primary controls usable', async ({ app }) => {
  const { page } = app;
  await page.setViewportSize({ width: 1440, height: 960 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Save period' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save monthly status' })).toBeEnabled();
  await expect(page.locator('#summary-year')).toBeEnabled();
  await page.locator('#summary-year').selectOption({ label: await page.locator('#summary-year option').first().textContent() });
});
