from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
import models, schemas
from typing import Optional
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_admin,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenResponse)
async def login(body: schemas.LoginBody, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == body.email.lower()))
    user = result.scalar_one_or_none()
    if not user or not user.is_active or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": str(user.id), "role": user.role, "company_id": user.company_id})
    company_slug: Optional[str] = None
    if user.company_id:
        co = await db.execute(select(models.Company).where(models.Company.id == user.company_id))
        company = co.scalar_one_or_none()
        if company:
            company_slug = company.slug
    user_data = schemas.UserResponse.model_validate(user)
    user_data.company_slug = company_slug
    return schemas.TokenResponse(access_token=token, user=user_data)


@router.get("/me", response_model=schemas.UserResponse)
async def me(user: models.User = Depends(get_current_user)):
    return user


@router.post("/register", response_model=schemas.UserResponse)
async def register(
    body: schemas.UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: models.User = Depends(require_admin),
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


@router.put("/password")
async def change_password(
    body: schemas.PasswordChange,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(body.new_password)
    await db.commit()
    return {"ok": True}
