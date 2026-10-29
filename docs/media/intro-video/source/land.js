const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5173/'); await p.waitForTimeout(3500); await p.screenshot({ path: 'comps/hero.png' }); await b.close(); })();
