from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
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
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    if len(files) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 XER files allowed")

    xers = []
    filenames = []
    for f in files:
        if not f.filename.lower().endswith(".xer"):
            raise HTTPException(status_code=400, detail=f"{f.filename} is not an XER file")
        content = await f.read()
        xer = parse_xer(content, filename=f.filename)
        xers.append(xer)
        filenames.append(f.filename)

    result = compute_all(xers)

    # Check for duplicate: same filenames + same data dates in this company
    # (soft check — just warn, don't block)
    project_name = result.get("kpis", {}).get("project_name", "") or filenames[0]

    # Save to DB
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
