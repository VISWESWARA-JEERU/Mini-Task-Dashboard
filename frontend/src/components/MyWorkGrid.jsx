import { useState } from "react";
import { ChevronDown, ChevronUp, Save } from "lucide-react";
import { updateSubtask, addStatusUpdate } from "../services/memberApi";
import StatusHistory from "./StatusHistory";

export default function MyWorkGrid({ tasks, onRefresh, loading }) {
  const [expandedRow, setExpandedRow] = useState(null);
  const [statusDescriptions, setStatusDescriptions] = useState({});

  const handleSubtaskUpdate = async (subtaskId, field, value) => {
    try {
      await updateSubtask(subtaskId, { [field]: value });
      onRefresh();
    } catch (error) {
      console.error("Error updating subtask:", error);
    }
  };

  const handleStatusDescriptionChange = (subtaskId, value) => {
    if (value.length <= 2000) {
      setStatusDescriptions((prev) => ({
        ...prev,
        [subtaskId]: value,
      }));
    }
  };

  const handleSaveStatus = async (subtaskId) => {
    const description = statusDescriptions[subtaskId];

    if (!description || description.trim() === "") {
      alert("Please enter status description");
      return;
    }

    try {
      await addStatusUpdate(subtaskId, { description });
      setStatusDescriptions((prev) => ({
        ...prev,
        [subtaskId]: "",
      }));
      onRefresh();
    } catch (error) {
      console.error("Error saving status update:", error);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-900 text-white">
          <tr>
            <th className="p-3 text-left">Main Task</th>
            <th className="p-3 text-left">Main Due</th>
            <th className="p-3 text-left">Sub Task</th>
            <th className="p-3 text-left">Sub Due</th>
            <th className="p-3 text-left">Status Description</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Env</th>
            <th className="p-3 text-left">Area</th>
            <th className="p-3 text-center">History</th>
          </tr>
        </thead>

        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan="9" className="p-6 text-center text-slate-500">
                No subtasks found. Add your first subtask.
              </td>
            </tr>
          ) : (
            tasks.map((item) => (
              <>
                <tr key={item.subtask_id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">
                    {item.main_task}
                  </td>

                  <td className="p-3">{item.main_due}</td>

                  <td className="p-3">{item.sub_task}</td>

                  <td className="p-3">{item.sub_due}</td>

                  <td className="p-3">
                    <textarea
                      value={
                        statusDescriptions[item.subtask_id] ??
                        item.latest_status_desc ??
                        ""
                      }
                      onChange={(e) =>
                        handleStatusDescriptionChange(
                          item.subtask_id,
                          e.target.value
                        )
                      }
                      className="h-20 w-72 rounded-lg border border-slate-300 p-2 text-sm"
                      maxLength={2000}
                    />

                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {(statusDescriptions[item.subtask_id] ?? "").length}
                        /2000
                      </span>

                      <button
                        onClick={() => handleSaveStatus(item.subtask_id)}
                        className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white"
                      >
                        <Save size={13} />
                        Save
                      </button>
                    </div>
                  </td>

                  <td className="p-3">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleSubtaskUpdate(
                          item.subtask_id,
                          "status",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1"
                    >
                      <option>Not Started</option>
                      <option>In-Progress</option>
                      <option>Done</option>
                    </select>
                  </td>

                  <td className="p-3">
                    <select
                      value={item.environment || ""}
                      onChange={(e) =>
                        handleSubtaskUpdate(
                          item.subtask_id,
                          "environment",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1"
                    >
                      <option value="">Select</option>
                      <option value="Dev">Dev</option>
                      <option value="Prod">Prod</option>
                    </select>
                  </td>

                  <td className="p-3">
                    <select
                      value={item.area || ""}
                      onChange={(e) =>
                        handleSubtaskUpdate(
                          item.subtask_id,
                          "area",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1"
                    >
                      <option value="">Select</option>
                      <option value="Backend">Backend</option>
                      <option value="UI">UI</option>
                    </select>
                  </td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === item.subtask_id
                            ? null
                            : item.subtask_id
                        )
                      }
                      className="rounded-full bg-slate-100 p-2"
                    >
                      {expandedRow === item.subtask_id ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>
                  </td>
                </tr>

                {expandedRow === item.subtask_id && (
                  <tr>
                    <td colSpan="9" className="bg-slate-50 p-4">
                      <StatusHistory subtaskId={item.subtask_id} />
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}