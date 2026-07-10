from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class SubtaskCreate(BaseModel):
    task_id: int
    title: str
    expected_end_date: date
    status: str = "Not Started"
    environment: Optional[str] = None
    area: Optional[str] = None


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    expected_end_date: Optional[date] = None
    status: Optional[str] = None
    environment: Optional[str] = None
    area: Optional[str] = None


class StatusUpdateCreate(BaseModel):
    description: str


class StatusHistoryResponse(BaseModel):
    update_date: date
    description: str

    class Config:
        from_attributes = True