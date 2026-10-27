"""
hiring_agent.py
===============
Runs the Hiring Rounds prompt and saves the structured hiring profile as JSON.
"""

from . import prompts, providers, parsing, io_utils


def run(company: str, provider: str = "openrouter") -> dict:
    outdir = io_utils.out_dir(company)
    prompt = prompts.render("hiring", company=company)

    print(f"[hiring] querying {provider} ...")
    text = providers.invoke(provider, prompt)
    data = parsing.extract_json(text)

    io_utils.write_json(outdir / "hiring_rounds.json", data)
    print("[hiring] saved hiring_rounds.json")
    return data
