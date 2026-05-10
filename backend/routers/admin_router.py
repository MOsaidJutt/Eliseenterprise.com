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


@router.get("/users", response_model=list[schemas.UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    result = await db.execute(select(models.User).order_by(models.User.created_at))
    return result.scalars().all()


@router.post("/users", response_model=schemas.UserResponse)
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
    return user


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
