"""
prompts.py
==========
Loads prompt templates from the ``prompts/`` folder and fills simple
``{{TOKEN}}`` placeholders.

We use literal ``{{TOKEN}}`` replacement (NOT str.format) because several prompts
embed JSON examples full of ``{`` and ``}`` braces.
"""

from . import config


def load(name: str) -> str:
    return (config.PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")


def render(name: str, **tokens: object) -> str:
    text = load(name)
    for key, value in tokens.items():
        text = text.replace("{{" + key.upper() + "}}", str(value))
    return text
