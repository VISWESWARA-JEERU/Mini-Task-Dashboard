import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  X,
} from "lucide-react";

import {
  addStatusUpdate,
  createSubtask,
  getMyMainTasks,
} from "../services/memberApi";

function AddSubtaskModal({
  onClose,
  onSuccess,
  initialTaskId = "",
}) {
  const [mainTasks, setMainTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    task_id: initialTaskId
      ? String(initialTaskId)
      : "",
    title: "",
    expected_end_date: "",
    status: "Not Started",
    environment: "Dev",
    area: "Backend",
    description: "",
  });

  useEffect(() => {
    const fetchMainTasks = async () => {
      try {
        setLoadingTasks(true);
        setErrorMessage("");

        const data = await getMyMainTasks();

        setMainTasks(
          Array.isArray(data) ? data : [],
        );
      } catch (error) {
        console.error(
          "Error fetching main tasks:",
          error,
        );

        setErrorMessage(
          error.response?.data?.detail ||
            "Unable to load assigned main tasks.",
        );
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchMainTasks();
  }, []);

  useEffect(() => {
    if (initialTaskId) {
      setFormData((previous) => ({
        ...previous,
        task_id: String(initialTaskId),
      }));
    }
  }, [initialTaskId]);

  const selectedMainTask = useMemo(() => {
    return mainTasks.find(
      (task) =>
        String(task.task_id) ===
        String(formData.task_id),
    );
  }, [mainTasks, formData.task_id]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (
      name === "description" &&
      value.length > 2000
    ) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrorMessage("");
  };

  const validateForm = () => {
    if (!formData.task_id) {
      return "Please select a main task.";
    }

    if (!formData.title.trim()) {
      return "Please enter a subtask title.";
    }

    if (!formData.expected_end_date) {
      return "Please select the expected end date.";
    }

    if (
      selectedMainTask &&
      formData.expected_end_date >
        selectedMainTask.expected_end_date
    ) {
      return (
        "Subtask due date cannot be later than " +
        "the main task due date."
      );
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const response = await createSubtask({
        task_id: Number(formData.task_id),
        title: formData.title.trim(),
        expected_end_date:
          formData.expected_end_date,
        status: formData.status,
        environment: formData.environment,
        area: formData.area,
      });

      const createdSubtask = response.data;

      if (!createdSubtask?.subtask_id) {
        throw new Error(
          "Subtask ID was not returned by the backend.",
        );
      }

      if (formData.description.trim()) {
        await addStatusUpdate(
          createdSubtask.subtask_id,
          {
            description:
              formData.description.trim(),
          },
        );
      }

      await onSuccess();
      onClose();
    } catch (error) {
      console.error(
        "Error creating subtask:",
        error,
      );

      setErrorMessage(
        error.response?.data?.detail ||
          error.message ||
          "Unable to create the subtask.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Modal header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 text-white">
              <ClipboardList size={24} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Create New Subtask
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add a work item under one of your
                assigned main tasks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
            className="rounded-full bg-slate-100 p-2.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          {errorMessage && (
            <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <p>{errorMessage}</p>
            </div>
          )}

          {/* Main task */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <label
              htmlFor="task_id"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Main Task
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <select
              id="task_id"
              name="task_id"
              value={formData.task_id}
              onChange={handleChange}
              required
              disabled={
                loadingTasks ||
                submitting ||
                mainTasks.length === 0
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {loadingTasks
                  ? "Loading assigned main tasks..."
                  : mainTasks.length === 0
                    ? "No assigned main tasks found"
                    : "Select an assigned main task"}
              </option>

              {mainTasks.map((task) => (
                <option
                  key={task.task_id}
                  value={task.task_id}
                >
                  {task.title} — Due:{" "}
                  {task.expected_end_date}
                </option>
              ))}
            </select>

            {selectedMainTask && (
              <div className="mt-4 grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={17}
                    className="text-blue-600"
                  />

                  <div>
                    <p className="text-xs text-slate-500">
                      Current status
                    </p>

                    <p className="font-semibold text-slate-800">
                      {selectedMainTask.status}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CalendarDays
                    size={17}
                    className="text-blue-600"
                  />

                  <div>
                    <p className="text-xs text-slate-500">
                      Main task due date
                    </p>

                    <p className="font-semibold text-slate-800">
                      {
                        selectedMainTask.expected_end_date
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Title and date */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Subtask Title
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Example: Build dashboard sidebar"
                required
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="expected_end_date"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Expected End Date
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="expected_end_date"
                type="date"
                name="expected_end_date"
                value={
                  formData.expected_end_date
                }
                onChange={handleChange}
                max={
                  selectedMainTask
                    ?.expected_end_date || undefined
                }
                required
                disabled={
                  !formData.task_id || submitting
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              {selectedMainTask && (
                <p className="mt-2 text-xs text-slate-500">
                  Must be on or before{" "}
                  {
                    selectedMainTask.expected_end_date
                  }.
                </p>
              )}
            </div>
          </div>

          {/* Status, environment, area */}
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
            </div>

            <div>
              <label
                htmlFor="environment"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Environment
              </label>

              <select
                id="environment"
                name="environment"
                value={formData.environment}
                onChange={handleChange}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="Dev">Dev</option>
                <option value="Prod">Prod</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="area"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Area
              </label>

              <select
                id="area"
                name="area"
                value={formData.area}
                onChange={handleChange}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="Backend">
                  Backend
                </option>
                <option value="UI">UI</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="description"
                className="text-sm font-semibold text-slate-800"
              >
                Today& apos;s Status Description
              </label>

              <span className="text-xs text-slate-400">
                {formData.description.length}/2000
              </span>
            </div>

            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              maxLength={2000}
              disabled={submitting}
              placeholder="Describe the work completed or started today. This field is optional."
              className="h-36 w-full resize-none rounded-xl border border-slate-300 p-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingTasks ||
                mainTasks.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              )}

              {submitting
                ? "Creating Subtask..."
                : "Create Subtask"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSubtaskModal;