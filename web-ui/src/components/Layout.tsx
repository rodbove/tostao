import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/timeline", label: "Timeline" },
  { to: "/transactions", label: "Transacoes" },
  { to: "/goals", label: "Metas" },
  { to: "/insights", label: "Insights" },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-6">
          <span className="text-lg font-bold tracking-tight">Tostao</span>
          <div className="flex gap-4">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive
                      ? "text-emerald-600 border-b-2 border-emerald-600 pb-0.5"
                      : "text-gray-500 hover:text-gray-800"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
