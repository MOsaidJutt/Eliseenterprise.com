from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/api/analyses", tags=["history"])


@router.get("", response_model=schemas.AnalysisListResponse)
async def list_analyses(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    file_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = select(models.Analysis).where(models.Analysis.company_id == user.company_id)
    if file_type:
        q = q.where(models.Analysis.file_type == file_type)
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()
    items_result = await db.execute(q.order_by(desc(models.Analysis.created_at)).offset(offset).limit(limit))
    items = items_result.scalars().all()
    return schemas.AnalysisListResponse(
        items=[schemas.AnalysisListItem.model_validate(i) for i in items],
        total=total,
    )


@router.get("/{analysis_id}")
async def get_analysis(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.Analysis).where(
            models.Analysis.id == analysis_id,
            models.Analysis.company_id == user.company_id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {
        "analysis_id": analysis.id,
        "project_name": analysis.project_name,
        "file_type": analysis.file_type,
        "created_at": analysis.created_at.isoformat(),
        **analysis.result,
    }


@router.patch("/{analysis_id}", response_model=schemas.AnalysisListItem)
async def patch_analysis(
    analysis_id: int,
    body: schemas.AnalysisPatch,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.Analysis).where(
            models.Analysis.id == analysis_id,
            models.Analysis.company_id == user.company_id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if body.file_type is not None:
        analysis.file_type = body.file_type
    if body.notes is not None:
        analysis.notes = body.notes
    await db.commit()
    await db.refresh(analysis)
    return schemas.AnalysisListItem.model_validate(analysis)


@router.delete("/{analysis_id}")
async def delete_analysis(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.Analysis).where(
            models.Analysis.id == analysis_id,
            models.Analysis.company_id == user.company_id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    await db.delete(analysis)
    await db.commit()
    return {"ok": True}
