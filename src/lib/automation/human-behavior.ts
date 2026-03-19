import { Page } from "playwright";

/**
 * Human behavior simulation for Playwright.
 * Helps evade bot detection by introducing randomness and natural movements.
 */

/**
 * Wait for a random duration between min and max milliseconds.
 */
export async function randomWait(min: number = 1000, max: number = 3000) {
  const duration = Math.floor(Math.random() * (max - min)) + min;
  await new Promise((resolve) => setTimeout(resolve, duration));
}

/**
 * Simulate smooth mouse movement to an element and then click.
 */
export async function smoothMoveAndClick(page: Page, selector: string) {
  const element = page.locator(selector).first();
  const box = await element.boundingBox();
  
  if (box) {
    // Move to a random point within the element's box
    const x = box.x + box.width * Math.random();
    const y = box.y + box.height * Math.random();
    
    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
    await randomWait(200, 500);
    await element.click();
  } else {
    // Fallback to simple click if box not found
    await element.click();
  }
}

/**
 * Simulate human-like scrolling.
 */
export async function humanScroll(page: Page, distance: number = 500) {
  const steps = Math.floor(Math.random() * 5) + 3;
  const chunk = distance / steps;
  
  for (let i = 0; i < steps; i++) {
    const jitter = (Math.random() - 0.5) * 50;
    await page.mouse.wheel(0, chunk + jitter);
    await randomWait(100, 400);
  }
}

/**
 * Human-like typing with random per-character delays.
 */
export async function humanType(page: Page, selector: string, text: string) {
  const element = page.locator(selector).first();
  await element.click();
  
  for (const char of text) {
    await element.pressSequentially(char, {
      delay: Math.floor(Math.random() * 100) + 50,
    });
  }
}
