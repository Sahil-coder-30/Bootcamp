"""Read what a run wrote to outputs/<company>/."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from ..deps import require_api_key
from ..schemas import ArtifactList
from ..services import artifacts

router = APIRouter(prefix="/companies/{company}", tags=["artifacts"], dependencies=[Depends(require_api_key)])


def _not_found(company: str, what: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"no {what} for {company!r} yet")


@router.get("/artifacts", response_model=ArtifactList)
def list_artifacts(company: str) -> ArtifactList:
    return ArtifactList(company=company, artifacts=artifacts.list_artifacts(company))


@router.get("/artifacts/{name}")
def get_artifact(company: str, name: str) -> FileResponse:
    path = artifacts.artifact_path(company, name)
    if path is None:
        raise _not_found(company, name)
    return FileResponse(path)


@router.get("/golden-record")
def golden_record(company: str) -> dict:
    data = artifacts.load_json(company, "golden_record.json")
    if data is None:
        raise _not_found(company, "golden record")
    return data


@router.get("/skill-matrix")
def skill_matrix(company: str) -> dict:
    data = artifacts.load_json(company, "skill_matrix.json")
    if data is None:
        raise _not_found(company, "skill matrix")
    return data


@router.get("/hiring")
def hiring(company: str):
    data = artifacts.load_json(company, "hiring_rounds.json")
    if data is None:
        raise _not_found(company, "hiring rounds")
    return data
