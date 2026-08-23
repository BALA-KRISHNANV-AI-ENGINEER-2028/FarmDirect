import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Logo from "../ui/Logo";
import Icon from "../ui/Icon";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../utils/cn";

const links = [
  { to: "/marketplace", label: "Marketplace" },
  { to: "/farms", label: "Find Farms" },
  { to: "/customer/orders", label: "Orders" },
  { to: "/customer/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-40 bg-surface-bright/95 backdrop-blur-sm border-b border-outline-variant">
      <div className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop h-16 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Logo size={32} />
          <div className="hidden lg:flex items-center gap-8">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    "text-label-md font-semibold transition-colors",
                    isActive ? "text-primary" : "text-on-surface-variant hover:text-primary"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/favorites"
            className="hidden sm:inline-flex scale-95 active:scale-90 transition-transform p-2 rounded-full hover:bg-surface-container-low"
            aria-label="Favorites"
          >
            <Icon name="favorite" />
          </Link>
          <Link
            to="/cart"
            className="scale-95 active:scale-90 transition-transform p-2 rounded-full hover:bg-surface-container-low relative"
            aria-label="Cart"
          >
            <Icon name="shopping_basket" />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-primary text-on-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
          <Link
            to="/customer/profile"
            className="hidden sm:inline-flex scale-95 active:scale-90 transition-transform p-2 rounded-full hover:bg-surface-container-low"
            aria-label="Account"
          >
            <Icon name="account_circle" />
          </Link>
          {user ? (
            <button
              onClick={handleSignOut}
              className="hidden md:inline-flex ml-2 text-label-md font-semibold text-on-surface-variant border border-surface-variant rounded-lg px-4 py-2 hover:border-primary hover:text-primary transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <Link
              to="/auth/login"
              className="hidden md:inline-flex ml-2 text-label-md font-semibold text-primary border border-primary rounded-lg px-4 py-2 hover:bg-primary hover:text-on-primary transition-colors"
            >
              Sign In
            </Link>
          )}
          <button
            className="lg:hidden p-2 rounded-full hover:bg-surface-container-low"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-outline-variant bg-surface-bright px-margin-mobile py-4 flex flex-col gap-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="text-label-md font-semibold text-on-surface-variant hover:text-primary"
            >
              {l.label}
            </NavLink>
          ))}
          <Link to="/customer/profile" onClick={() => setOpen(false)} className="text-label-md font-semibold text-on-surface-variant">
            Profile
          </Link>
          {user ? (
            <button
              onClick={handleSignOut}
              className="text-label-md font-semibold text-on-surface-variant border border-surface-variant rounded-lg px-4 py-2 text-center"
            >
              Sign Out
            </button>
          ) : (
            <Link
              to="/auth/login"
              onClick={() => setOpen(false)}
              className="text-label-md font-semibold text-primary border border-primary rounded-lg px-4 py-2 text-center"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
