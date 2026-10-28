"""
skill_matrix_agent.py
=====================
Runs the Expectation Matrix prompt (12 skills, Bloom-coded "Level-Code") for one
company and saves the single 12-column row as CSV + JSON.
"""

from . import io_utils, parsing, prompts, providers


def run(company: str, provider_names=()) -> dict:
    outdir = io_utils.out_dir(company)
    prompt = prompts.render("expectation_matrix", companies=company)

    provider, text = providers.invoke_first(prompt, provider_names, tag="skills")
    (outdir / "skill_matrix_raw.txt").write_text(text, encoding="utf-8")
    rows = parsing.parse_markdown_table(text)
    row = rows[0] if rows else {}
    if not row:
        raise ValueError(
            f"{provider} returned no parsable skill table " f"(raw reply saved to skill_matrix_raw.txt)"
        )

    io_utils.write_json(outdir / "skill_matrix.json", row)
    if row:
        io_utils.write_record_csv(outdir / "skill_matrix.csv", row)
    print(f"[skills] captured {len(row)} columns")
    return row
