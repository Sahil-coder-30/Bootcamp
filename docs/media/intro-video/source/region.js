const { chromium } = require('playwright'); const { setup } = require('./common');
async function region(p, name, text, w, h, dx, dy) {
  const r = await p.evaluate((text) => { const e = [...document.querySelectorAll('body *')].find(e => e.children.length === 0 && e.textContent.trim().toLowerCase().startsWith(text)); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y }; }, text.toLowerCase());
  if (!r) return console.log('MISS', name);
  await p.screenshot({ path: `comps/${name}.png`, clip: { x: r.x - dx, y: r.y - dy, width: w, height: h } });
  console.log(name, r);
}
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1600, height: 2400 }, deviceScaleFactor: 2 }); await setup(ctx);
  const p = await ctx.newPage(); const base = 'http://localhost:5173';
  await p.goto(base + '/talent-check'); await p.waitForTimeout(3000);
  await p.getByRole('button', { name: /Ananya Rao/ }).last().click(); await p.waitForTimeout(500);
  await p.getByRole('button', { name: /Oracle Financial/ }).click(); await p.waitForTimeout(2500);
  await region(p, 'tc_gaps', '12 Skillset Gaps vs Hiring Bar', 760, 1400, 24, 24);
  await p.goto(base + '/skill-match'); await p.waitForTimeout(6000);
  await region(p, 'sm_gaplist', 'Quick Wins', 1232, 700, 30, 20);
  await p.goto(base + '/profile'); await p.waitForTimeout(3000);
  await p.getByText('Skill levels').first().click(); await p.waitForTimeout(1500);
  await region(p, 'pf_levels', 'Talent Check compares these 12 levels', 820, 1500, 24, 70);
  await b.close();
})();
