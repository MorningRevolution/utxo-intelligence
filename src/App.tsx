
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./store/WalletContext";
import { Layout } from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import WalletImport from "./pages/WalletImport";
import UTXOTable from "./pages/UTXOTable";
import RiskSimulator from "./pages/RiskSimulator";
import ReportExport from "./pages/ReportExport";
import AIAssistant from "./pages/AIAssistant";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/wallet-import" element={<WalletImport />} />
              <Route path="/utxo-table" element={<UTXOTable />} />
              <Route path="/risk-simulator" element={<RiskSimulator />} />
              <Route path="/report-export" element={<ReportExport />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </WalletProvider>
  </QueryClientProvider>
);

export default App;
