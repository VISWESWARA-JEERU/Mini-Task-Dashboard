import { useEffect, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { getMyTasks } from "../services/memberApi";
import MyWorkGrid from "../components/MyWorkGrid";
import AddSubtaskModal from "../components/AddSubtaskModal";

export default function MemberDashboard() {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await getMyTasks();
      setTasks(data);
    } catch (error) {
      console.error("Error fetching member tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              My Work Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View assigned tasks, create subtasks, and update daily status.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchTasks}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow"
            >
              <Plus size={16} />
              Add Subtask
            </button>
          </div>
        </div>

        <MyWorkGrid tasks={tasks} onRefresh={fetchTasks} loading={loading} />

        {showModal && (
          <AddSubtaskModal
            onClose={() => setShowModal(false)}
            onSuccess={fetchTasks}
          />
        )}
      </div>
    </div>
  );
}