import { useState } from "react";
import { X } from "lucide-react";
import { createSubtask, addStatusUpdate } from "../services/memberApi";

export default function AddSubtaskModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    task_id: "",
    title: "",
    expected_end_date: "",
    status: "Not Started",
    environment: "Dev",
    area: "Backend",
    description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "description" && value.length > 2000) return;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const subtask = await createSubtask({
        task_id: Number(formData.task_id),
        title: formData.title,
        expected_end_date: formData.expected_end_date,
        status: formData.status,
        environment: formData.environment,
        area: formData.area,
      });

      if (formData.description.trim()) {
        await addStatusUpdate(subtask.subtask_id, {
          description: formData.description,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating subtask:", error);
      alert("Failed to create subtask. Check task_id and backend.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Add Subtask</h2>

          <button onClick={onClose} className="rounded-full bg-slate-100 p-2">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="number"
            name="task_id"
            placeholder="Main Task ID"
            value={formData.task_id}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-slate-300 p-3"
          />

          <input
            type="text"
            name="title"
            placeholder="Subtask title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-slate-300 p-3"
          />

          <input
            type="date"
            name="expected_end_date"
            value={formData.expected_end_date}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-slate-300 p-3"
          />

          <div className="grid grid-cols-3 gap-4">
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="rounded-lg border border-slate-300 p-3"
            >
              <option>Not Started</option>
              <option>In-Progress</option>
              <option>Done</option>
            </select>

            <select
              name="environment"
              value={formData.environment}
              onChange={handleChange}
              className="rounded-lg border border-slate-300 p-3"
            >
              <option value="Dev">Dev</option>
              <option value="Prod">Prod</option>
            </select>

            <select
              name="area"
              value={formData.area}
              onChange={handleChange}
              className="rounded-lg border border-slate-300 p-3"
            >
              <option value="Backend">Backend</option>
              <option value="UI">UI</option>
            </select>
          </div>

          <div>
            <textarea
              name="description"
              placeholder="Status Description"
              value={formData.description}
              onChange={handleChange}
              className="h-32 w-full rounded-lg border border-slate-300 p-3"
            />

            <p className="mt-1 text-right text-xs text-slate-400">
              {formData.description.length}/2000
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-200 px-5 py-2 font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white"
            >
              Save Subtask
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}