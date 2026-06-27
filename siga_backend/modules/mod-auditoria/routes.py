from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from database import get_db
from models import AuditLog
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
import datetime

router = APIRouter()

class AuditLogResponse(BaseModel):
    id: int
    event_id: str
    event_type: str
    source: str
    payload: dict
    user_id: Optional[int] = None
    request_id: Optional[str] = None
    timestamp: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

@router.get("/api/v1/auditoria", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: int = 50,
    skip: int = 0,
    source: Optional[str] = None,
    event_type: Optional[str] = None,
    user_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog).order_by(desc(AuditLog.timestamp))
    
    if source:
        query = query.where(AuditLog.source == source)
    if event_type:
        query = query.where(AuditLog.event_type == event_type)
    if user_id is not None:
        query = query.where(AuditLog.user_id == user_id)
        
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
