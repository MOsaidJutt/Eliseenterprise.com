from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
import models
from auth import get_current_user
from xer_parser import parse_xer
from analytics import compute_all

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze")
async def analyze(
    files: List[UploadFile] = File(...),
    file_type: str = Form("update"),
    notes: str = Form(""),
    force: str = Form("false"),   # "true" to overwrite duplicates
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    force_bool = force.lower() == "true"

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    max_files = 1 if file_type == "baseline" else 10
    if len(files) > max_files:
        detail = "Only 1 file allowed for baseline analysis" if file_type == "baseline" else "Maximum 10 XER files allowed"
        raise HTTPException(status_code=400, detail=detail)

    # Read all files first
    file_data = []
    filenames = []
    for f in files:
        if not f.filename.lower().endswith(".xer"):
            raise HTTPException(status_code=400, detail=f"{f.filename} is not an XER file")
        content = await f.read()
        filenames.append(f.filename)
        file_data.append((f.filename, content))

    # Duplicate check: find existing analyses with overlapping filenames in this company
    all_result = await db.execute(
        select(models.Analysis).where(models.Analysis.company_id == user.company_id)
    )
    all_analyses = all_result.scalars().all()

    duplicates = []
    for a in all_analyses:
        if set(a.filenames or []) & set(filenames):
            duplicates.append(a)

    if duplicates and not force_bool:
        # Return 409 with duplicate info
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=409, content={
            "duplicate": True,
            "duplicate_analyses": [
                {
                    "id": a.id,
                    "project_name": a.project_name,
                    "created_at": a.created_at.isoformat(),
                    "filenames": a.filenames,
                    "file_type": a.file_type,
                }
                for a in duplicates
            ],
        })

    if force_bool and duplicates:
        for a in duplicates:
            await db.delete(a)
        await db.flush()

    # Parse and compute
    xers = []
    for filename, content in file_data:
        xer = parse_xer(content, filename=filename)
        xers.append(xer)

    result = compute_all(xers)
    project_name = result.get("kpis", {}).get("project_name", "") or filenames[0]

    analysis = models.Analysis(
        user_id=user.id,
        company_id=user.company_id,
        project_name=project_name,
        filenames=filenames,
        file_type=file_type,
        notes=notes or None,
        result=result,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    return {"analysis_id": analysis.id, **result}
