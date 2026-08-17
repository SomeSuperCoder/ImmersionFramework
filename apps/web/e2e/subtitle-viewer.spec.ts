import { test, expect } from '@playwright/test';

const VALID_YT_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const NO_CAPTIONS_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

// ---------- Test 1: Happy path ----------
test.describe('Happy path — load video and see subtitles', () => {
  test('loads a video and displays subtitle cues', async ({ page }) => {
    await page.goto('/');

    // Enter a valid YouTube URL
    const urlInput = page.getByRole('textbox', { name: /url|video|youtube/i });
    await urlInput.fill(VALID_YT_URL);

    // Click Load
    const loadBtn = page.getByRole('button', { name: /load/i });
    await loadBtn.click();

    // Wait for the video player to appear
    const player = page.locator('iframe[src*="youtube"], iframe[src*="youtu.be"]');
    await expect(player).toBeVisible({ timeout: 15_000 });

    // Wait for subtitle display to show cues
    const subtitlePanel = page.locator('[class*="subtitle"], [class*="cue"], [data-testid*="subtitle"], [data-testid*="cue"]');
    await expect(subtitlePanel).toBeVisible({ timeout: 15_000 });

    // Verify at least one subtitle line is present
    const firstCue = page.locator('[class*="subtitle"] *, [class*="cue"] *, [data-testid*="subtitle"] *, [data-testid*="cue"] *').first();
    await expect(firstCue).toBeVisible({ timeout: 10_000 });
  });
});

// ---------- Test 2: Invalid URL ----------
test.describe('Invalid URL — shows validation error', () => {
  test('rejects invalid input and shows an error', async ({ page }) => {
    await page.goto('/');

    const urlInput = page.getByRole('textbox', { name: /url|video|youtube/i });
    await urlInput.fill('not a valid url');

    const loadBtn = page.getByRole('button', { name: /load/i });
    await loadBtn.click();

    // An error message should appear
    const errorMsg = page.locator('[class*="error"], [role="alert"], [data-testid*="error"]');
    await expect(errorMsg).toBeVisible({ timeout: 5_000 });

    // Video player should NOT appear
    const player = page.locator('iframe[src*="youtube"], iframe[src*="youtu.be"]');
    await expect(player).not.toBeVisible();
  });
});

// ---------- Test 3: Empty state ----------
test.describe('Empty state — initial page shows input form', () => {
  test('displays URL form and no player on first load', async ({ page }) => {
    await page.goto('/');

    // URL input is visible
    const urlInput = page.getByRole('textbox', { name: /url|video|youtube/i });
    await expect(urlInput).toBeVisible();

    // Load button is present
    const loadBtn = page.getByRole('button', { name: /load/i });
    await expect(loadBtn).toBeVisible();

    // No video player yet
    const player = page.locator('iframe[src*="youtube"], iframe[src*="youtu.be"]');
    await expect(player).not.toBeVisible();

    // No subtitle panel yet
    const subtitlePanel = page.locator('[class*="subtitle"], [class*="cue"], [data-testid*="subtitle"], [data-testid*="cue"]');
    await expect(subtitlePanel).not.toBeVisible();
  });
});

// ---------- Test 4: No captions ----------
test.describe('No captions — graceful degradation', () => {
  test('shows a message when video has no captions', async ({ page }) => {
    await page.goto('/');

    const urlInput = page.getByRole('textbox', { name: /url|video|youtube/i });
    await urlInput.fill(NO_CAPTIONS_URL);

    const loadBtn = page.getByRole('button', { name: /load/i });
    await loadBtn.click();

    // Video player should still appear
    const player = page.locator('iframe[src*="youtube"], iframe[src*="youtu.be"]');
    await expect(player).toBeVisible({ timeout: 15_000 });

    // A "no captions" or "no subtitles" message should be shown
    const noCaptionsMsg = page.getByText(/no caption|no subtitle|no.*available/i);
    await expect(noCaptionsMsg).toBeVisible({ timeout: 10_000 });
  });
});

// ---------- Test 5: Loading state ----------
test.describe('Loading state — button shows loading', () => {
  test('button shows loading and is disabled while fetching', async ({ page }) => {
    await page.goto('/');

    const urlInput = page.getByRole('textbox', { name: /url|video|youtube/i });
    await urlInput.fill(VALID_YT_URL);

    const loadBtn = page.getByRole('button', { name: /load/i });
    await loadBtn.click();

    // Button should show loading text and be disabled
    await expect(loadBtn).toBeDisabled({ timeout: 5_000 });
    await expect(loadBtn).toHaveText(/loading/i, { timeout: 5_000 });
  });
});

// ---------- Test 6: Subtitle sync ----------
test.describe('Subtitle sync — active line highlights', () => {
  test('at least one subtitle line gets an active class after playback starts', async ({ page }) => {
    await page.goto('/');

    const urlInput = page.getByRole('textbox', { name: /url|video|youtube/i });
    await urlInput.fill(VALID_YT_URL);

    const loadBtn = page.getByRole('button', { name: /load/i });
    await loadBtn.click();

    // Wait for video player
    const player = page.locator('iframe[src*="youtube"], iframe[src*="youtu.be"]');
    await expect(player).toBeVisible({ timeout: 15_000 });

    // Wait for subtitles to load
    const subtitlePanel = page.locator('[class*="subtitle"], [class*="cue"], [data-testid*="subtitle"], [data-testid*="cue"]');
    await expect(subtitlePanel).toBeVisible({ timeout: 15_000 });

    // Try to click the play button inside the iframe (best-effort)
    const frame = page.frameLocator('iframe[src*="youtube"], iframe[src*="youtu.be"]');
    try {
      const playBtn = frame.locator('.ytp-play-button, .ytp-large-play-button');
      await playBtn.click({ timeout: 5_000 });
    } catch {
      // Player may auto-play; ignore click failure
    }

    // Wait for playback to advance and an active highlight to appear
    const activeLine = page.locator(
      '[class*="subtitle"][class*="active"], ' +
      '[class*="cue"][class*="active"], ' +
      '[class*="subtitle"] [class*="active"], ' +
      '[class*="cue"] [class*="active"], ' +
      '[data-testid*="subtitle"][class*="active"], ' +
      '[data-testid*="subtitle"] [class*="active"]'
    );
    await expect(activeLine).toBeVisible({ timeout: 10_000 });
  });
});
