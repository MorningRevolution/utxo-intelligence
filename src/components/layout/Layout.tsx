
import { ReactNode } from "react";
import { SideNav } from "./SideNav";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-dark flex">
      <SideNav />
      <main className="flex-1 p-4 ml-0 md:ml-64 transition-all duration-300 ease-in-out">
        <div className="container mx-auto py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
