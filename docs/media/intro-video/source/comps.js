const { chromium } = require('playwright'); const { setup } = require('./common');
const base = 'http://localhost:5173';
async function card(p, name, text, minW = 300, idx = 0, minH = 0) {
  const box = await p.evaluate(([text, minW, idx, minH]) => {
    const all = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 || [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.toLowerCase().includes(text)));
    const hits = all.filter(e => e.textContent.toLowerCase().includes(text));
    let el = hits[idx]; if (!el) return null;
    while (el && el !== document.body) {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (r.width >= minW && r.height >= minH && parseFloat(cs.borderTopLeftRadius) >= 10 && (parseFloat(cs.borderTopWidth) > 0 || cs.backgroundColor !== 'rgba(0, 0, 0, 0)')) {
        return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
      }
      el = el.parentElement;
    }
    return null;
  }, [text.toLowerCase(), minW, idx, minH]);
  if (!box) { console.log('MISS', name, text); return; }
  const pad = 2;
  await p.screenshot({ path: `comps/${name}.png`, clip: { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad }, omitBackground: true });
  console.log(name, Math.round(box.width), Math.round(box.height));
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 2400 }, deviceScaleFactor: 2 });
  await setup(ctx);
  const p = await ctx.newPage();
  const go = async (r, w = 3500) => { await p.goto(base + r); await p.waitForTimeout(w); };
  const which = process.argv[2] || 'all';
  if (which === 'all' || which === 'resume') {
    await go('/resume');
    await p.locator('input[type=file]').first().setInputFiles('Ananya_Rao_Resume.txt'); await p.waitForTimeout(7000);
    await card(p, 'res_radar', '12-Dimensional Skill Fingerprint', 400);
    await card(p, 'res_overview', 'Top grounded skills', 500, 0, 250);
    await card(p, 'res_done', 'Parsing Complete', 600);
    await card(p, 'res_ingest', 'Resume Ingestion', 600);
  }
  if (which === 'all' || which === 'jd') {
    await go('/jd');
    await card(p, 'jd_drop', 'Drop a JD here', 200);
    await card(p, 'jd_library', 'JD library', 200);
    await card(p, 'jd_skills', 'required level', 350, 0, 400);
    await card(p, 'jd_text', 'JD text', 300);
  }
  if (which === 'all' || which === 'profile') {
    await go('/profile');
    await p.getByText('Skill levels').first().click(); await p.waitForTimeout(1500);
    await card(p, 'pf_levels', 'Talent Check compares these 12 levels', 700, 0, 800).catch(()=>{});
    await card(p, 'pf_complete', 'Profile completeness', 200);
  }
  if (which === 'all' || which === 'tc') {
    await go('/talent-check');
    await p.getByRole('button', { name: /Ananya Rao/ }).last().click(); await p.waitForTimeout(500);
    await p.getByRole('button', { name: /Oracle Financial/ }).click(); await p.waitForTimeout(2500);
    await card(p, 'tc_select', 'Select Candidate Profile', 900);
    await card(p, 'tc_ready', 'READINESS EVALUATION', 900);
    await card(p, 'tc_summary', 'Executive Summary', 900);
    await card(p, 'tc_gaps', '12 Skillset Gaps vs Hiring Bar', 400, 0, 600);
    await card(p, 'tc_radar', '12-Axis Skill Radar', 300, 0, 300);
    await p.getByRole('button', { name: 'What-If Simulator' }).click(); await p.waitForTimeout(2000);
    await card(p, 'tc_whatif', 'What-If Simulation', 600);
    await p.getByRole('button', { name: 'Fastest Path & Curriculum' }).click(); await p.waitForTimeout(2000);
    await card(p, 'tc_path', 'Fastest Path', 600);
    await p.getByRole('button', { name: '115-Company Rankings' }).click(); await p.waitForTimeout(2500);
    await card(p, 'tc_rank', 'Which Companies', 600);
    await p.getByRole('button', { name: /Google LLC/ }).click(); await p.waitForTimeout(2500);
    await card(p, 'tc_ready_google', 'READINESS EVALUATION', 900);
  }
  if (which === 'all' || which === 'sm') {
    await go('/skill-match', 6000);
    await card(p, 'sm_score', 'Match Fit Score', 600);
    await card(p, 'sm_gap1', 'What to study next', 500, 0);
    await card(p, 'sm_gaplist', 'Quick wins', 600, 0, 400);
  }
  if (which === 'all' || which === 'flow') {
    await go('/flow');
    await card(p, 'flow_jd', 'Job description', 500);
  }
  await b.close();
})();
