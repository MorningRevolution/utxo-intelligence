
import { Button } from "@/components/ui/button";
import { Table, ArrowLeft, Eye } from "lucide-react";

// Define view as a literal union type
export type ViewType = "table" | "visual" | "graph";

interface ViewToggleProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  return (
    <div className="flex items-center space-x-2 bg-muted/50 rounded-md p-1">
      {view !== "table" && (
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
            <Eye className="h-4 w-4" />
            <span>Visual</span>
          </Button>
        </>
      )}
    </div>
  );
};
