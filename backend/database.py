import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from urllib.parse import urlparse, urlencode, parse_qs, urlunparse

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Neon uses postgresql:// — swap for async asyncpg driver
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

# asyncpg doesn't accept libpq-style params like sslmode — strip them
_parsed = urlparse(DATABASE_URL)
_qs = {k: v for k, v in parse_qs(_parsed.query).items() if k not in ("sslmode",)}
DATABASE_URL = urlunparse(_parsed._replace(query=urlencode(_qs, doseq=True)))

_connect_args = {"ssl": "require"} if DATABASE_URL and "neon" in DATABASE_URL else {}

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
