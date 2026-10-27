<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- All company data flows through `src/lib/companyData.ts` normalizers fed by raw short_json/full_json/skill_levels shapes; Phase 2 swaps only the data-access functions there to the database.
- Selected company persists in localStorage key `selected-company` via `CompanyProvider`; company pages redirect to `/` when it is missing (never NotFound).
- Phase 1 is UI-only: no backend, no auth, no college logo image.
