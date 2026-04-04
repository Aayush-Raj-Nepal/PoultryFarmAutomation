import React from "react";
import { Menu, Sun, Moon, User } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const Navbar = ({ onMenuClick }) => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card">
      <div className="px-4 py-3 flex items-center justify-between lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-muted rounded-sm"
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block">
            <h1 className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              SmartFlock
            </h1>
            <p className="text-lg font-bold leading-none">Farm Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-muted rounded-sm transition-colors border border-border bg-background"
            title="Toggle theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="h-8 w-px bg-border mx-1" />

          {isAuthenticated ? (
            <div className="flex items-center gap-3 pl-2">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold">{user?.username || "Admin"}</p>
                <button
                  onClick={logout}
                  className="text-[10px] text-primary font-semibold hover:underline uppercase tracking-wide"
                >
                  Logout
                </button>
              </div>
              <div className="w-9 h-9 bg-secondary rounded-sm flex items-center justify-center border border-yellow-600/30">
                <User size={18} className="text-foreground" />
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 bg-muted rounded-sm flex items-center justify-center border border-border">
              <User size={18} className="text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
