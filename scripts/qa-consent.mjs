// The optional-measurement banner is pinned over the bottom-left corner at
// z-index 30, so whenever it appears it intercepts clicks on whatever is
// underneath — the studio footer, the activity feed, the placement actions.
// Journeys that happened to click before it rendered passed; the rest failed
// intermittently. Recording a decision up front removes that race, and means a
// journey exercises the product rather than the consent prompt.
//
// This does not paper over the overlap itself: that the banner covers live
// controls is a real defect, tracked separately. Use `showConsent` when a test
// is specifically about the prompt.
export const CONSENT_KEY = 'mh-analytics-choice-v1';

export async function settleConsent(page, choice = 'decline') {
  await page.addInitScript(([key, value]) => {
    try { localStorage.setItem(key, value); } catch { /* private mode */ }
  }, [CONSENT_KEY, choice]);
  return page;
}

/**
 * Wraps a Playwright browser so every page it opens starts with the measurement
 * decision already recorded. Suites only have to change their launch line.
 */
export function withSettledConsent(browser, choice = 'decline') {
  return new Proxy(browser, {
    get(target, property, receiver) {
      if (property === 'newPage') {
        return async (...args) => settleConsent(await target.newPage(...args), choice);
      }
      if (property === 'newContext') {
        return async (...args) => {
          const context = await target.newContext(...args);
          await context.addInitScript(([key, value]) => {
            try { localStorage.setItem(key, value); } catch { /* private mode */ }
          }, [CONSENT_KEY, choice]);
          return context;
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
