
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="container px-2 md:px-4 py-6">
      <div className="flex items-center mb-6">
        <FileText className="h-10 w-10 text-bitcoin mr-3" />
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => navigate("/settings/tax")}
        >
          Tax Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
