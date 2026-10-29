const fs = require('fs');
const TOK = fs.readFileSync(__dirname + '/tok.txt', 'utf8').trim();
const USER = { id: "11111111-1111-4111-8111-111111111111", email: "ananya.rao@jssaten.ac.in", name: "Ananya Rao", picture: null, role: "student", phone: null, college: "JSSATEN", branch: "CSE", graduationYear: 2026, resumeId: null, candidateProfileId: "3a000000-0000-4000-8000-000000000001" };
async function setup(ctx) {
  await ctx.addInitScript(([tok, user]) => {
    localStorage.setItem('placeintel.auth', JSON.stringify({ accessToken: tok, refreshToken: 'r' }));
    localStorage.setItem('placeintel_user', JSON.stringify({ id: user.candidateProfileId, name: user.name, role: 'CSE (JSSATEN)', avatarText: 'AR', email: user.email }));
  }, [TOK, USER]);
  const COMPANIES = JSON.parse(fs.readFileSync(__dirname + '/companies.json','utf8'));
  await ctx.route(/\/api\/companies(\?.*)?$/, r => r.fulfill({ json: COMPANIES }));
  await ctx.route('**/api/auth/**', r => r.fulfill({ json: { user: USER } }));
}
module.exports = { setup, USER };
