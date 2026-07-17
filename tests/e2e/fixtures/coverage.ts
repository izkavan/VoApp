/**
 * @purpose This custom Playwright fixture automatically collects native V8 JavaScript and CSS coverage
 * during E2E test execution. It replaces the default '@playwright/test' import in all spec files.
 * The gathered coverage is aggregated by 'monocart-reporter' to generate a unified HTML report.
 */
import { test as baseTest } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

export const test = baseTest.extend({
    page: async ({ page }, use) => {
        // Start collecting V8 coverage native to Chromium
        await Promise.all([
            page.coverage.startJSCoverage({ resetOnNavigation: false }),
            page.coverage.startCSSCoverage({ resetOnNavigation: false })
        ]);
        
        await use(page);
        
        // Stop collection and append to the monocart reporter
        const coverage = await Promise.all([
            page.coverage.stopJSCoverage(),
            page.coverage.stopCSSCoverage()
        ]);
        await addCoverageReport(coverage, test.info());
    }
});

export { expect } from '@playwright/test';
