const { chromium } = require('playwright'); const { setup } = require('./common');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1600, height: 2400 }, deviceScaleFactor: 2 }); await setup(ctx);
 const p = await ctx.newPage(); await p.goto('http://localhost:5173/talent-check'); await p.waitForTimeout(3000);
 await p.getByRole('button', { name: /Ananya Rao/ }).last().click(); await p.waitForTimeout(500);
 await p.getByRole('button', { name: /Google LLC/ }).click(); await p.waitForTimeout(2500);
 const r = await p.evaluate(() => { const e = [...document.querySelectorAll('body *')].find(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.includes('Select Candidate Profile'))); let el = e; while (el) { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); if (r.width >= 900 && parseFloat(cs.borderTopLeftRadius) >= 10) return { x: r.x, y: r.y, width: r.width, height: r.height }; el = el.parentElement; } });
 await p.screenshot({ path: 'comps/tc_select_google.png', clip: { x: r.x - 2, y: r.y - 2, width: r.width + 4, height: r.height + 4 } }); console.log(r); await b.close(); })();
