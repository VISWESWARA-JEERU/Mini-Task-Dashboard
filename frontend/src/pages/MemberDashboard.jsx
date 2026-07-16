import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  ListTodo,
  LoaderCircle,
  XCircle,
} from "lucide-react";

// FIX: Matching standard lowercase casing typically used in the backend routes/services
import { getMyTasks } from "../services/memberApi";

import AddSubtaskModal from "../components/dashboard/AddSubtaskModal";
import MyWorkGrid from "../components/dashboard/MyWorkGrid";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import KPICard from "../components/dashboard/KPICard";
import KPISection from "../components/dashboard/KPISection";

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
];

export default function MemberDashboard() {
  const [tasks, setTasks] = useState([]);
  const [activeMenu, setActiveMenu] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");

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

  const openAddSubtaskModal = (taskId = "") => {
    setSelectedTaskId(taskId);
    setShowModal(true);
  };

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
    };
  }, [tasks]);

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
      case "all":
      default:
        return tasks;
    }
  }, [tasks, activeMenu]);

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
          notificationCount={0}
          loading={loading}
          onRefresh={fetchTasks}
          onAddSubtask={() => openAddSubtaskModal()}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px]">
            <section className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Dashboard Overview
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                Task Management Workspace
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                View assigned tasks, manage subtasks, update work progress,
                and monitor completion status from a single dashboard.
              </p>
            </section>

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
                    Showing {filteredTasks.length} of {tasks.length} assigned tasks.
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
                onAddSubtask={openAddSubtaskModal}
                emptyMessage={`No ${activeMenuLabel.toLowerCase()} found.`}
              />
            </section>
          </div>
        </main>
      </div>

      {showModal && (
        <AddSubtaskModal
          initialTaskId={selectedTaskId}
          onClose={() => {
            setShowModal(false);
            setSelectedTaskId("");
          }}
          onSuccess={async () => {
            await fetchTasks();
            setSelectedTaskId("");
          }}
        />
      )}
    </div>
  );
}

// import { useEffect, useMemo, useState } from "react";
// import {
//   CheckCircle2,
//   CircleAlert,
//   CircleDashed,
//   ListTodo,
//   LoaderCircle,
//   XCircle,
// } from "lucide-react";

// import { getMyTasks } from "../services/memberApi";


// import AddSubtaskModal from "../components/dashboard/AddSubtaskModal";
// import MyWorkGrid from "../components/dashboard/MyWorkGrid";
// import StatusHistory from "../components/dashboard/StatusHistory";
// import DashboardHeader from "../components/dashboard/DashboardHeader";
// import DashboardSidebar from "../components/dashboard/DashboardSidebar";
// import KPICard from "../components/dashboard/KPICard";
// import KPISection from "../components/dashboard/KPISection";

// //import NotificationPanel from "../components/dashboard/NotificationPanel";

// const menuItems = [
//   {
//     id: "all",
//     label: "All Tasks",
//     icon: ListTodo,
//   },
//   {
//     id: "completed",
//     label: "Completed Tasks",
//     icon: CheckCircle2,
//   },
//   {
//     id: "in-progress",
//     label: "In-Progress Tasks",
//     icon: LoaderCircle,
//   },
//   {
//     id: "pending",
//     label: "Pending Tasks",
//     icon: CircleDashed,
//   },
//   // {
//   //   id: "failed",
//   //   label: "Failed Tasks",
//   //   icon: XCircle,
//   // },
// ];

// export default function MemberDashboard() {
//   const [tasks, setTasks] = useState([]);
//   const [activeMenu, setActiveMenu] = useState("all");
//   const [showModal, setShowModal] = useState(false);
//   const [showNotifications, setShowNotifications] = useState(false);
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [selectedTaskId, setSelectedTaskId] = useState("");

//   /*
//    * Replace this temporary user object with the user information
//    * returned during JWT login.
//    *
//    * Example:
//    * const loggedInUser = JSON.parse(localStorage.getItem("user"));
//    */
//   const loggedInUser = {
//     user_id: 5,
//     name: "JEERU VISWESWARA",
//     role: "Member",
//   };

//   const fetchTasks = async () => {
//     try {
//       setLoading(true);
//       setError("");

//       const data = await getMyTasks();

//       /*
//        * This supports either of these backend responses:
//        *
//        * 1. Direct list:
//        *    [{...}, {...}]
//        *
//        * 2. Wrapped response:
//        *    { tasks: [{...}, {...}] }
//        */
//       const taskList = Array.isArray(data) ? data : data.tasks || [];

//       setTasks(taskList);
//     } catch (requestError) {
//       console.error("Error fetching member tasks:", requestError);

//       setError(
//         requestError.response?.data?.detail ||
//         "Unable to load assigned tasks.",
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTasks();
//   }, []);


//   const openAddSubtaskModal = (taskId = "") => {
//     setSelectedTaskId(taskId);
//     setShowModal(true);
//   };

//   /*
//    * Calculate task counts once whenever the task list changes.
//    */
//   const taskSummary = useMemo(() => {
//     return {
//       all: tasks.length,

//       completed: tasks.filter(
//         (task) => task.status?.toLowerCase() === "done",
//       ).length,

//       inProgress: tasks.filter(
//         (task) => task.status?.toLowerCase() === "in-progress",
//       ).length,

//       pending: tasks.filter(
//         (task) => task.status?.toLowerCase() === "not started",
//       ).length,

//       // failed: tasks.filter(
//       //   (task) => task.status?.toLowerCase() === "failed",
//       // ).length,
//     };
//   }, [tasks]);

//   /*
//    * Filter the grid according to the selected sidebar menu.
//    */
//   const filteredTasks = useMemo(() => {
//     switch (activeMenu) {
//       case "completed":
//         return tasks.filter(
//           (task) => task.status?.toLowerCase() === "done",
//         );

//       case "in-progress":
//         return tasks.filter(
//           (task) => task.status?.toLowerCase() === "in-progress",
//         );

//       case "pending":
//         return tasks.filter(
//           (task) => task.status?.toLowerCase() === "not started",
//         );

//       // case "failed":
//       //   return tasks.filter(
//       //     (task) => task.status?.toLowerCase() === "failed",
//       //   );

//       case "all":
//       default:
//         return tasks;
//     }
//   }, [tasks, activeMenu]);

//   /*
//    * Recent assignments are temporarily identified using created_at.
//    * A dedicated notifications API is recommended for production.
//    */
//   const assignmentNotifications = useMemo(() => {
//     const currentTime = new Date();
//     const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000;

//     return tasks
//       .filter((task) => {
//         if (!task.created_at) {
//           return false;
//         }

//         const createdTime = new Date(task.created_at);

//         return (
//           currentTime.getTime() - createdTime.getTime() <=
//           sevenDaysInMilliseconds
//         );
//       })
//       .map((task) => ({
//         id: `${task.task_id}-${task.subtask_id || "task"}`,
//         title: "New task assigned",
//         message: task.main_task,
//         createdAt: task.created_at,
//       }));
//   }, [tasks]);

//   const activeMenuLabel =
//     menuItems.find((item) => item.id === activeMenu)?.label || "All Tasks";

//   const kpiCards = [
//     {
//       title: "Total Tasks",
//       value: taskSummary.all,
//       description: "All assigned work items",
//       icon: ListTodo,
//       type: "all",
//     },
//     {
//       title: "Completed",
//       value: taskSummary.completed,
//       description: "Successfully completed tasks",
//       icon: CheckCircle2,
//       type: "completed",
//     },
//     {
//       title: "In Progress",
//       value: taskSummary.inProgress,
//       description: "Tasks currently being worked on",
//       icon: LoaderCircle,
//       type: "in-progress",
//     },
//     {
//       title: "Pending",
//       value: taskSummary.pending,
//       description: "Tasks not yet started",
//       icon: CircleAlert,
//       type: "pending",
//     },
//     // {
//     //   title: "Failed",
//     //   value: taskSummary.failed,
//     //   description: "Tasks requiring attention",
//     //   icon: XCircle,
//     //   type: "failed",
//     // },
//   ];

//   return (
//     <div className="min-h-screen bg-slate-100">
//       <DashboardSidebar
//         memberName={loggedInUser.name}
//         memberRole={loggedInUser.role}
//         activeMenu={activeMenu}
//         menuItems={menuItems}
//         taskSummary={taskSummary}
//         sidebarOpen={sidebarOpen}
//         onClose={() => setSidebarOpen(false)}
//         onMenuChange={(menuId) => {
//           setActiveMenu(menuId);
//           setSidebarOpen(false);
//         }}
//       />

//       <div className="lg:pl-72">
//         <DashboardHeader
//           memberName={loggedInUser.name}
//           notificationCount={0}
//           loading={loading}
//           onRefresh={fetchTasks}
//           onAddSubtask={() => openAddSubtaskModal()}
//           onOpenSidebar={() => setSidebarOpen(true)}
//         />

//         <main className="p-4 sm:p-6 lg:p-8">
//           <div className="mx-auto max-w-[1600px]">
//             <section className="mb-6">
//               <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
//                 Dashboard Overview
//               </p>

//               <h1 className="mt-1 text-3xl font-bold text-slate-900">
//                 Task Management Workspace
//               </h1>

//               <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
//                 View assigned tasks, manage subtasks, update work progress,
//                 and monitor completion status from a single dashboard.
//               </p>
//             </section>

//             {showNotifications && (
//               <NotificationPanel
//                 notifications={assignmentNotifications}
//                 onClose={() => setShowNotifications(false)}
//               />
//             )}

//             <KPISection
//               cards={kpiCards}
//               activeMenu={activeMenu}
//               onCardClick={setActiveMenu}
//             />

//             <section className="mt-8">
//               <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//                 <div>
//                   <h2 className="text-xl font-bold text-slate-900">
//                     {activeMenuLabel}
//                   </h2>

//                   <p className="mt-1 text-sm text-slate-500">
//                     Showing {filteredTasks.length} of {tasks.length} assigned
//                     tasks.
//                   </p>
//                 </div>
//               </div>

//               {error && (
//                 <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
//                   {error}
//                 </div>
//               )}

//               <MyWorkGrid
//                 tasks={filteredTasks}
//                 loading={loading}
//                 onRefresh={fetchTasks}
//                 onAddSubtask={openAddSubtaskModal}
//                 emptyMessage={`No ${activeMenuLabel.toLowerCase()} found.`}
//               />
//             </section>
//           </div>
//         </main>
//       </div>

//       {showModal && (
//         <AddSubtaskModal
//           initialTaskId={selectedTaskId}
//           onClose={() => {
//             setShowModal(false);
//             setSelectedTaskId("");
//           }}
//           onSuccess={async () => {
//             await fetchTasks();
//             setSelectedTaskId("");
//           }}
//         />
//       )}
//     </div>
//   );
// }