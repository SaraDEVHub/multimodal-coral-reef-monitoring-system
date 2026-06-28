import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ activePage, onNavigate, title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-mist">
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => {
          onNavigate(page);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
