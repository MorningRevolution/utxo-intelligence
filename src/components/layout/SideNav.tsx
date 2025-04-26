import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Wallet, 
  Table, 
  AlertTriangle, 
  FileText, 
  Bot, 
  Menu,
  X,
  Shield,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/store/WalletContext";

export function SideNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { hasWallet } = useWallet();

  const routes = [
    {
      name: "Dashboard",
      path: "/",
      icon: <Home className="mr-2 h-5 w-5" />,
      disabled: false
    },
    {
      name: "Wallet Import",
      path: "/wallet-import",
      icon: <Wallet className="mr-2 h-5 w-5" />,
      disabled: false
    },
    {
      name: "UTXO Table",
      path: "/utxo-table",
      icon: <Table className="mr-2 h-5 w-5" />,
      disabled: !hasWallet
    },
    {
      name: "Risk Simulator",
      path: "/risk-simulator",
      icon: <AlertTriangle className="mr-2 h-5 w-5" />,
      disabled: !hasWallet
    },
    {
      name: "Report Export",
      path: "/report-export",
      icon: <FileText className="mr-2 h-5 w-5" />,
      disabled: !hasWallet
    },
    {
      name: "AI Assistant",
      path: "/ai-assistant",
      icon: <Bot className="mr-2 h-5 w-5" />,
      disabled: false
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <Settings className="mr-2 h-5 w-5" />,
      disabled: false
    }
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="icon" 
        className="fixed top-4 left-4 z-50 md:hidden" 
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div 
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-sidebar shadow-lg transition-transform duration-300 ease-in-out z-40",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-bitcoin mr-2" />
            <span className="text-lg font-bold">UTXO Intelligence</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={toggleSidebar}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="mt-8">
          <ul className="space-y-2 px-2">
            {routes.map((route) => (
              <li key={route.path}>
                <Link
                  to={route.disabled ? "#" : route.path}
                  className={cn(
                    "flex items-center px-4 py-2 rounded-md transition-colors",
                    location.pathname === route.path
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    route.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                  )}
                  onClick={(e) => {
                    if (route.disabled) {
                      e.preventDefault();
                    } else {
                      setIsOpen(false);
                    }
                  }}
                >
                  {route.icon}
                  <span>{route.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="text-sm text-muted-foreground text-center">
            <p>UTXO Intelligence</p>
            <p>v0.1.0 (Demo)</p>
          </div>
        </div>
      </div>
      
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}
