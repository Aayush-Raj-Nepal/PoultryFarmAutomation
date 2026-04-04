import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-8">{children}</div>
        </main>

        <footer className="p-6 border-t border-border bg-card/50 text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 Poultry Farm Smart IoT Project | Faculty of Engineering |
            Final Defense Version
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
