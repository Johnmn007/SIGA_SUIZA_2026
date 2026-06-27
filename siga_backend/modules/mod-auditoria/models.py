from sqlalchemy import Column, String, Integer, DateTime, JSON
from database import Base
import datetime

class AuditLog(Base):
    __tablename__ = "core_audit_logs"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(50), unique=True, index=True, nullable=False)
    event_type = Column(String(100), index=True, nullable=False)
    source = Column(String(50), index=True, nullable=False)
    payload = Column(JSON, nullable=False)
    user_id = Column(Integer, nullable=True, index=True)
    request_id = Column(String(50), nullable=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
