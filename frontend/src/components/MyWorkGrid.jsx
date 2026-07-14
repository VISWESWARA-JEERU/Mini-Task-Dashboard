import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp, Save } from "lucide-react";

import {
  addStatusUpdate,
  updateSubtask,
} from "../services/memberApi";
import StatusHistory from "./StatusHistory";

function MyWorkGrid({
  tasks,
  onRefresh,
  loading,
  emptyMessage = "No tasks found.",
}) {
  const [expandedRow, setExpandedRow] = useState(null);
  const [statusDescriptions, setStatusDescriptions] = useState({});
  const [savingStatusId, setSavingStatusId] = useState(null);
  const [updatingSubtaskId, setUpdatingSubtaskId] = useState(null);

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
      console.error("Error updating subtask:", error);

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
    if (value.length <= 2000) {
      setStatusDescriptions((previous) => ({
        ...previous,
        [subtaskId]: value,
      }));
    }
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

      setStatusDescriptions((previous) => ({
        ...previous,
        [subtaskId]: "",
      }));

      await onRefresh();
    } catch (error) {
      console.error("Error saving status update:", error);

      alert(
        error.response?.data?.detail ||
          "Unable to save the status update.",
      );
    } finally {
      setSavingStatusId(null);
    }
  };

  const toggleHistory = (subtaskId) => {
    setExpandedRow((currentRow) =>
      currentRow === subtaskId ? null : subtaskId,
    );
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        <p className="text-sm font-medium text-slate-600">
          Loading tasks...
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="whitespace-nowrap p-3 text-left">
                Main Task
              </th>

              <th className="whitespace-nowrap p-3 text-left">
                Main Due
              </th>

              <th className="whitespace-nowrap p-3 text-left">
                Sub Task
              </th>

              <th className="whitespace-nowrap p-3 text-left">
                Sub Due
              </th>

              <th className="min-w-80 p-3 text-left">
                Status Description
              </th>

              <th className="whitespace-nowrap p-3 text-left">
                Status
              </th>

              <th className="whitespace-nowrap p-3 text-left">
                Environment
              </th>

              <th className="whitespace-nowrap p-3 text-left">
                Area
              </th>

              <th className="whitespace-nowrap p-3 text-center">
                History
              </th>
            </tr>
          </thead>

          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="p-10 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              tasks.map((item) => {
                const currentDescription =
                  statusDescriptions[item.subtask_id] ??
                  item.latest_status_desc ??
                  "";

                const isSaving =
                  savingStatusId === item.subtask_id;

                const isUpdating =
                  updatingSubtaskId === item.subtask_id;

                const isExpanded =
                  expandedRow === item.subtask_id;

                return (
                  <Fragment key={item.subtask_id}>
                    <tr className="border-b border-slate-200 align-top hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-800">
                        {item.main_task}
                      </td>

                      <td className="whitespace-nowrap p-3 text-slate-600">
                        {item.main_due}
                      </td>

                      <td className="p-3 text-slate-700">
                        {item.sub_task}
                      </td>

                      <td className="whitespace-nowrap p-3 text-slate-600">
                        {item.sub_due}
                      </td>

                      <td className="p-3">
                        <textarea
                          value={currentDescription}
                          onChange={(event) =>
                            handleStatusDescriptionChange(
                              item.subtask_id,
                              event.target.value,
                            )
                          }
                          className="h-24 w-80 resize-none rounded-lg border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          maxLength={2000}
                          placeholder="Enter today's status update..."
                        />

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            {currentDescription.length}/2000
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleSaveStatus(
                                item.subtask_id,
                              )
                            }
                            disabled={
                              isSaving ||
                              !statusDescriptions[
                                item.subtask_id
                              ]?.trim()
                            }
                            className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Save size={13} />

                            {isSaving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </td>

                      <td className="p-3">
                        <select
                          value={item.status}
                          onChange={(event) =>
                            handleSubtaskUpdate(
                              item.subtask_id,
                              "status",
                              event.target.value,
                            )
                          }
                          disabled={isUpdating}
                          className="rounded-lg border border-slate-300 px-2 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
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

                      <td className="p-3">
                        <select
                          value={item.environment || ""}
                          onChange={(event) =>
                            handleSubtaskUpdate(
                              item.subtask_id,
                              "environment",
                              event.target.value,
                            )
                          }
                          disabled={isUpdating}
                          className="rounded-lg border border-slate-300 px-2 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="">Select</option>
                          <option value="Dev">Dev</option>
                          <option value="Prod">Prod</option>
                        </select>
                      </td>

                      <td className="p-3">
                        <select
                          value={item.area || ""}
                          onChange={(event) =>
                            handleSubtaskUpdate(
                              item.subtask_id,
                              "area",
                              event.target.value,
                            )
                          }
                          disabled={isUpdating}
                          className="rounded-lg border border-slate-300 px-2 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="">Select</option>
                          <option value="Backend">
                            Backend
                          </option>
                          <option value="UI">UI</option>
                        </select>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            toggleHistory(
                              item.subtask_id,
                            )
                          }
                          className="rounded-full bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200"
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded
                              ? "Collapse status history"
                              : "Expand status history"
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={9}
                          className="border-b border-slate-200 bg-slate-50 p-4"
                        >
                          <StatusHistory
                            subtaskId={item.subtask_id}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MyWorkGrid;