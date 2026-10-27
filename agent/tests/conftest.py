import pytest

from openradix_agents import io_utils


@pytest.fixture(autouse=True)
def tmp_outputs(tmp_path, monkeypatch):
    """Every test writes to a throwaway outputs/ folder, never the real one."""
    out = tmp_path / "outputs"
    out.mkdir()
    monkeypatch.setattr(io_utils, "OUTPUTS_DIR", out)
    return out
