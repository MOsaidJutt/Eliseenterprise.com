from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from database import get_db
import models, schemas
from auth import get_current_user, require_admin, hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=schemas.AdminStatsResponse)
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    total_analyses = (await db.execute(select(func.count(models.Analysis.id)))).scalar_one()
    total_users = (await db.execute(select(func.count(models.User.id)))).scalar_one()
    total_companies = (await db.execute(select(func.count(models.Company.id)))).scalar_one()

    recent_result = await db.execute(
        select(models.Analysis).order_by(desc(models.Analysis.created_at)).limit(20)
    )
    recent = recent_result.scalars().all()

    return schemas.AdminStatsResponse(
        total_analyses=total_analyses,
        total_users=total_users,
        total_companies=total_companies,
        recent_analyses=[schemas.AnalysisListItem.model_validate(a) for a in recent],
    )


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    result = await db.execute(
        select(models.User).order_by(models.User.created_at)
    )
    users = result.scalars().all()

    # Build response with company slug and name populated
    out = []
    for u in users:
        company_slug = None
        company_name = None
        if u.company_id:
            comp_result = await db.execute(
                select(models.Company).where(models.Company.id == u.company_id)
            )
            comp = comp_result.scalar_one_or_none()
            if comp:
                company_slug = comp.slug
                company_name = comp.name
        out.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "company_id": u.company_id,
            "company_slug": company_slug,
            "company_name": company_name,
            "created_at": u.created_at.isoformat(),
            "is_active": u.is_active,
        })
    return out


@router.post("/users")
async def create_user(
    body: schemas.UserCreate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    existing = await db.execute(select(models.User).where(models.User.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        email=body.email.lower(),
        hashed_password=hash_password(body.password),
        name=body.name,
        role=body.role,
        company_id=body.company_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    company_slug = None
    company_name = None
    if user.company_id:
        comp_result = await db.execute(
            select(models.Company).where(models.Company.id == user.company_id)
        )
        comp = comp_result.scalar_one_or_none()
        if comp:
            company_slug = comp.slug
            company_name = comp.name

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "company_id": user.company_id,
        "company_slug": company_slug,
        "company_name": company_name,
        "created_at": user.created_at.isoformat(),
        "is_active": user.is_active,
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    body: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.is_active is not None:
        if user_id == admin.id and body.is_active is False:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        user.is_active = body.is_active

    if body.role is not None:
        user.role = body.role

    if body.name is not None:
        user.name = body.name

    await db.commit()
    await db.refresh(user)

    company_slug = None
    company_name = None
    if user.company_id:
        comp_result = await db.execute(
            select(models.Company).where(models.Company.id == user.company_id)
        )
        comp = comp_result.scalar_one_or_none()
        if comp:
            company_slug = comp.slug
            company_name = comp.name

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "company_id": user.company_id,
        "company_slug": company_slug,
        "company_name": company_name,
        "created_at": user.created_at.isoformat(),
        "is_active": user.is_active,
    }


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await db.commit()
    return {"ok": True}


# ── Company endpoints ─────────────────────────────────────────────────────────

@router.get("/companies")
async def list_companies(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    result = await db.execute(select(models.Company).order_by(models.Company.created_at))
    companies = result.scalars().all()

    out = []
    for company in companies:
        user_count_result = await db.execute(
            select(func.count(models.User.id)).where(models.User.company_id == company.id)
        )
        user_count = user_count_result.scalar_one()

        analysis_count_result = await db.execute(
            select(func.count(models.Analysis.id)).where(models.Analysis.company_id == company.id)
        )
        analysis_count = analysis_count_result.scalar_one()

        logo_url = f"/api/companies/{company.slug}/logo" if company.logo_path else None

        out.append({
            "id": company.id,
            "slug": company.slug,
            "name": company.name,
            "logo_url": logo_url,
            "created_at": company.created_at.isoformat(),
            "user_count": user_count,
            "analysis_count": analysis_count,
        })

    return out


@router.post("/companies")
async def create_company(
    body: schemas.CompanyCreate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    # Check slug uniqueness
    existing = await db.execute(
        select(models.Company).where(models.Company.slug == body.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A company with this slug already exists")

    company = models.Company(
        slug=body.slug,
        name=body.name,
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)

    return {
        "id": company.id,
        "slug": company.slug,
        "name": company.name,
        "logo_url": None,
        "created_at": company.created_at.isoformat(),
    }


@router.put("/companies/{company_id}")
async def update_company(
    company_id: int,
    body: schemas.CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    result = await db.execute(select(models.Company).where(models.Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    company.name = body.name
    await db.commit()
    await db.refresh(company)

    logo_url = f"/api/companies/{company.slug}/logo" if company.logo_path else None

    return {
        "id": company.id,
        "slug": company.slug,
        "name": company.name,
        "logo_url": logo_url,
        "created_at": company.created_at.isoformat(),
    }


@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    result = await db.execute(select(models.Company).where(models.Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Cannot delete own company
    if admin.company_id == company_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own company")

    # Manual cascade: delete analyses first, then users, then company
    analyses_result = await db.execute(
        select(models.Analysis).where(models.Analysis.company_id == company_id)
    )
    analyses = analyses_result.scalars().all()
    for a in analyses:
        await db.delete(a)

    users_result = await db.execute(
        select(models.User).where(models.User.company_id == company_id)
    )
    users = users_result.scalars().all()
    for u in users:
        await db.delete(u)

    await db.delete(company)
    await db.commit()

    return {"ok": True}
