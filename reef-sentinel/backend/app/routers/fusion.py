from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..schemas import FusionContribution, FusionRequest, FusionResult
from ..services import fusion_service

router = APIRouter(prefix="/api/fusion", tags=["Module 4 - Fusion"])


@router.post("/compute", response_model=FusionResult)
async def compute(payload: FusionRequest) -> FusionResult:
    try:
        result = fusion_service.compute_global_risk(
            payload.p_micro, payload.p_hab, payload.p_image
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    result["contributions"] = [FusionContribution(**c) for c in result["contributions"]]
    return FusionResult(**result)
