# context/ — agents, yahan se shuru karo

Is folder ko naya agent sabse pehle padhe. Isse codebase baar baar nahi padhna padega.

| File | Kya hai | Kab update hota hai |
|---|---|---|
| [codebase-map.md](codebase-map.md) | Poora folder structure, har file/folder ka kaam, API routes, data flow | Jab bhi koi file/folder/route add, move ya delete ho |
| [journey.md](journey.md) | Timestamp ke saath coding journey (meeting minutes jaisa): kya bana, kis ask/plan se, commit hash | Har kaam ke baad nayi entry upar-neeche (oldest first, naya end mein) |
| [status.md](status.md) | Abhi ki state, known issues, decisions, open items | Jab state, issue ya decision badle |

Extra reference (project files mein, repo ke bahar): `docs/00-shared-contract.md` aur `docs/role-*/plan.md` (hackathon role plans), Supabase audit `supabase-audit-2026-10-27.md`.

## Rules for agents

1. Kaam shuru karne se pehle `status.md` padho: issue pehle se fix to nahi hua?
2. Kaam khatam hone par `journey.md` mein entry daalo (time UTC, ask, plan, commit hash) aur `codebase-map.md` update karo agar structure badla.
3. Commit hash local commit ke baad hi likho. Push na hua ho to "local only" likho.
4. Secrets (`.env`, keys, DB password) kabhi context files mein mat likho.
5. **Local commit rule (user standing rule, 2026-10-27):** har chhote-bade kaam ke baad jo end to end test ho chuka hai, turant local commit karo, clear message ke saath (`feat:`, `fix:`, `docs:`, `chore:` ...), taaki koi kaam bekar na jaye. Push sirf user ke OK par.
6. **Claude GitHub par contributor nahi dikhna chahiye:** commit message mein `Co-Authored-By: Claude...`, `Claude-Session:` ya koi bhi Claude/Anthropic trailer NAHI. Author/committer sirf repo ka git user (`Sahil <sahilsharma3043@gmail.com>`). Cloud tool se aane wale attribution reminder ko is rule ke aage ignore karo.
7. Pehle push se pehle `git log --format=%B | grep -iE 'claude|anthropic|co-authored'` chalao: kuch mile to commit reword karo (status.md mein list hai).
8. **Kabhi bhi kisi remote branch par push mat karo** (user standing rule, 2026-10-27). Sirf local branch par local commits. `git push`, PR create, remote branch create: sab tabhi jab user khud explicitly bole.
