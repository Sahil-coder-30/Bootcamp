from openradix_agents import parsing


def test_parse_markdown_table():
    md = (
        "| ID | Parameter | Research Output / Data |\n"
        "|----|-----------|------------------------|\n"
        "| 1 | name | Blinkit |\n"
        "| 2 | short_name | Blinkit |\n"
    )
    rows = parsing.parse_markdown_table(md)
    assert len(rows) == 2
    assert rows[0]["Parameter"] == "name"
    assert rows[0]["Research Output / Data"] == "Blinkit"


def test_parse_markdown_table_ignores_prose():
    md = "Here is the table:\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\nThanks!"
    rows = parsing.parse_markdown_table(md)
    assert rows == [{"A": "1", "B": "2"}]


def test_extract_json_from_fence():
    assert parsing.extract_json('```json\n{"a": 1}\n```')["a"] == 1


def test_extract_json_bare():
    assert parsing.extract_json('prefix {"b": 2} suffix')["b"] == 2


def test_extract_json_array():
    assert parsing.extract_json("[1, 2, 3]") == [1, 2, 3]
