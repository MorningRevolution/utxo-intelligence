
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, Tag } from "lucide-react";
import { useWallet } from "@/store/WalletContext";
import { getRiskColor } from "@/utils/utxo-utils";

interface UTXOFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  selectedRisk: string[];
  setSelectedRisk: (risk: string[]) => void;
  clearFilters: () => void;
}

export const UTXOFilters = ({
  searchTerm,
  setSearchTerm,
  selectedTags,
  setSelectedTags,
  selectedRisk,
  setSelectedRisk,
  clearFilters,
}: UTXOFiltersProps) => {
  const { tags } = useWallet();

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-4">
      <div className="flex-1">
        <Input
          placeholder="Search by txid, address, tag or notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      
      <div className="flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Tag className="mr-2 h-4 w-4" />
              Tags
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px] bg-popover text-popover-foreground z-50">
            {tags.map((tag) => (
              <DropdownMenuItem 
                key={tag.id}
                className="flex items-center gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedTags.includes(tag.id)) {
                    setSelectedTags(selectedTags.filter(id => id !== tag.id));
                  } else {
                    setSelectedTags([...selectedTags, tag.id]);
                  }
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }}></div>
                <span>{tag.name}</span>
                {selectedTags.includes(tag.id) && (
                  <span className="ml-auto">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Risk
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover text-popover-foreground z-50">
            {['low', 'medium', 'high'].map((risk) => (
              <DropdownMenuItem
                key={risk}
                className="flex items-center gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedRisk.includes(risk)) {
                    setSelectedRisk(selectedRisk.filter(r => r !== risk));
                  } else {
                    setSelectedRisk([...selectedRisk, risk]);
                  }
                }}
              >
                <div className={`w-3 h-3 rounded-full ${getRiskColor(risk as 'low' | 'medium' | 'high')}`}></div>
                <span className="capitalize">{risk}</span>
                {selectedRisk.includes(risk) && (
                  <span className="ml-auto">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {(searchTerm || selectedTags.length > 0 || selectedRisk.length > 0) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
};

export default UTXOFilters;
