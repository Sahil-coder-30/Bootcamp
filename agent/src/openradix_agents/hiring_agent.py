"""
hiring_agent.py
===============
Runs the Hiring Rounds prompt and saves the structured hiring profile as JSON.
"""

from . import io_utils, parsing, prompts, providers


def run(company: str, provider_names=()) -> dict:
    outdir = io_utils.out_dir(company)
    prompt = prompts.render("hiring", company=company)

    provider, text = providers.invoke_first(prompt, provider_names, tag="hiring")
    (outdir / "hiring_raw.txt").write_text(text, encoding="utf-8")
    try:
        data = parsing.extract_json(text)
    except ValueError as exc:  # json.JSONDecodeError is a ValueError
        raise ValueError(
            f"{provider} did not return valid JSON ({exc}); " f"raw reply saved to hiring_raw.txt"
        ) from exc

    io_utils.write_json(outdir / "hiring_rounds.json", data)
    print("[hiring] saved hiring_rounds.json")
    return data
