# PlaceIntel intro video: voiceover script

Video: `placeintel-intro.mp4` (1920x1080, 30 fps, 1:25, silent). Captions: `placeintel-intro.srt`.
Record the VO at a calm product-launch pace (about 140 words per minute) and drop it plus a soft music bed under the video in any editor (CapCut, iMovie, DaVinci).
Every number below is real output of the running app (seed profile Ananya Rao, `tc-1.0`, `sm-1.0`) or from the architecture manual.

| Time | Scene (on screen) | Voiceover |
|---|---|---|
| 0:00 to 0:06 | Hook: "Am I ready?" | Every placement season, students ask one question: am I ready? Today the answer is a yes or a no, with no reason attached. |
| 0:06 to 0:13 | Logo, PlaceIntel landing page | Meet PlaceIntel, built on RADIX Talent Match. Benchmark your skills against real company hiring bars, with every number explained. |
| 0:13 to 0:22 | 01 JD Analytics: JD text + extracted skills | Start with a job description. Every skill is mapped to one of 12 Bloom categories, tagged must or nice, with the exact quote as evidence. |
| 0:22 to 0:31 | 02 Resume Parsing: grounded skills + radar | Upload a resume. It is parsed fully offline, with no LLM and contacts redacted, into a 12-dimension skill fingerprint. |
| 0:31 to 0:39 | 03 Profile Builder: 12 Bloom sliders | The profile builder turns that into 12 levels from 1 to 10, each with a basis you can audit and adjust. |
| 0:39 to 0:53 | 04 Talent Check: Google 62 flips to Oracle FSS 89, SQL row ringed | Talent Check scores you against a company's bar. Same candidate, different bar: Ananya is 62 at Google, and 89 at Oracle FSS. Almost ready, held back by one blocking gap: SQL, 4 versus 7. |
| 0:53 to 1:02 | 05 Skill Matching: score card + quick wins (+10 pts) | Skill Matching runs a 7-stage cascade against the JD, and every gap shows exactly how many points it would add. Learn Java: plus 10. |
| 1:02 to 1:09 | What-if simulator + company ranking | Then it shows you the way up: a what-if simulator, a study plan, and the companies you are ready for. |
| 1:09 to 1:18 | Architecture: K8s ingress, 5 services, Supabase | Under the hood: five microservices on Kubernetes. LLMs extract, code scores, and every dependency has an offline fallback. |
| 1:18 to 1:25 | CTA: 115 companies, 12 categories, 1 score | PlaceIntel. Know where you stand. Know what to learn next. |

## How it was made

- The app (frontend, backend, agent, resume service) was run from the working tree, signed in as the seed candidate Ananya Rao, and each UI card was screenshotted at 2x with Playwright. No mockups: every card is the real component with real output.
- Supabase was not reachable from the render machine, so the company dropdown was limited to the three companies in the agent's offline snapshot (Google LLC, Microsoft, Oracle FSS). Scores come from that snapshot, same as the demo fallback.
- `video.html` animates those captures (deterministic `render(t)`), and `render.js` steps it frame by frame into ffmpeg. Open `video.html?play` in a browser to preview the animation live.
- Not included: a Telegram bot scene (there is no Telegram bot in the codebase yet).
