"""
skill_matrix_agent.py
=====================
Runs the Expectation Matrix prompt (12 skills, Bloom-coded "Level-Code") for one
company and saves the single 12-column row as CSV + JSON.
"""

from . import prompts, providers, parsing, io_utils


def run(company: str, provider: str = "openrouter") -> dict:
    outdir = io_utils.out_dir(company)
    prompt = prompts.render("expectation_matrix", companies=company)

    print(f"[skills] querying {provider} ...")
    text = providers.invoke(provider, prompt)
    rows = parsing.parse_markdown_table(text)
    row = rows[0] if rows else {}

    io_utils.write_json(outdir / "skill_matrix.json", row)
    if row:
        io_utils.write_record_csv(outdir / "skill_matrix.csv", row)
    print(f"[skills] captured {len(row)} columns")
    return row
