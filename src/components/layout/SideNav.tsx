
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Settings,
  ChartLine,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/store/WalletContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function SideNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { hasWallet } = useWallet();
  const [openSections, setOpenSections] = useState<string[]>([]);

  // Define main routes
  const mainRoutes = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <Home className="mr-2 h-5 w-5" />,
      disabled: false,
      subItems: [
        {
          name: "Portfolio",
          path: "/portfolio",
          icon: <ChartLine className="mr-2 h-4 w-4" />,
          disabled: !hasWallet
        },
        {
          name: "Risk Simulator",
          path: "/risk-simulator",
          icon: <AlertTriangle className="mr-2 h-4 w-4" />,
          disabled: !hasWallet
        }
      ]
    },
    {
      name: "UTXO Table",
      path: "/utxo-table",
      icon: <Table className="mr-2 h-5 w-5" />,
      disabled: !hasWallet,
      subItems: []
    },
    {
      name: "AI Assistant",
      path: "/ai-assistant",
      icon: <Bot className="mr-2 h-5 w-5" />,
      disabled: false,
      subItems: []
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <Settings className="mr-2 h-5 w-5" />,
      disabled: false,
      subItems: [
        {
          name: "Wallet Import",
          path: "/wallet-import",
          icon: <Wallet className="mr-2 h-4 w-4" />,
          disabled: false
        },
        {
          name: "Report Export",
          path: "/report-export",
          icon: <FileText className="mr-2 h-4 w-4" />,
          disabled: !hasWallet
        },
        {
          name: "Tax Settings",
          path: "/settings/tax",
          icon: <FileText className="mr-2 h-4 w-4" />,
          disabled: !hasWallet
        }
      ]
    }
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Check if a path or any of its subItems is active
  const isPathActive = (path: string, subItems: any[] = []) => {
    if (location.pathname === path) return true;
    return subItems.some(item => location.pathname === item.path);
  };

  // Check if any subitem is active for a section
  const isSectionActive = (path: string, subItems: any[] = []) => {
    if (location.pathname === path) return true;
    return subItems.some(item => location.pathname === item.path);
  };

  // Toggle section open/close state
  const toggleSection = (sectionName: string, path: string) => {
    if (path) {
      navigate(path);
    }
    
    setOpenSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  // Handle main item click
  const handleMainItemClick = (route: any) => {
    if (route.disabled) return;
    
    // If has subitems, toggle section
    if (route.subItems.length > 0) {
      toggleSection(route.name, route.path);
    } else {
      // No subitems, just navigate
      navigate(route.path);
      setIsOpen(false);
    }
  };

  // Check if a section is open
  const isSectionOpen = (sectionName: string) => {
    return openSections.includes(sectionName) || 
           mainRoutes.some(route => 
             route.name === sectionName && 
             route.subItems.some(item => location.pathname === item.path)
           );
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
          "fixed top-0 left-0 h-full w-64 bg-background shadow-lg transition-transform duration-300 ease-in-out z-50",
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
            {mainRoutes.map((route) => (
              <li key={route.path} className="space-y-1">
                {route.subItems.length > 0 ? (
                  <Collapsible
                    open={isSectionOpen(route.name)}
                    onOpenChange={() => {}}
                    className={cn(
                      "border rounded-md",
                      isSectionActive(route.path, route.subItems) && "border-sidebar-accent bg-sidebar-accent/10"
                    )}
                  >
                    <CollapsibleTrigger asChild>
                      <div
                        className={cn(
                          "flex items-center justify-between px-4 py-2 rounded-md transition-colors cursor-pointer",
                          isSectionActive(route.path, route.subItems)
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                          route.disabled && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => {
                          if (!route.disabled) {
                            handleMainItemClick(route);
                          }
                        }}
                      >
                        <div className="flex items-center">
                          {route.icon}
                          <span>{route.name}</span>
                        </div>
                        {isSectionOpen(route.name) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="pl-6 space-y-1 pt-1 pb-2">
                        {route.subItems.map(subItem => (
                          <Link
                            key={subItem.path}
                            to={subItem.disabled ? "#" : subItem.path}
                            className={cn(
                              "flex items-center px-4 py-1.5 text-sm rounded-md transition-colors",
                              location.pathname === subItem.path
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              subItem.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                            )}
                            onClick={(e) => {
                              if (subItem.disabled) {
                                e.preventDefault();
                              } else {
                                setIsOpen(false);
                              }
                            }}
                          >
                            {subItem.icon}
                            <span>{subItem.name}</span>
                          </Link>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <div
                    className={cn(
                      "flex items-center px-4 py-2 rounded-md transition-colors cursor-pointer",
                      isPathActive(route.path, route.subItems)
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      route.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                    )}
                    onClick={() => {
                      if (!route.disabled) {
                        navigate(route.path);
                        setIsOpen(false);
                      }
                    }}
                  >
                    {route.icon}
                    <span>{route.name}</span>
                  </div>
                )}
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}
