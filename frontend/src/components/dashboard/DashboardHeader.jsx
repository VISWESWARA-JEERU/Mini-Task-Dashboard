import {
  Bell,
  Menu,
  Plus,
  RefreshCcw,
  UserRound,
} from "lucide-react";

export default function DashboardHeader({
  memberName,
  notificationCount,
  loading,
  onRefresh,
  onAddSubtask,
  onOpenSidebar,
  onToggleNotifications,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="hidden sm:block">
            <p className="text-sm text-slate-500">Logged in as</p>
            <p className="font-semibold text-slate-900">{memberName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
          >
            <RefreshCcw
              size={17}
              className={loading ? "animate-spin" : ""}
            />

            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={onToggleNotifications}
            className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-slate-50"
          >
            <Bell size={19} />

            {notificationCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onAddSubtask}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:px-4"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">Add Subtask</span>
          </button>

          <div className="hidden items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 md:flex">
            <UserRound size={18} className="text-slate-600" />
            <span className="max-w-36 truncate text-sm font-medium text-slate-700">
              {memberName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}