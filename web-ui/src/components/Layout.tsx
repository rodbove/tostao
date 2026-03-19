import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/timeline", label: "Timeline" },
  { to: "/transactions", label: "Transacoes" },
  { to: "/accounts", label: "Contas" },
  { to: "/goals", label: "Metas" },
  { to: "/insights", label: "Insights" },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <nav className="bg-green-dark px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-6">
          <span className="font-display text-lg font-bold tracking-tight text-gold">Tostao</span>
          <div className="flex gap-4">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive
                      ? "text-gold-light border-b-2 border-gold pb-0.5"
                      : "text-cream-dark/70 hover:text-gold-light"
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
