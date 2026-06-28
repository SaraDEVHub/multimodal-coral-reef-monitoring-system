from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..schemas import ClassProbability, Module3Result
from ..services import module3_service

router = APIRouter(prefix="/api/module3", tags=["Module 3 - Imagery"])

ALLOWED_EXTENSIONS = (".png", ".jpg", ".jpeg")


@router.post("/predict", response_model=Module3Result)
async def predict(file: UploadFile = File(...)) -> Module3Result:
    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Formats acceptés : PNG, JPG, JPEG.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Le fichier image importé est vide.")

    try:
        result = module3_service.run_prediction(content)
    except module3_service.Module3Error as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    result["class_probabilities"] = [
        ClassProbability(**cp) for cp in result["class_probabilities"]
    ]
    return Module3Result(**result)
