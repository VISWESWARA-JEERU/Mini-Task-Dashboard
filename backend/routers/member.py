"""
Member Module APIs

This router contains APIs used by a team member to:

1. View assigned tasks and subtasks.
2. Create a subtask under an assigned task.
3. Update an existing subtask.
4. Add or edit today's status update.
5. View date-wise status history.

SQLAlchemy 2.0 syntax is used throughout this file.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

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

# Every endpoint in this router starts with /api.
# The tag groups these APIs under "Member Module" in Swagger UI.
router = APIRouter(
    prefix="/api",
    tags=["Member Module"],
)


# ---------------------------------------------------------------------------
# Temporary authentication value
# ---------------------------------------------------------------------------

# This value represents the currently logged-in member during local testing.
#
# Later, replace this constant with the user_id obtained from JWT:
#
# current_user = Depends(get_current_user)
# current_user.user_id
CURRENT_USER_ID = 5


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def get_task_or_404(task_id: int, db: Session) -> Task:
    """
    Fetch a task by its primary key.

    Session.get() is the recommended SQLAlchemy 2.0 approach when retrieving
    one record using its primary-key value.
    """

    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


def get_subtask_or_404(subtask_id: int, db: Session) -> Subtask:
    """
    Fetch a subtask by its primary key.

    Raises a 404 response when the subtask does not exist.
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
    Verify that the main task is assigned to the currently logged-in member.

    A member must not create or modify subtasks belonging to another member.
    """

    if task.resource_id != CURRENT_USER_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this task",
        )


# ---------------------------------------------------------------------------
# GET: Member task grid
# ---------------------------------------------------------------------------

@router.get("/my-tasks")
def get_my_tasks(db: Session = Depends(get_db)):
    """
    Return the tasks and subtasks assigned to the current member.

    The result is formatted for the Member Dashboard grid. For each subtask,
    the API also returns its most recent status description.
    """

    # SQLAlchemy 2.0 SELECT statement:
    #
    # SELECT *
    # FROM tasks
    # WHERE resource_id = CURRENT_USER_ID
    # ORDER BY expected_end_date DESC;
    task_statement = (
        select(Task)
        .where(Task.resource_id == CURRENT_USER_ID)
        .order_by(Task.expected_end_date.desc())
    )

    # db.scalars() extracts Task objects directly from the query result.
    # .all() returns all matching Task objects.
    tasks = db.scalars(task_statement).all()

    result: list[dict] = []

    # Each main task can contain multiple subtasks.
    for task in tasks:
        for subtask in task.subtasks:

            # Fetch the latest status update for the current subtask.
            #
            # ORDER BY update_date DESC places the newest update first.
            # LIMIT 1 returns only the most recent update.
            latest_update_statement = (
                select(StatusUpdate)
                .where(
                    StatusUpdate.subtask_id == subtask.subtask_id
                )
                .order_by(
                    StatusUpdate.update_date.desc(),
                    StatusUpdate.created_at.desc(),
                )
                .limit(1)
            )

            # db.scalar() returns one ORM object or None.
            latest_update = db.scalar(latest_update_statement)

            # Create a frontend-friendly row for the Member Dashboard.
            result.append(
                {
                    "task_id": task.task_id,
                    "main_task": task.title,
                    "main_due": task.expected_end_date,
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
    Create a new subtask under a main task.

    Validation:
    1. The main task must exist.
    2. The task must be assigned to the current member.
    """

    # Find the parent task using its primary key.
    task = get_task_or_404(data.task_id, db)

    # Prevent the member from adding a subtask under someone else's task.
    verify_task_ownership(task)

    # Convert validated Pydantic input into a SQLAlchemy object.
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
        # Add the new object to the current database session.
        db.add(subtask)

        # Permanently save the INSERT operation.
        db.commit()

        # Reload database-generated values such as:
        # subtask_id, created_at and updated_at.
        db.refresh(subtask)

        return subtask

    except SQLAlchemyError as error:
        # Undo pending changes when the database operation fails.
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

    Only the fields supplied by the frontend are changed. Other fields remain
    unchanged.
    """

    # Find the subtask using its primary key.
    subtask = get_subtask_or_404(subtask_id, db)

    # Load the parent task so that ownership can be checked.
    task = get_task_or_404(subtask.task_id, db)
    verify_task_ownership(task)

    # exclude_unset=True includes only fields sent in the PATCH request.
    #
    # Example request:
    # {"status": "Done"}
    #
    # Result:
    # {"status": "Done"}
    update_data = data.model_dump(exclude_unset=True)

    # Dynamically assign each supplied field to the SQLAlchemy object.
    for field_name, field_value in update_data.items():
        setattr(subtask, field_name, field_value)

    try:
        # SQLAlchemy detects changes to the object and generates UPDATE SQL.
        db.commit()
        db.refresh(subtask)

        return subtask

    except SQLAlchemyError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update the subtask",
        ) from error


# ---------------------------------------------------------------------------
# POST: Add or update today's status
# ---------------------------------------------------------------------------

@router.post("/subtasks/{subtask_id}/status-updates")
def add_status_update(
    subtask_id: int,
    data: StatusUpdateCreate,
    db: Session = Depends(get_db),
):
    """
    Add today's status update for a subtask.

    A subtask can have only one status update per calendar date. If today's
    update already exists, this endpoint edits its description rather than
    inserting another row.
    """

    # Verify that the subtask exists.
    subtask = get_subtask_or_404(subtask_id, db)

    # Verify that the subtask belongs to a task assigned to this member.
    task = get_task_or_404(subtask.task_id, db)
    verify_task_ownership(task)

    today = date.today()

    # Search for an existing status entry for this subtask and today's date.
    existing_update_statement = (
        select(StatusUpdate)
        .where(
            StatusUpdate.subtask_id == subtask_id,
            StatusUpdate.update_date == today,
        )
    )

    existing_update = db.scalar(existing_update_statement)

    try:
        if existing_update is not None:
            # Update today's existing description.
            existing_update.description = data.description

            db.commit()
            db.refresh(existing_update)

            return {
                "message": "Today's status update was updated successfully",
                "data": existing_update,
            }

        # No status exists for today, so create a new row.
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
            "message": "Status update was created successfully",
            "data": status_update,
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

@router.get("/subtasks/{subtask_id}/status-history")
def get_status_history(
    subtask_id: int,
    db: Session = Depends(get_db),
):
    """
    Return all date-wise status updates for a subtask.

    The newest status update is returned first.
    """

    # Verify that the subtask exists.
    subtask = get_subtask_or_404(subtask_id, db)

    # Also validate ownership before exposing the status history.
    task = get_task_or_404(subtask.task_id, db)
    verify_task_ownership(task)

    status_history_statement = (
        select(StatusUpdate)
        .where(
            StatusUpdate.subtask_id == subtask_id
        )
        .order_by(
            StatusUpdate.update_date.desc(),
            StatusUpdate.created_at.desc(),
        )
    )

    # Return all matching StatusUpdate ORM objects.
    history = db.scalars(status_history_statement).all()

    return history






















# from fastapi import APIRouter, Depends, HTTPException
# from sqlalchemy.orm import Session
# from datetime import date

# from database import get_db
# from models import Task, Subtask, StatusUpdate
# from schemas import SubtaskCreate, SubtaskUpdate, StatusUpdateCreate

# router = APIRouter(prefix="/api", tags=["Member Module"])


# # temporary logged-in user id for local testing
# CURRENT_USER_ID = 5


# @router.get("/my-tasks")
# def get_my_tasks(db: Session = Depends(get_db)):
#     tasks = (
#         db.query(Task)
#         .filter(Task.resource_id == CURRENT_USER_ID)
#         .order_by(Task.expected_end_date.desc())
#         .all()
#     )

#     result = []

#     for task in tasks:
#         for subtask in task.subtasks:
#             latest_update = (
#                 db.query(StatusUpdate)
#                 .filter(StatusUpdate.subtask_id == subtask.subtask_id)
#                 .order_by(StatusUpdate.update_date.desc())
#                 .first()
#             )

#             result.append({
#                 "main_task": task.title,
#                 "main_due": task.expected_end_date,
#                 "subtask_id": subtask.subtask_id,
#                 "sub_task": subtask.title,
#                 "sub_due": subtask.expected_end_date,
#                 "status": subtask.status,
#                 "environment": subtask.environment,
#                 "area": subtask.area,
#                 "latest_status_desc": latest_update.description if latest_update else None
#             })

#     return result


# @router.post("/subtasks")
# def create_subtask(data: SubtaskCreate, db: Session = Depends(get_db)):
#     task = db.query(Task).filter(Task.task_id == data.task_id).first()

#     if not task:
#         raise HTTPException(status_code=404, detail="Task not found")

#     if task.resource_id != CURRENT_USER_ID:
#         raise HTTPException(status_code=403, detail="You cannot add subtask to another member's task")

#     subtask = Subtask(
#         task_id=data.task_id,
#         title=data.title,
#         expected_end_date=data.expected_end_date,
#         status=data.status,
#         environment=data.environment,
#         area=data.area,
#         created_by=CURRENT_USER_ID
#     )

#     db.add(subtask)
#     db.commit()
#     db.refresh(subtask)

#     return subtask


# @router.patch("/subtasks/{subtask_id}")
# def update_subtask(subtask_id: int, data: SubtaskUpdate, db: Session = Depends(get_db)):
#     subtask = db.query(Subtask).filter(Subtask.subtask_id == subtask_id).first()

#     if not subtask:
#         raise HTTPException(status_code=404, detail="Subtask not found")

#     task = db.query(Task).filter(Task.task_id == subtask.task_id).first()

#     if task.resource_id != CURRENT_USER_ID:
#         raise HTTPException(status_code=403, detail="You cannot update this subtask")

#     update_data = data.model_dump(exclude_unset=True)

#     for key, value in update_data.items():
#         setattr(subtask, key, value)

#     db.commit()
#     db.refresh(subtask)

#     return subtask


# @router.post("/subtasks/{subtask_id}/status-updates")
# def add_status_update(
#     subtask_id: int,
#     data: StatusUpdateCreate,
#     db: Session = Depends(get_db)
# ):
#     subtask = db.query(Subtask).filter(Subtask.subtask_id == subtask_id).first()

#     if not subtask:
#         raise HTTPException(status_code=404, detail="Subtask not found")

#     task = db.query(Task).filter(Task.task_id == subtask.task_id).first()

#     if task.resource_id != CURRENT_USER_ID:
#         raise HTTPException(status_code=403, detail="You cannot update this status")

#     today = date.today()

#     existing_update = (
#         db.query(StatusUpdate)
#         .filter(
#             StatusUpdate.subtask_id == subtask_id,
#             StatusUpdate.update_date == today
#         )
#         .first()
#     )

#     if existing_update:
#         existing_update.description = data.description
#         db.commit()
#         db.refresh(existing_update)
#         return existing_update

#     status_update = StatusUpdate(
#         subtask_id=subtask_id,
#         update_date=today,
#         description=data.description,
#         created_by=CURRENT_USER_ID
#     )

#     db.add(status_update)
#     db.commit()
#     db.refresh(status_update)

#     return status_update


# @router.get("/subtasks/{subtask_id}/status-history")
# def get_status_history(subtask_id: int, db: Session = Depends(get_db)):
#     history = (
#         db.query(StatusUpdate)
#         .filter(StatusUpdate.subtask_id == subtask_id)
#         .order_by(StatusUpdate.update_date.desc())
#         .all()
#     )

#     return history