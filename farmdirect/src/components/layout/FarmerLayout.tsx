import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import Logo from "../ui/Logo";
import Icon from "../ui/Icon";
import { cn } from "../../utils/cn";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { to: "/farmer/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/farmer/products", label: "Products", icon: "eco" },
  { to: "/farmer/inventory", label: "Inventory", icon: "inventory_2" },
  { to: "/farmer/orders", label: "Orders", icon: "receipt_long" },
  { to: "/farmer/analytics", label: "Analytics", icon: "bar_chart" },
  { to: "/farmer/ai-insights", label: "AI Insights", icon: "auto_awesome" },
  { to: "/farmer/profile", label: "Farm Profile", icon: "storefront" },
];

export default function FarmerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-surface-bright border-r border-outline-variant h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b border-outline-variant">
          <Logo size={30} />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-label-md font-semibold transition-colors",
                  isActive
                    ? "bg-primary-container/15 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                )
              }
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-outline-variant space-y-1">
          {user && (
            <div className="px-3 py-2 text-label-sm text-on-surface-variant truncate">
              Signed in as <span className="font-semibold text-on-surface">{user.email}</span>
            </div>
          )}
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="storefront" size={20} />
            Switch to Shopping
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low text-left"
          >
            <Icon name="logout" size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-16 bg-surface-bright border-b border-outline-variant flex items-center justify-between px-margin-mobile">
        <Logo size={28} />
        <button
          className="p-2 rounded-full hover:bg-surface-container-low"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
        >
          <Icon name={mobileOpen ? "close" : "menu"} />
        </button>
      </div>
      {mobileOpen && (
        <div className="lg:hidden fixed top-16 inset-x-0 z-30 bg-surface-bright border-b border-outline-variant px-margin-mobile py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-label-md font-semibold",
                  isActive ? "bg-primary-container/15 text-primary" : "text-on-surface-variant"
                )
              }
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="lg:hidden h-16" />
        <Outlet />
      </div>
    </div>
  );
}
