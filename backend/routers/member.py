"""
Member Module APIs

This router provides APIs for the team-member dashboard.

Features:
1. Fetch main tasks assigned to the current member.
2. Fetch assigned tasks and their subtasks.
3. Fetch dashboard KPI counts.
4. Create a subtask.
5. Update a subtask.
6. Add or update today's status description.
7. Fetch date-wise status history.

SQLAlchemy 2.0 query syntax is used throughout this file.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import StatusUpdate, Subtask, Task
from schemas import (
    StatusUpdateCreate,
    SubtaskCreate,
    SubtaskUpdate,
)


# ---------------------------------------------------------------------------
# Router configuration
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/api",
    tags=["Member Module"],
)


# ---------------------------------------------------------------------------
# Temporary logged-in user
# ---------------------------------------------------------------------------

# This user ID is used only for local testing.
#
# Based on your inserted users, confirm the correct user_id for Jeeru V:
#
# SELECT user_id, name, email
# FROM users
# ORDER BY user_id;
#
# Later, replace this with the user ID extracted from the JWT token.
CURRENT_USER_ID = 5


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def get_task_or_404(
    task_id: int,
    db: Session,
) -> Task:
    """
    Fetch a task using its primary key.

    Raises:
        HTTPException 404: When the task does not exist.
    """

    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


def get_subtask_or_404(
    subtask_id: int,
    db: Session,
) -> Subtask:
    """
    Fetch a subtask using its primary key.

    Raises:
        HTTPException 404: When the subtask does not exist.
    """

    subtask = db.get(Subtask, subtask_id)

    if subtask is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subtask not found",
        )

    return subtask


def verify_task_ownership(task: Task) -> None:
    """
    Verify that the task belongs to the current member.

    A member must not create or update subtasks belonging
    to another user.
    """

    if task.resource_id != CURRENT_USER_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this task",
        )


# ---------------------------------------------------------------------------
# GET: Main tasks for Add Subtask dropdown
# ---------------------------------------------------------------------------

@router.get("/my-main-tasks")
def get_my_main_tasks(
    db: Session = Depends(get_db),
):
    """
    Return all main tasks assigned to the current member.

    This API is mainly used to populate the Main Task dropdown
    inside the Add Subtask modal.

    Each main task is returned only once, even when it has
    multiple subtasks.
    """

    statement = (
        select(Task)
        .where(Task.resource_id == CURRENT_USER_ID)
        .order_by(
            Task.expected_end_date.asc(),
            Task.task_id.asc(),
        )
    )

    tasks = db.scalars(statement).all()

    return [
        {
            "task_id": task.task_id,
            "title": task.title,
            "expected_end_date": task.expected_end_date,
            "status": task.status,
            "created_at": task.created_at,
        }
        for task in tasks
    ]


# ---------------------------------------------------------------------------
# GET: Member task grid
# ---------------------------------------------------------------------------

@router.get("/my-tasks")
def get_my_tasks(
    db: Session = Depends(get_db),
):
    """
    Return all tasks assigned to the current member.

    The response is formatted for the Member Dashboard grid.

    Tasks without subtasks are also returned so that a newly assigned
    main task remains visible before the member creates a subtask.
    """

    statement = (
        select(Task)
        .options(
            selectinload(Task.subtasks)
            .selectinload(Subtask.status_updates)
        )
        .where(Task.resource_id == CURRENT_USER_ID)
        .order_by(
            Task.expected_end_date.desc(),
            Task.task_id.desc(),
        )
    )

    tasks = db.scalars(statement).unique().all()

    result: list[dict] = []

    for task in tasks:

        # A newly assigned main task may not yet have any subtasks.
        if not task.subtasks:
            result.append(
                {
                    "task_id": task.task_id,
                    "main_task": task.title,
                    "main_due": task.expected_end_date,
                    "main_status": task.status,
                    "task_created_at": task.created_at,

                    "subtask_id": None,
                    "sub_task": None,
                    "sub_due": None,
                    "status": task.status,
                    "environment": None,
                    "area": None,
                    "latest_status_desc": None,
                }
            )

            continue

        for subtask in task.subtasks:

            # Status updates are sorted in Python because they were
            # preloaded using selectinload().
            latest_update = None

            if subtask.status_updates:
                latest_update = max(
                    subtask.status_updates,
                    key=lambda update: (
                        update.update_date,
                        update.created_at,
                    ),
                )

            result.append(
                {
                    "task_id": task.task_id,
                    "main_task": task.title,
                    "main_due": task.expected_end_date,
                    "main_status": task.status,
                    "task_created_at": task.created_at,

                    "subtask_id": subtask.subtask_id,
                    "sub_task": subtask.title,
                    "sub_due": subtask.expected_end_date,
                    "status": subtask.status,
                    "environment": subtask.environment,
                    "area": subtask.area,
                    "latest_status_desc": (
                        latest_update.description
                        if latest_update is not None
                        else None
                    ),
                }
            )

    return result


# ---------------------------------------------------------------------------
# GET: Dashboard KPI summary
# ---------------------------------------------------------------------------

@router.get("/dashboard-summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
):
    """
    Return task counts for the reusable KPI cards.

    Current supported statuses:
    - Not Started
    - In-Progress
    - Done

    The summary is based on subtasks. If a main task has no subtasks,
    the main task status is also counted.
    """

    statement = (
        select(Task)
        .options(selectinload(Task.subtasks))
        .where(Task.resource_id == CURRENT_USER_ID)
    )

    tasks = db.scalars(statement).unique().all()

    statuses: list[str] = []

    for task in tasks:
        if task.subtasks:
            statuses.extend(
                subtask.status
                for subtask in task.subtasks
            )
        else:
            statuses.append(task.status)

    return {
        "total": len(statuses),
        "completed": sum(
            current_status == "Done"
            for current_status in statuses
        ),
        "in_progress": sum(
            current_status == "In-Progress"
            for current_status in statuses
        ),
        "pending": sum(
            current_status == "Not Started"
            for current_status in statuses
        ),
    }


# ---------------------------------------------------------------------------
# POST: Create subtask
# ---------------------------------------------------------------------------

@router.post(
    "/subtasks",
    status_code=status.HTTP_201_CREATED,
)
def create_subtask(
    data: SubtaskCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new subtask under an assigned main task.

    Validation:
    1. The selected main task must exist.
    2. The task must belong to the current member.
    3. The subtask due date must not exceed the main-task due date.
    """

    task = get_task_or_404(
        task_id=data.task_id,
        db=db,
    )

    verify_task_ownership(task)

    if data.expected_end_date > task.expected_end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Subtask expected end date cannot be later "
                "than the main task expected end date"
            ),
        )

    subtask = Subtask(
        task_id=data.task_id,
        title=data.title,
        expected_end_date=data.expected_end_date,
        status=data.status,
        environment=data.environment,
        area=data.area,
        created_by=CURRENT_USER_ID,
    )

    try:
        db.add(subtask)
        db.commit()
        db.refresh(subtask)

        return {
            "message": "Subtask created successfully",
            "data": {
                "subtask_id": subtask.subtask_id,
                "task_id": subtask.task_id,
                "title": subtask.title,
                "expected_end_date": subtask.expected_end_date,
                "status": subtask.status,
                "environment": subtask.environment,
                "area": subtask.area,
                "created_by": subtask.created_by,
                "created_at": subtask.created_at,
            },
        }

    except SQLAlchemyError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create the subtask",
        ) from error


# ---------------------------------------------------------------------------
# PATCH: Update subtask
# ---------------------------------------------------------------------------

@router.patch("/subtasks/{subtask_id}")
def update_subtask(
    subtask_id: int,
    data: SubtaskUpdate,
    db: Session = Depends(get_db),
):
    """
    Partially update an existing subtask.

    Only the values supplied in the PATCH request are updated.
    """

    subtask = get_subtask_or_404(
        subtask_id=subtask_id,
        db=db,
    )

    task = get_task_or_404(
        task_id=subtask.task_id,
        db=db,
    )

    verify_task_ownership(task)

    update_data = data.model_dump(
        exclude_unset=True,
    )

    new_due_date = update_data.get(
        "expected_end_date",
    )

    if (
        new_due_date is not None
        and new_due_date > task.expected_end_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Subtask expected end date cannot be later "
                "than the main task expected end date"
            ),
        )

    for field_name, field_value in update_data.items():
        setattr(
            subtask,
            field_name,
            field_value,
        )

    try:
        db.commit()
        db.refresh(subtask)

        return {
            "message": "Subtask updated successfully",
            "data": {
                "subtask_id": subtask.subtask_id,
                "task_id": subtask.task_id,
                "title": subtask.title,
                "expected_end_date": subtask.expected_end_date,
                "status": subtask.status,
                "environment": subtask.environment,
                "area": subtask.area,
                "updated_at": subtask.updated_at,
            },
        }

    except SQLAlchemyError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update the subtask",
        ) from error


# ---------------------------------------------------------------------------
# POST: Add or update today's status
# ---------------------------------------------------------------------------

@router.post(
    "/subtasks/{subtask_id}/status-updates"
)
def add_status_update(
    subtask_id: int,
    data: StatusUpdateCreate,
    db: Session = Depends(get_db),
):
    """
    Add today's progress description for a subtask.

    Only one status update is stored per subtask per calendar date.
    If today's update already exists, its description is updated.
    """

    subtask = get_subtask_or_404(
        subtask_id=subtask_id,
        db=db,
    )

    task = get_task_or_404(
        task_id=subtask.task_id,
        db=db,
    )

    verify_task_ownership(task)

    today = date.today()

    statement = (
        select(StatusUpdate)
        .where(
            StatusUpdate.subtask_id == subtask_id,
            StatusUpdate.update_date == today,
        )
    )

    existing_update = db.scalar(statement)

    try:
        if existing_update is not None:
            existing_update.description = data.description

            db.commit()
            db.refresh(existing_update)

            return {
                "message": (
                    "Today's status update was updated successfully"
                ),
                "data": {
                    "update_id": existing_update.update_id,
                    "subtask_id": existing_update.subtask_id,
                    "update_date": existing_update.update_date,
                    "description": existing_update.description,
                    "created_by": existing_update.created_by,
                    "created_at": existing_update.created_at,
                },
            }

        status_update = StatusUpdate(
            subtask_id=subtask_id,
            update_date=today,
            description=data.description,
            created_by=CURRENT_USER_ID,
        )

        db.add(status_update)
        db.commit()
        db.refresh(status_update)

        return {
            "message": "Status update created successfully",
            "data": {
                "update_id": status_update.update_id,
                "subtask_id": status_update.subtask_id,
                "update_date": status_update.update_date,
                "description": status_update.description,
                "created_by": status_update.created_by,
                "created_at": status_update.created_at,
            },
        }

    except SQLAlchemyError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save the status update",
        ) from error


# ---------------------------------------------------------------------------
# GET: Status history
# ---------------------------------------------------------------------------

@router.get(
    "/subtasks/{subtask_id}/status-history"
)
def get_status_history(
    subtask_id: int,
    db: Session = Depends(get_db),
):
    """
    Return all date-wise status updates for a subtask.

    Results are returned in latest-first order.
    """

    subtask = get_subtask_or_404(
        subtask_id=subtask_id,
        db=db,
    )

    task = get_task_or_404(
        task_id=subtask.task_id,
        db=db,
    )

    verify_task_ownership(task)

    statement = (
        select(StatusUpdate)
        .where(
            StatusUpdate.subtask_id == subtask_id
        )
        .order_by(
            StatusUpdate.update_date.desc(),
            StatusUpdate.created_at.desc(),
        )
    )

    history = db.scalars(statement).all()

    return [
        {
            "update_id": update.update_id,
            "subtask_id": update.subtask_id,
            "update_date": update.update_date,
            "description": update.description,
            "created_by": update.created_by,
            "created_at": update.created_at,
        }
        for update in history
    ]