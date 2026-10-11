import { test, expect } from '@playwright/test';
import { generators } from '../../src/geometry/registry';
import { readFile } from 'node:fs/promises';
test('Hebrew catalog has all images, search, category filters and available models', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.model-card')).toHaveCount(327);
  const search = page.getByRole('textbox', { name: 'חיפוש לפי קוד או שם' });
  await search.fill('0436.1');
  await expect(page.locator('.model-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'פתיחת דגם 0436.1', exact: true }).click();
  await expect(page.getByText('דגם לעיון בלבד', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toHaveCount(0);
  await page.getByRole('button', { name: 'בחירת דגם אחר', exact: true }).click();
  await page.getByRole('checkbox', { name: /דגמים עם מחולל/ }).check();
  await expect(page.locator('.model-card')).toHaveCount(Object.keys(generators).length);
  await page.getByRole('button', { name: /מחיצות ורכיבי פנים/ }).click();
  await expect(page.locator('.model-card')).toHaveCount(
    Object.keys(generators).filter((id) => id.startsWith('09')).length,
  );
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
    .toBe(327);
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
for (const category of [...new Set(Object.keys(generators).map((code) => code.slice(0, 2)))]) {
  test(`category ${category}: every beta model renders and downloads its SVG`, async ({ page }) => {
    test.setTimeout(60000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const code of Object.keys(generators).filter((code) => code.startsWith(category))) {
      await test.step(code, async () => {
        await page.goto(`/#/model/${code}`);
        await expect(page.locator('.dieline-canvas')).toBeVisible();
        await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeEnabled();
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        await page.getByRole('button', { name: 'הורדת SVG' }).click();
        const download = await downloadPromise;
        expect(await download.failure()).toBeNull();
        const svg = await readFile((await download.path())!, 'utf8');
        expect(svg).toContain('id="CUT"');
        expect(svg).toContain(`"code":"${code}"`.replaceAll('"', '&quot;'));
        expect(errors).toEqual([]);
      });
    }
  });
}
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
test('sheet totals and grid counts have model-specific editable constraints', async ({ page }) => {
  await page.goto('/#/model/0112');
  await page.getByLabel('רוחב לוח 1').fill('120');
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeDisabled();
  await page.getByLabel('רוחב לוח 1').fill('30');
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeEnabled();
  await page.goto('/#/model/0935');
  const rows = page.getByLabel('לוחות לאורך');
  await expect(rows).toHaveAttribute('max', '12');
  await rows.fill('3');
  await page.getByLabel('לוחות רוחב בגובה מלא').fill('2');
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeEnabled();
  await page.getByLabel('לוחות רוחב בגובה מלא').fill('4');
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeDisabled();
  await page.goto('/#/model/0965');
  await expect(page.getByText('חיתוך חלקי', { exact: true })).toBeVisible();
});

test('book pillow closure exposes relevant controls and exports a distinct tuck dieline', async ({
  page,
}) => {
  await page.goto('/#/model/SPD-pillow-pack');
  await expect(page.getByLabel('רוחב לשונית סגירה')).toHaveCount(0);
  await page.getByLabel('סגירה: 0 הדבקה, 1 לשונית').fill('1');
  await expect(page.getByLabel('רוחב לשונית סגירה')).toBeVisible();
  await page.getByLabel('רוחב לשונית סגירה').fill('35');
  await page.getByLabel('עומק קשת').fill('20');
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeEnabled();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'הורדת SVG' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/^SPD-pillow-pack_/);
  const svg = await readFile((await download.path())!, 'utf8');
  expect(svg).toContain('Structural Package Designs');
  expect(svg).toContain('&quot;closureVariant&quot;:1');
  expect(svg).toContain('&quot;tabWidth&quot;:35');
});

test('retail product grids update and block colliding apertures', async ({ page }) => {
  await page.goto('/#/model/0847');
  await page.getByLabel('מספר עמודות').fill('4');
  await page.getByLabel('מספר מדפים').fill('4');
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeEnabled();
  await page.getByLabel('קוטר פתח מוצר').fill('100');
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeDisabled();
  await page.getByLabel('קוטר פתח מוצר').fill('12');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'הורדת SVG' }).click();
  const downloaded = await pending;
  const svg = await readFile((await downloaded.path())!, 'utf8');
  expect(svg).toContain('&quot;columns&quot;:4');
  expect(svg).toContain('data-part="support-2"');
  expect(svg).toContain('data-part="shelf-4"');
});

test('retail staircase counts and shipping opening strips export editable constructions', async ({
  page,
}) => {
  await page.goto('/#/model/0870');
  await page.getByLabel('מספר מדרגות').fill('4');
  await page.getByLabel('גובה מדרגה').fill('35');
  await expect(page.getByRole('button', { name: 'הורדת SVG' })).toBeEnabled();
  const stairPending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'הורדת SVG' }).click();
  const stairs = await stairPending;
  expect(await readFile((await stairs.path())!, 'utf8')).toContain('&quot;steps&quot;:4');
  await page.goto('/#/model/0886');
  await page.getByLabel('רוחב פס הדבקה').fill('14');
  await page.getByLabel('רוחב רצועת פתיחה').fill('10');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'הורדת SVG' }).click();
  const shipping = await pending;
  const svg = await readFile((await shipping.path())!, 'utf8');
  expect(svg).toContain('id="TEAR"');
  expect(svg).toContain('&quot;sealWidth&quot;:14');
  expect(svg).toContain('&quot;tearWidth&quot;:10');
});
