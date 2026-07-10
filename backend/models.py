from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint("role IN ('admin','manager','member')", name="check_user_role"),
    )


class Task(Base):
    __tablename__ = "tasks"

    task_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    resource_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    expected_end_date = Column(Date, nullable=False)
    status = Column(String(20), default="Not Started", nullable=False)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete")

    __table_args__ = (
        CheckConstraint(
            "status IN ('Not Started','In-Progress','Done')",
            name="check_task_status"
        ),
    )


class Subtask(Base):
    __tablename__ = "subtasks"

    subtask_id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.task_id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    expected_end_date = Column(Date, nullable=False)
    status = Column(String(20), default="Not Started", nullable=False)
    environment = Column(String(10))
    area = Column(String(20))
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    task = relationship("Task", back_populates="subtasks")
    status_updates = relationship("StatusUpdate", back_populates="subtask", cascade="all, delete")

    __table_args__ = (
        CheckConstraint(
            "status IN ('Not Started','In-Progress','Done')",
            name="check_subtask_status"
        ),
        CheckConstraint(
            "environment IN ('Dev','Prod')",
            name="check_environment"
        ),
        CheckConstraint(
            "area IN ('Backend','UI')",
            name="check_area"
        ),
    )


class StatusUpdate(Base):
    __tablename__ = "status_updates"

    update_id = Column(Integer, primary_key=True, index=True)
    subtask_id = Column(Integer, ForeignKey("subtasks.subtask_id", ondelete="CASCADE"), nullable=False)
    update_date = Column(Date, server_default=func.current_date(), nullable=False)
    description = Column(String(2000), nullable=False)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    subtask = relationship("Subtask", back_populates="status_updates")

    __table_args__ = (
        UniqueConstraint("subtask_id", "update_date", name="unique_subtask_update_per_day"),
    )