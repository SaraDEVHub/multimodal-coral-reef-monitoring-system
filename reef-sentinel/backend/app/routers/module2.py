from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..schemas import Module2FeaturesResponse, Module2Request, Module2Result
from ..services import module2_service

router = APIRouter(prefix="/api/module2", tags=["Module 2 - HAB"])


@router.get("/features", response_model=Module2FeaturesResponse)
async def get_features() -> Module2FeaturesResponse:
    try:
        schema = module2_service.get_feature_schema()
    except module2_service.Module2Error as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return Module2FeaturesResponse(**schema)


@router.post("/predict", response_model=Module2Result)
async def predict(payload: Module2Request) -> Module2Result:
    try:
        result = module2_service.run_prediction(payload.values)
    except module2_service.Module2Error as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return Module2Result(**result)
