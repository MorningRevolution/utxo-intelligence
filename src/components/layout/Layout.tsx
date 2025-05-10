
import { ReactNode } from "react";
import { SideNav } from "./SideNav";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div className="min-h-screen bg-background flex">
      {!isHomePage && <SideNav />}
      <main className={`flex-1 p-4 ${!isHomePage ? "ml-0 md:ml-64" : ""} transition-all duration-300 ease-in-out overflow-x-hidden`}>
        <div className={`${isHomePage ? "" : "container mx-auto py-6"} overflow-x-hidden`}>
          {children}
        </div>
      </main>
    </div>
  );
}
