import React from "react";
import { Menu, Sun, Moon, Bell, User } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const Navbar = ({ onMenuClick }) => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full glass-morphism border-b border-border">
      <div className="px-4 py-3 flex items-center justify-between lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-muted rounded-md"
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block">
            <h1 className="text-sm font-semibold text-muted-foreground">
              Smart Monitoring
            </h1>
            <p className="text-lg font-bold leading-none">Dashboard Overview</p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            title="Toggle theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button className="p-2 hover:bg-muted rounded-full transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
          </button>

          <div className="h-8 w-px bg-border mx-1" />

          {isAuthenticated ? (
            <div className="flex items-center gap-3 pl-2">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold">{user?.username || "Admin"}</p>
                <button
                  onClick={logout}
                  className="text-[10px] text-destructive font-semibold hover:underline"
                >
                  Logout
                </button>
              </div>
              <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                <User size={18} className="text-primary" />
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center">
              <User size={18} className="text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
