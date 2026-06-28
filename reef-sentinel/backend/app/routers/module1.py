from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..schemas import Module1Result
from ..services import module1_service

router = APIRouter(prefix="/api/module1", tags=["Module 1 - FTIR"])


@router.post("/predict", response_model=Module1Result)
async def predict(file: UploadFile = File(...)) -> Module1Result:
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers CSV sont acceptés.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Le fichier importé est vide.")

    try:
        result = module1_service.run_prediction(content)
    except module1_service.Module1Error as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return Module1Result(**result)
