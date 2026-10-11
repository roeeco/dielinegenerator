import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('Hebrew catalog has all images, search, category filters and available models', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.model-card')).toHaveCount(325);
  const search = page.getByRole('textbox', { name: 'חיפוש לפי קוד או שם' });
  await search.fill('0436.1');
  await expect(page.locator('.model-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'פתיחת דגם 0436.1', exact: true }).click();
  await expect(page.getByText('דגם לעיון בלבד', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toHaveCount(0);
  await page.getByRole('button', { name: 'בחירת דגם אחר', exact: true }).click();
  await page.getByRole('checkbox', { name: /דגמים עם מחולל/ }).check();
  await expect(page.locator('.model-card')).toHaveCount(10);
  await page.getByRole('button', { name: /מחיצות ורכיבי פנים/ }).click();
  await expect(page.locator('.model-card')).toHaveCount(4);
  await page.getByRole('button', { name: 'כל הדגמים', exact: true }).click();
  await search.fill('does not exist');
  await expect(page.getByText('לא נמצאו דגמים')).toBeVisible();
  await page.getByRole('button', { name: 'איפוס מסננים' }).click();
  expect(errors).toEqual([]);
  const images = page.locator('.model-image img');
  await images.evaluateAll((imgs) =>
    imgs.forEach((img) => {
      (img as HTMLImageElement).loading = 'eager';
    }),
  );
  await expect
    .poll(() =>
      images.evaluateAll(
        (imgs) =>
          imgs.filter(
            (img) =>
              (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
          ).length,
      ),
    )
    .toBe(325);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('dimension edits update the SVG immediately, invalid edits block export, downloaded SVG is mechanical', async ({
  page,
}) => {
  await page.goto('/#/model/0201');
  const dimension = page.getByLabel('אורך', { exact: true });
  const before = await page.locator('.dieline-canvas path').first().getAttribute('d');
  await dimension.fill('300');
  await expect(page.locator('.dieline-canvas path').first()).not.toHaveAttribute('d', before!);
  await expect(page.getByTestId('blank-size')).toContainText('862');
  await dimension.fill('');
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeDisabled();
  await expect(page.getByText('נדרשות מידות תקינות')).toBeVisible();
  await dimension.fill('250');
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeEnabled();
  await page.getByRole('button', { name: 'הגדלת תצוגה' }).click();
  const zoomed = await page.locator('.dieline-canvas').getAttribute('viewBox');
  await page.getByRole('button', { name: 'התאמת פריסה למסך' }).click();
  await expect(page.locator('.dieline-canvas')).not.toHaveAttribute('viewBox', zoomed!);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'הורדת SVG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('FEFCO_0201_250x120x80_t1.0.svg');
  const svg = await readFile((await download.path())!, 'utf8');
  expect(svg).toContain('width="762mm"');
  expect(svg).toContain('id="CUT"');
  expect(svg).toContain('id="CREASE"');
  expect(svg).not.toMatch(/stroke-dasharray|<text|<image|transform=/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('all beta models render and export, including lid and panel-count family', async ({
  page,
}) => {
  for (const code of [
    '0201',
    '0204',
    '0300',
    '0401',
    '0453',
    '0501',
    '0901',
    '0902',
    '0910',
    '0982',
  ]) {
    await page.goto(`/#/model/${code}`);
    await expect(page.locator('.dieline-canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeEnabled();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'הורדת SVG' }).click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
  }
});
test('partition family supports the code range and model-specific fields', async ({ page }) => {
  await page.goto('/#/model/0999');
  await expect(page.getByLabel('מספר לוחות כולל')).toHaveValue('19');
  await expect(page.getByText('FEFCO 0999', { exact: true })).toBeVisible();
  await page.getByLabel('מספר לוחות כולל').fill('4');
  await page.getByLabel('לוחות לאורך').fill('2');
  await expect(page.getByText('FEFCO 0984', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeEnabled();
  await page.getByLabel('לוחות לאורך').fill('4');
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeDisabled();
  await page.goto('/#/model/0901');
  await expect(page.getByLabel('גובה', { exact: true })).toHaveCount(0);
  await expect(page.getByText('הגדרות חומר והתאמה', { exact: true })).toHaveCount(0);
});
