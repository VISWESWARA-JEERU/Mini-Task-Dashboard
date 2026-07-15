import { Fragment, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CirclePlus,
  Clock3,
  Save,
} from "lucide-react";

import {
  addStatusUpdate,
  updateSubtask,
} from "../services/memberApi";

import StatusHistory from "./StatusHistory";

function MyWorkGrid({
  tasks,
  onRefresh,
  onAddSubtask,
  loading,
  emptyMessage = "No assigned tasks found.",
}) {
  /*
   * Stores the IDs of expanded main tasks.
   *
   * Multiple main tasks can remain expanded at the same time.
   */
  const [expandedTaskIds, setExpandedTaskIds] = useState(
    new Set(),
  );

  /*
   * Stores the currently expanded subtask history.
   */
  const [expandedHistoryId, setExpandedHistoryId] =
    useState(null);

  /*
   * Stores edited status descriptions independently
   * for each subtask.
   */
  const [statusDescriptions, setStatusDescriptions] =
    useState({});

  const [savingStatusId, setSavingStatusId] =
    useState(null);

  const [updatingSubtaskId, setUpdatingSubtaskId] =
    useState(null);

  /*
   * Used to reload StatusHistory immediately after
   * saving a daily update.
   */
  const [historyRefreshKeys, setHistoryRefreshKeys] =
    useState({});

  /*
   * Convert the flat API response into:
   *
   * Main Task
   *   ├── Subtask 1
   *   ├── Subtask 2
   *   └── Subtask 3
   */
  const groupedTasks = useMemo(() => {
    const groups = new Map();

    tasks.forEach((item) => {
      if (!groups.has(item.task_id)) {
        groups.set(item.task_id, {
          task_id: item.task_id,
          main_task: item.main_task,
          main_due: item.main_due,
          main_status: item.main_status,
          task_created_at: item.task_created_at,
          subtasks: [],
        });
      }

      if (
        item.subtask_id !== null &&
        item.subtask_id !== undefined
      ) {
        groups.get(item.task_id).subtasks.push(item);
      }
    });

    return Array.from(groups.values());
  }, [tasks]);

  /*
   * Main-task status is calculated from all its subtasks.
   *
   * Rules:
   * 1. All subtasks Done        -> Done
   * 2. At least one started     -> In-Progress
   * 3. All Not Started          -> Not Started
   */
  const getMainTaskStatus = (subtasks) => {
    if (subtasks.length === 0) {
      return "Not Started";
    }

    const allCompleted = subtasks.every(
      (subtask) => subtask.status === "Done",
    );

    if (allCompleted) {
      return "Done";
    }

    const anyWorkStarted = subtasks.some(
      (subtask) =>
        subtask.status === "In-Progress" ||
        subtask.status === "Done",
    );

    if (anyWorkStarted) {
      return "In-Progress";
    }

    return "Not Started";
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Done":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";

      case "In-Progress":
        return "border-blue-200 bg-blue-50 text-blue-700";

      default:
        return "border-amber-200 bg-amber-50 text-amber-700";
    }
  };

  const toggleMainTask = (taskId) => {
    setExpandedTaskIds((previous) => {
      const updated = new Set(previous);

      if (updated.has(taskId)) {
        updated.delete(taskId);
      } else {
        updated.add(taskId);
      }

      return updated;
    });
  };

  const toggleHistory = (subtaskId) => {
    setExpandedHistoryId((currentId) =>
      currentId === subtaskId ? null : subtaskId,
    );
  };

  const handleSubtaskUpdate = async (
    subtaskId,
    field,
    value,
  ) => {
    try {
      setUpdatingSubtaskId(subtaskId);

      await updateSubtask(subtaskId, {
        [field]: value,
      });

      await onRefresh();
    } catch (error) {
      console.error(
        "Error updating subtask:",
        error,
      );

      alert(
        error.response?.data?.detail ||
          "Unable to update the subtask.",
      );
    } finally {
      setUpdatingSubtaskId(null);
    }
  };

  const handleStatusDescriptionChange = (
    subtaskId,
    value,
  ) => {
    if (value.length > 2000) {
      return;
    }

    setStatusDescriptions((previous) => ({
      ...previous,
      [subtaskId]: value,
    }));
  };

  const handleSaveStatus = async (subtaskId) => {
    const description =
      statusDescriptions[subtaskId]?.trim();

    if (!description) {
      alert("Please enter a status description.");
      return;
    }

    try {
      setSavingStatusId(subtaskId);

      await addStatusUpdate(subtaskId, {
        description,
      });

      await onRefresh();

      /*
       * Remove local edited data so that the textarea
       * displays the refreshed value from the backend.
       */
      setStatusDescriptions((previous) => {
        const updated = {
          ...previous,
        };

        delete updated[subtaskId];

        return updated;
      });

      /*
       * Refresh history when it is already open.
       */
      setHistoryRefreshKeys((previous) => ({
        ...previous,
        [subtaskId]:
          (previous[subtaskId] || 0) + 1,
      }));
    } catch (error) {
      console.error(
        "Error saving status update:",
        error,
      );

      alert(
        error.response?.data?.detail ||
          "Unable to save the status update.",
      );
    } finally {
      setSavingStatusId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

        <p className="mt-4 text-sm font-medium text-slate-600">
          Loading assigned tasks...
        </p>
      </div>
    );
  }

  if (groupedTasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <p className="font-semibold text-slate-700">
          {emptyMessage}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Newly assigned tasks will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedTasks.map((taskGroup) => {
        const isTaskExpanded =
          expandedTaskIds.has(taskGroup.task_id);

        const calculatedMainStatus =
          getMainTaskStatus(taskGroup.subtasks);

        const completedCount =
          taskGroup.subtasks.filter(
            (subtask) =>
              subtask.status === "Done",
          ).length;

        const totalSubtasks =
          taskGroup.subtasks.length;

        return (
          <section
            key={`task-${taskGroup.task_id}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            {/* Main-task row */}
            <div className="flex flex-col gap-4 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  toggleMainTask(
                    taskGroup.task_id,
                  )
                }
                className="flex flex-1 items-start gap-4 text-left"
              >
                <span className="mt-0.5 rounded-xl bg-blue-600 p-2.5 text-white">
                  <CalendarDays size={19} />
                </span>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Main Task
                  </p>

                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    {taskGroup.main_task}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      Due:{" "}
                      <strong className="text-slate-700">
                        {taskGroup.main_due}
                      </strong>
                    </span>

                    <span>
                      Progress:{" "}
                      <strong className="text-slate-700">
                        {completedCount}/{totalSubtasks}
                      </strong>
                    </span>
                  </div>
                </div>
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusBadgeClass(
                    calculatedMainStatus,
                  )}`}
                >
                  {calculatedMainStatus === "Done" ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Clock3 size={14} />
                  )}

                  {calculatedMainStatus}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    onAddSubtask?.(
                      taskGroup.task_id,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <CirclePlus size={16} />
                  Add Subtask
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toggleMainTask(
                      taskGroup.task_id,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {isTaskExpanded ? (
                    <>
                      <ChevronUp size={17} />
                      Collapse
                    </>
                  ) : (
                    <>
                      <ChevronDown size={17} />
                      Expand
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Subtasks */}
            {isTaskExpanded && (
              <div className="border-t border-slate-200">
                {totalSubtasks === 0 ? (
                  <div className="p-8 text-center">
                    <CirclePlus
                      size={28}
                      className="mx-auto text-amber-500"
                    />

                    <p className="mt-3 font-semibold text-slate-800">
                      No subtask created
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Create at least one subtask to begin progress tracking.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        onAddSubtask?.(
                          taskGroup.task_id,
                        )
                      }
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <CirclePlus size={16} />
                      Create Subtask
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[1150px] w-full text-sm">
                      <thead className="bg-slate-950 text-white">
                        <tr>
                          <th className="w-64 px-4 py-3 text-left">
                            Subtask
                          </th>

                          <th className="w-32 px-4 py-3 text-left">
                            Due Date
                          </th>

                          <th className="min-w-72 px-4 py-3 text-left">
                            Daily Status
                          </th>

                          <th className="w-40 px-4 py-3 text-left">
                            Status
                          </th>

                          <th className="w-32 px-4 py-3 text-left">
                            Environment
                          </th>

                          <th className="w-28 px-4 py-3 text-left">
                            Area
                          </th>

                          <th className="w-24 px-4 py-3 text-center">
                            History
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {taskGroup.subtasks.map(
                          (item, index) => {
                            const subtaskId =
                              item.subtask_id;

                            const currentDescription =
                              statusDescriptions[
                                subtaskId
                              ] ??
                              item.latest_status_desc ??
                              "";

                            const isSaving =
                              savingStatusId ===
                              subtaskId;

                            const isUpdating =
                              updatingSubtaskId ===
                              subtaskId;

                            const isHistoryExpanded =
                              expandedHistoryId ===
                              subtaskId;

                            return (
                              <Fragment
                                key={`subtask-${subtaskId}`}
                              >
                                <tr className="border-b border-slate-200 align-top hover:bg-slate-50">
                                  <td className="px-4 py-4">
                                    <div className="flex items-start gap-3">
                                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                        {index + 1}
                                      </span>

                                      <p className="font-semibold text-slate-800">
                                        {item.sub_task}
                                      </p>
                                    </div>
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                                    {item.sub_due}
                                  </td>

                                  <td className="px-4 py-4">
                                    <textarea
                                      rows={2}
                                      value={
                                        currentDescription
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        handleStatusDescriptionChange(
                                          subtaskId,
                                          event.target
                                            .value,
                                        )
                                      }
                                      maxLength={2000}
                                      placeholder="Enter today's update..."
                                      className="h-16 w-full min-w-64 resize-none rounded-xl border border-slate-300 p-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />

                                    <div className="mt-2 flex items-center justify-between gap-2">
                                      <span className="text-xs text-slate-400">
                                        {
                                          currentDescription.length
                                        }
                                        /2000
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSaveStatus(
                                            subtaskId,
                                          )
                                        }
                                        disabled={
                                          isSaving ||
                                          !statusDescriptions[
                                            subtaskId
                                          ]?.trim()
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <Save
                                          size={13}
                                        />

                                        {isSaving
                                          ? "Saving..."
                                          : "Save"}
                                      </button>
                                    </div>
                                  </td>

                                  <td className="px-4 py-4">
                                    <select
                                      value={
                                        item.status
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        handleSubtaskUpdate(
                                          subtaskId,
                                          "status",
                                          event.target
                                            .value,
                                        )
                                      }
                                      disabled={
                                        isUpdating
                                      }
                                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    >
                                      <option value="Not Started">
                                        Not Started
                                      </option>

                                      <option value="In-Progress">
                                        In-Progress
                                      </option>

                                      <option value="Done">
                                        Done
                                      </option>
                                    </select>
                                  </td>

                                  <td className="px-4 py-4">
                                    <select
                                      value={
                                        item.environment ||
                                        ""
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        handleSubtaskUpdate(
                                          subtaskId,
                                          "environment",
                                          event.target
                                            .value,
                                        )
                                      }
                                      disabled={
                                        isUpdating
                                      }
                                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
                                    >
                                      <option value="">
                                        Select
                                      </option>
                                      <option value="Dev">
                                        Dev
                                      </option>
                                      <option value="Prod">
                                        Prod
                                      </option>
                                    </select>
                                  </td>

                                  <td className="px-4 py-4">
                                    <select
                                      value={
                                        item.area || ""
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        handleSubtaskUpdate(
                                          subtaskId,
                                          "area",
                                          event.target
                                            .value,
                                        )
                                      }
                                      disabled={
                                        isUpdating
                                      }
                                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
                                    >
                                      <option value="">
                                        Select
                                      </option>
                                      <option value="Backend">
                                        Backend
                                      </option>
                                      <option value="UI">
                                        UI
                                      </option>
                                    </select>
                                  </td>

                                  <td className="px-4 py-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleHistory(
                                          subtaskId,
                                        )
                                      }
                                      className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                                      aria-expanded={
                                        isHistoryExpanded
                                      }
                                    >
                                      {isHistoryExpanded ? (
                                        <ChevronUp
                                          size={18}
                                        />
                                      ) : (
                                        <ChevronRight
                                          size={18}
                                        />
                                      )}
                                    </button>
                                  </td>
                                </tr>

                                {isHistoryExpanded && (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="bg-slate-50 px-6 py-5"
                                    >
                                      <StatusHistory
                                        subtaskId={
                                          subtaskId
                                        }
                                        refreshKey={
                                          historyRefreshKeys[
                                            subtaskId
                                          ] || 0
                                        }
                                      />
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default MyWorkGrid;