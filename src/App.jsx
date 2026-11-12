import {
  LayoutDashboard,
  CheckSquare,
  Users,
  CalendarDays,
  Settings,
  Bell,
  Plus,
  Search,
  CircleCheck,
  Clock,
  ListTodo,
} from "lucide-react";
const stats = [
  { title: "Total Tasks", value: "24", icon: ListTodo, color: "bg-blue-100 text-blue-600" },
  { title: "To Do", value: "08", icon: Clock, color: "bg-orange-100 text-orange-600" },
  { title: "In Progress", value: "10", icon: CheckSquare, color: "bg-purple-100 text-purple-600" },
  { title: "Completed", value: "06", icon: CircleCheck, color: "bg-green-100 text-green-600" },
];
const tasks = [
  { title: "Design dashboard UI", team: "Design Team", priority: "High", status: "In Progress" },
  { title: "Create authentication pages", team: "Development", priority: "High", status: "To Do" },
  { title: "Setup project database", team: "Development", priority: "Medium", status: "Completed" },
  { title: "Prepare project documentation", team: "Management", priority: "Low", status: "To Do" },
];
function App() {
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar */}
      <aside className="w-full bg-white border-r border-slate-200 md:w-64 md:min-h-screen">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600">
            TeamFlow<span className="text-slate-800">.</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage work together</p>
        </div>
        <nav className="px-4 space-y-2">
          {[
            { name: "Dashboard", icon: LayoutDashboard },
            { name: "My Tasks", icon: CheckSquare },
            { name: "Teams", icon: Users },
            { name: "Calendar", icon: CalendarDays },
            { name: "Settings", icon: Settings },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                  index === 0
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon size={19} />
                {item.name}
              </button>
            );
          })}
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-5 md:p-8">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Dashboard
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Welcome back! Here's your team's overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-3 bg-white rounded-xl border border-slate-200">
              <Bell size={19} />
            </button>
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              U
            </div>
          </div>
        </header>
        {/* Statistics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="bg-white p-5 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-500">{stat.title}</p>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <Icon size={20} />
                  </div>
                </div>
                <h3 className="text-3xl font-bold mt-4 text-slate-800">
                  {stat.value}
                </h3>
              </div>
            );
          })}
        </section>
        {/* Tasks */}
        <section className="bg-white rounded-2xl border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-800">Recent Tasks</h3>
              <p className="text-sm text-slate-400 mt-1">
                Overview of your team's tasks
              </p>
            </div>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm">
              <Plus size={17} />
              Add Task
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="p-4">Task</th>
                  <th className="p-4">Team</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.title} className="border-t border-slate-100">
                    <td className="p-4 font-medium text-slate-700">{task.title}</td>
                    <td className="p-4 text-sm text-slate-500">{task.team}</td>
                    <td className="p-4 text-sm">{task.priority}</td>
                    <td className="p-4">
                      <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">
                        {task.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
export default App;