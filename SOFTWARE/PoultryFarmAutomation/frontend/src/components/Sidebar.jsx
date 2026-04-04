import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  AlertTriangle,
  Settings,
  Activity,
  X,
  BellRing,
} from "lucide-react";
import { cn } from "../lib/utils";
import logo from "../../logo.jpg";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
];

const panelItems = [
  { icon: BellRing, label: "Alerts", panel: "alerts" },
  { icon: Activity, label: "Device Status", panel: "status" },
  { icon: Settings, label: "Settings", panel: "settings" },
];

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const openPanel = (panel) => {
    const params = new URLSearchParams(location.search);
    params.set("panel", panel);
    navigate({ pathname: "/", search: params.toString() });
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-[#7f1d1d] text-red-50 border-r border-[#5f1414] z-50 transition-transform duration-300 lg:translate-x-0 shadow-xl",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="SmartFlock logo"
                className="w-10 h-10 rounded-sm object-cover border border-white/20"
              />
              <span className="font-bold text-xl tracking-tight">
                SmartFlock
              </span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-muted rounded-md"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="px-4 py-4 space-y-1 border-b border-white/10">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-sm transition-colors duration-200 group text-sm font-semibold",
                    isActive
                      ? "bg-[#f4c542] text-[#4a1d12] border border-[#d7a90d]"
                      : "text-red-100 hover:bg-white/10 hover:text-white",
                  )
                }
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1 px-4 py-4">
            <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-200/80">
              Panels
            </p>
            <div className="space-y-1">
              {panelItems.map((item) => (
                <button
                  key={item.panel}
                  onClick={() => openPanel(item.panel)}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-sm transition-colors duration-200 text-sm font-semibold text-red-100 hover:bg-white/10 hover:text-white text-left"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
