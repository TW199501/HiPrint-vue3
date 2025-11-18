import { test, expect } from '@playwright/test';

const PREVIEW_BUTTON = 'button:has-text("預覽")';

test.describe('Designer preview flow', () => {
  test('opens preview modal from default template', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('拖拽組件')).toBeVisible();

    await page.waitForFunction(() => document.querySelector('#hiprint-printTemplate .hiprint-printPaper') !== null);
    await page.click(PREVIEW_BUTTON);

    const modal = page.locator('.ant-modal');
    await modal.waitFor({ state: 'visible' });

    const htmlContent = await page.locator('.preview-container').innerHTML();
    expect(htmlContent.trim().length).toBeGreaterThan(0);

    await page.click('.ant-modal-footer .ant-btn');
    await expect(modal).toBeHidden();
  });
});
