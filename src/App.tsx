
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./store/WalletContext";
import { TaxConfigProvider } from "./store/TaxConfigContext";
import { Layout } from "./components/layout/Layout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import WalletImport from "./pages/WalletImport";
import UTXOTable from "./pages/UTXOTable";
import UTXOMap from "./pages/UTXOMap";
import RiskSimulator from "./pages/RiskSimulator";
import ReportExport from "./pages/ReportExport";
import AIAssistant from "./pages/AIAssistant";
import Portfolio from "./pages/Portfolio";
import Settings from "./pages/Settings";
import TaxSettings from "./pages/TaxSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletProvider>
      <TaxConfigProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/wallet-import" element={<WalletImport />} />
                <Route path="/utxo-table" element={<UTXOTable />} />
                <Route path="/utxo-map" element={<UTXOMap />} />
                <Route path="/risk-simulator" element={<RiskSimulator />} />
                <Route path="/report-export" element={<ReportExport />} />
                <Route path="/ai-assistant" element={<AIAssistant />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/tax" element={<TaxSettings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </TaxConfigProvider>
    </WalletProvider>
  </QueryClientProvider>
);

export default App;
