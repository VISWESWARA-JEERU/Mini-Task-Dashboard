// import { useEffect, useState } from "react";
// import { Plus, RefreshCcw } from "lucide-react";
// import { getMyTasks } from "../services/memberApi";
// import MyWorkGrid from "../components/MyWorkGrid";
// import AddSubtaskModal from "../components/AddSubtaskModal";

// export default function MemberDashboard() {
//   const [tasks, setTasks] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const fetchTasks = async () => {
//     try {
//       setLoading(true);
//       const data = await getMyTasks();
//       setTasks(data);
//     } catch (error) {
//       console.error("Error fetching member tasks:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTasks();
//   }, []);

//   return (
//     <div className="min-h-screen bg-slate-100 p-6">
//       <div className="mx-auto max-w-7xl">
//         <div className="mb-6 flex items-center justify-between">
//           <div>
//             <h1 className="text-3xl font-bold text-slate-900">
//               My Work Dashboard
//             </h1>
//             <p className="mt-1 text-sm text-slate-500">
//               View assigned tasks, create subtasks, and update daily status.
//             </p>
//           </div>

//           <div className="flex gap-3">
//             <button
//               onClick={fetchTasks}
//               className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow"
//             >
//               <RefreshCcw size={16} />
//               Refresh
//             </button>

//             <button
//               onClick={() => setShowModal(true)}
//               className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow"
//             >
//               <Plus size={16} />
//               Add Subtask
//             </button>
//           </div>
//         </div>

//         <MyWorkGrid tasks={tasks} onRefresh={fetchTasks} loading={loading} />

//         {showModal && (
//           <AddSubtaskModal
//             onClose={() => setShowModal(false)}
//             onSuccess={fetchTasks}
//           />
//         )}
//       </div>
//     </div>
//   );
// }




import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  ListTodo,
  LoaderCircle,
  XCircle,
} from "lucide-react";

import { getMyTasks } from "../services/memberApi";
import MyWorkGrid from "../components/MyWorkGrid";
import AddSubtaskModal from "../components/AddSubtaskModal";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import KPISection from "../components/dashboard/KPISection";
//import NotificationPanel from "../components/dashboard/NotificationPanel";

const menuItems = [
  {
    id: "all",
    label: "All Tasks",
    icon: ListTodo,
  },
  {
    id: "completed",
    label: "Completed Tasks",
    icon: CheckCircle2,
  },
  {
    id: "in-progress",
    label: "In-Progress Tasks",
    icon: LoaderCircle,
  },
  {
    id: "pending",
    label: "Pending Tasks",
    icon: CircleDashed,
  },
  // {
  //   id: "failed",
  //   label: "Failed Tasks",
  //   icon: XCircle,
  // },
];

export default function MemberDashboard() {
  const [tasks, setTasks] = useState([]);
  const [activeMenu, setActiveMenu] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
   * Replace this temporary user object with the user information
   * returned during JWT login.
   *
   * Example:
   * const loggedInUser = JSON.parse(localStorage.getItem("user"));
   */
  const loggedInUser = {
    user_id: 5,
    name: "JEERU VISWESWARA",
    role: "Member",
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getMyTasks();

      /*
       * This supports either of these backend responses:
       *
       * 1. Direct list:
       *    [{...}, {...}]
       *
       * 2. Wrapped response:
       *    { tasks: [{...}, {...}] }
       */
      const taskList = Array.isArray(data) ? data : data.tasks || [];

      setTasks(taskList);
    } catch (requestError) {
      console.error("Error fetching member tasks:", requestError);

      setError(
        requestError.response?.data?.detail ||
          "Unable to load assigned tasks.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  /*
   * Calculate task counts once whenever the task list changes.
   */
  const taskSummary = useMemo(() => {
    return {
      all: tasks.length,

      completed: tasks.filter(
        (task) => task.status?.toLowerCase() === "done",
      ).length,

      inProgress: tasks.filter(
        (task) => task.status?.toLowerCase() === "in-progress",
      ).length,

      pending: tasks.filter(
        (task) => task.status?.toLowerCase() === "not started",
      ).length,

      // failed: tasks.filter(
      //   (task) => task.status?.toLowerCase() === "failed",
      // ).length,
    };
  }, [tasks]);

  /*
   * Filter the grid according to the selected sidebar menu.
   */
  const filteredTasks = useMemo(() => {
    switch (activeMenu) {
      case "completed":
        return tasks.filter(
          (task) => task.status?.toLowerCase() === "done",
        );

      case "in-progress":
        return tasks.filter(
          (task) => task.status?.toLowerCase() === "in-progress",
        );

      case "pending":
        return tasks.filter(
          (task) => task.status?.toLowerCase() === "not started",
        );

      // case "failed":
      //   return tasks.filter(
      //     (task) => task.status?.toLowerCase() === "failed",
      //   );

      case "all":
      default:
        return tasks;
    }
  }, [tasks, activeMenu]);

  /*
   * Recent assignments are temporarily identified using created_at.
   * A dedicated notifications API is recommended for production.
   */
  const assignmentNotifications = useMemo(() => {
    const currentTime = new Date();
    const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000;

    return tasks
      .filter((task) => {
        if (!task.created_at) {
          return false;
        }

        const createdTime = new Date(task.created_at);

        return (
          currentTime.getTime() - createdTime.getTime() <=
          sevenDaysInMilliseconds
        );
      })
      .map((task) => ({
        id: `${task.task_id}-${task.subtask_id || "task"}`,
        title: "New task assigned",
        message: task.main_task,
        createdAt: task.created_at,
      }));
  }, [tasks]);

  const activeMenuLabel =
    menuItems.find((item) => item.id === activeMenu)?.label || "All Tasks";

  const kpiCards = [
    {
      title: "Total Tasks",
      value: taskSummary.all,
      description: "All assigned work items",
      icon: ListTodo,
      type: "all",
    },
    {
      title: "Completed",
      value: taskSummary.completed,
      description: "Successfully completed tasks",
      icon: CheckCircle2,
      type: "completed",
    },
    {
      title: "In Progress",
      value: taskSummary.inProgress,
      description: "Tasks currently being worked on",
      icon: LoaderCircle,
      type: "in-progress",
    },
    {
      title: "Pending",
      value: taskSummary.pending,
      description: "Tasks not yet started",
      icon: CircleAlert,
      type: "pending",
    },
    // {
    //   title: "Failed",
    //   value: taskSummary.failed,
    //   description: "Tasks requiring attention",
    //   icon: XCircle,
    //   type: "failed",
    // },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardSidebar
        memberName={loggedInUser.name}
        memberRole={loggedInUser.role}
        activeMenu={activeMenu}
        menuItems={menuItems}
        taskSummary={taskSummary}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onMenuChange={(menuId) => {
          setActiveMenu(menuId);
          setSidebarOpen(false);
        }}
      />

      <div className="lg:pl-72">
        <DashboardHeader
          memberName={loggedInUser.name}
          notificationCount={assignmentNotifications.length}
          loading={loading}
          onRefresh={fetchTasks}
          onAddSubtask={() => setShowModal(true)}
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleNotifications={() =>
            setShowNotifications((current) => !current)
          }
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px]">
            <section className="mb-6">
              <p className="text-sm font-medium text-blue-600">
                Member Workspace
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                Welcome, {loggedInUser.name}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Manage assigned tasks, create subtasks, and update your
                daily progress.
              </p>
            </section>

            {showNotifications && (
              <NotificationPanel
                notifications={assignmentNotifications}
                onClose={() => setShowNotifications(false)}
              />
            )}

            <KPISection
              cards={kpiCards}
              activeMenu={activeMenu}
              onCardClick={setActiveMenu}
            />

            <section className="mt-8">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {activeMenuLabel}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Showing {filteredTasks.length} of {tasks.length} assigned
                    tasks.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <MyWorkGrid
                tasks={filteredTasks}
                loading={loading}
                onRefresh={fetchTasks}
                emptyMessage={`No ${activeMenuLabel.toLowerCase()} found.`}
              />
            </section>
          </div>
        </main>
      </div>

      {showModal && (
        <AddSubtaskModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
}