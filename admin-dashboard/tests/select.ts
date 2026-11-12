import type { Locator } from '@playwright/test';

/**
 * Choose an option by value in a react-select based <Select> (src/components/ui/Select.tsx).
 * `field` may be the combobox (e.g. getByLabel) or any element wrapping the control.
 */
export async function pick(field: Locator, value: string) {
  const control = field.locator('xpath=ancestor-or-self::*[contains(@class,"rs__control")]').or(field.locator('.rs__control')).first();
  await control.click();
  await field.page().locator(`[data-value="${value.replace(/"/g, '\\"')}"]`).click();
}
