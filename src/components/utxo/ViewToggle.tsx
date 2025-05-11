
import { Button } from "@/components/ui/button";
import { Table, ArrowLeft } from "lucide-react";

interface ViewToggleProps {
  view: "table" | "visual";
  onViewChange: (view: "table" | "visual") => void;
}

export const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  return (
    <div className="flex items-center space-x-2 bg-muted/50 rounded-md p-1">
      {view === "visual" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewChange("table")}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Table</span>
        </Button>
      )}
      {view === "table" && (
        <>
          <Button
            variant={view === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewChange("table")}
            className="flex items-center gap-1"
          >
            <Table className="h-4 w-4" />
            <span>Table</span>
          </Button>
          <Button
            variant={view === "visual" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewChange("visual")}
            className="flex items-center gap-1"
          >
            <span>Visual</span>
          </Button>
        </>
      )}
    </div>
  );
};
