import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
import models, schemas
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/companies", tags=["companies"])

LOGO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "logos")
os.makedirs(LOGO_DIR, exist_ok=True)

ALLOWED_LOGO_TYPES = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}


@router.get("/{slug}", response_model=schemas.CompanyResponse)
async def get_company(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Company).where(models.Company.slug == slug))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return _company_to_response(company)


@router.put("/{slug}", response_model=schemas.CompanyResponse)
async def update_company(
    slug: str,
    body: schemas.CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    result = await db.execute(select(models.Company).where(models.Company.slug == slug))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.name = body.name
    await db.commit()
    await db.refresh(company)
    return _company_to_response(company)


@router.post("/{slug}/logo")
async def upload_logo(
    slug: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    if file.content_type not in ALLOWED_LOGO_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, WebP, or SVG logos are supported")

    result = await db.execute(select(models.Company).where(models.Company.slug == slug))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png"
    filename = f"{slug}.{ext}"
    dest = os.path.join(LOGO_DIR, filename)

    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)

    company.logo_path = dest
    await db.commit()
    return {"ok": True, "logo_url": f"/api/companies/{slug}/logo"}


@router.get("/{slug}/logo")
async def get_logo(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Company).where(models.Company.slug == slug))
    company = result.scalar_one_or_none()
    if not company or not company.logo_path or not os.path.isfile(company.logo_path):
        raise HTTPException(status_code=404, detail="Logo not found")
    return FileResponse(company.logo_path)


def _company_to_response(c: models.Company) -> schemas.CompanyResponse:
    logo_url = f"/api/companies/{c.slug}/logo" if c.logo_path and os.path.isfile(c.logo_path) else None
    return schemas.CompanyResponse(
        id=c.id,
        slug=c.slug,
        name=c.name,
        logo_url=logo_url,
        created_at=c.created_at,
    )
