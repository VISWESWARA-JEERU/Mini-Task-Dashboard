import { X } from "lucide-react";

function getMenuCount(menuId, taskSummary) {
  const countMap = {
    all: taskSummary.all,
    completed: taskSummary.completed,
    "in-progress": taskSummary.inProgress,
    pending: taskSummary.pending,
    // failed: taskSummary.failed,
  };

  return countMap[menuId] ?? 0;
}

export default function DashboardSidebar({
  memberName,
  memberRole,
  activeMenu,
  menuItems,
  taskSummary,
  sidebarOpen,
  onClose,
  onMenuChange,
}) {
  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col bg-slate-950 text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <div>
            <h2 className="text-lg font-bold">Mini Task Dashboard</h2>
            <p className="mt-1 text-xs text-slate-400">Member Workspace</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
              {memberName
                .split(" ")
                .map((word) => word.charAt(0))
                .slice(0, 2)
                .join("")}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{memberName}</p>
              <p className="mt-0.5 text-xs text-slate-400">{memberRole}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Task Menu
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const count = getMenuCount(item.id, taskSummary);
            const isActive = activeMenu === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onMenuChange(item.id)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={19} />
                  <span className="text-sm font-medium">{item.label}</span>
                </span>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-5">
          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-300">
              Today's Progress
            </p>

            <p className="mt-2 text-2xl font-bold">
              {taskSummary.completed}/{taskSummary.all}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Tasks completed overall
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}