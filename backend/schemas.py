from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginBody(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    company_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "user"
    company_id: Optional[int] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# ── Company ───────────────────────────────────────────────────────────────────

class CompanyResponse(BaseModel):
    id: int
    slug: str
    name: str
    logo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CompanyUpdate(BaseModel):
    name: str


# ── Analysis ──────────────────────────────────────────────────────────────────

class AnalysisListItem(BaseModel):
    id: int
    project_name: str
    filenames: List[str]
    file_type: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AnalysisListResponse(BaseModel):
    items: List[AnalysisListItem]
    total: int

class AnalysisPatch(BaseModel):
    file_type: Optional[str] = None
    notes: Optional[str] = None

class AnalysisFullResponse(BaseModel):
    analysis_id: int
    project_name: str
    file_type: str
    created_at: datetime
    kpis: Optional[dict] = None
    spi_by_contractor: Optional[list] = None
    ppc: Optional[list] = None
    scurve: Optional[dict] = None
    resources: Optional[list] = None
    float_erosion: Optional[list] = None
    milestones: Optional[list] = None
    critical_path: Optional[list] = None
    gantt: Optional[dict] = None
    observations: Optional[list] = None
    files_analyzed: Optional[list] = None
    data_dates: Optional[list] = None

    class Config:
        from_attributes = True


# ── AI Chat ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    analysis_id: Optional[int] = None
    conversation_id: Optional[int] = None

class ChatResponse(BaseModel):
    reply: str
    conversation_id: int
    message_id: int

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationListItem(BaseModel):
    id: int
    title: str
    analysis_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationDetailResponse(BaseModel):
    id: int
    title: str
    analysis_id: Optional[int] = None
    created_at: datetime
    messages: List[MessageResponse]

    class Config:
        from_attributes = True


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminStatsResponse(BaseModel):
    total_analyses: int
    total_users: int
    total_companies: int
    recent_analyses: List[AnalysisListItem]
