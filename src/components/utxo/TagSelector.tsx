import { useState, useEffect } from "react";
import { Check, Plus, Tag as TagIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/store/WalletContext";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

interface TagSelectorProps {
  utxoId: string;
  onSelect: (tagId: string) => void;
  utxoTags: string[];
}

export const TagSelector = ({ utxoId, onSelect, utxoTags }: TagSelectorProps) => {
  const { tags, addTag } = useWallet();
  const location = useLocation();
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  // Clean up dialog state and restore scroll on navigation
  useEffect(() => {
    setIsTagDialogOpen(false);
    document.body.style.overflow = 'auto';
  }, [location.pathname]);

  // Safety cleanup when dialog closes
  useEffect(() => {
    if (!isTagDialogOpen) {
      document.body.style.overflow = 'auto';
    }
  }, [isTagDialogOpen]);

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const newTag = {
        id: Date.now().toString(),
        name: newTagName.trim(),
        color: newTagColor,
      };
      addTag(newTag);
      setNewTagName("");
      onSelect(newTag.id);
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagName.trim()) {
      handleAddTag();
    }
  };

  const handleCloseDialog = () => {
    setIsTagDialogOpen(false);
    document.body.style.overflow = 'auto';
  };

  const handleTagSelect = (tagId: string) => {
    onSelect(tagId);
    // Explicitly not closing dialog to allow multiple selections
  };

  const availableColors = [
    "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
    "#6366f1", "#ec4899", "#f97316", "#06b6d4", "#14b8a6",
  ];

  return (
    <>
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setIsTagDialogOpen(true);
        }} 
        className="flex items-center cursor-pointer"
      >
        <TagIcon className="h-4 w-4 mr-1" />
        <span>Manage Tags</span>
      </div>

      <Dialog 
        open={isTagDialogOpen}
        onOpenChange={(open) => {
          setIsTagDialogOpen(open);
          if (!open) {
            document.body.style.overflow = 'auto';
          }
        }}
      >
        <DialogContent className="bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              Assign tags to your UTXOs for better organization
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-2">
              <h4 className="font-medium text-foreground">Assign Tags</h4>
              {tags.map((tag) => {
                const isSelected = utxoTags.includes(tag.name);
                
                return (
                  <div 
                    key={tag.id} 
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted/50",
                      isSelected && "bg-muted"
                    )}
                    onClick={() => handleTagSelect(tag.id)}
                  >
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-foreground">{tag.name}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                );
              })}
              
              {tags.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No tags available. Create your first tag below.
                </p>
              )}
            </div>
            
            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-foreground mb-2">Create New Tag</h4>
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1 bg-background text-foreground"
                  onKeyPress={handleTagKeyPress}
                />
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex flex-wrap gap-1">
                    {availableColors.map((color) => (
                      <div 
                        key={color} 
                        className={cn(
                          "w-6 h-6 rounded-full cursor-pointer border-2",
                          newTagColor === color ? "border-primary" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTagColor(color)}
                      />
                    ))}
                  </div>
                  
                  <Button 
                    size="sm"
                    disabled={!newTagName.trim()}
                    onClick={handleAddTag}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={handleCloseDialog}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
