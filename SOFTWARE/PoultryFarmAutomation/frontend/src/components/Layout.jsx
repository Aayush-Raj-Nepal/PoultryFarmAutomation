import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Modal from "./Modal";
import Alerts from "../pages/Alerts";
import Status from "../pages/Status";
import Settings from "../pages/Settings";
import { useAuth } from "../context/AuthContext";

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const activePanel = searchParams.get("panel");

  const closePanel = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("panel");
    setSearchParams(params);
  };

  useEffect(() => {
    if (activePanel === "settings" && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [activePanel, isAuthenticated, navigate]);

  const modalConfig = useMemo(() => {
    if (activePanel === "alerts") {
      return { title: "Alerts", content: <Alerts embedded /> };
    }
    if (activePanel === "status") {
      return { title: "Device Status", content: <Status embedded /> };
    }
    if (activePanel === "settings") {
      if (!isAuthenticated) return null;
      return { title: "Settings", content: <Settings embedded /> };
    }
    return null;
  }, [activePanel, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-8">{children}</div>
        </main>

        <footer className="p-4 border-t border-border bg-card text-center">
          <p className="text-xs text-muted-foreground">
            SmartFlock Dashboard
          </p>
        </footer>
      </div>

      <Modal
        open={Boolean(modalConfig)}
        title={modalConfig?.title}
        onClose={closePanel}
      >
        {modalConfig?.content}
      </Modal>
    </div>
  );
};

export default Layout;
