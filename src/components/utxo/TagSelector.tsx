
import { useEffect, useState } from "react";
import { Check, Plus, Tag as TagIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/store/WalletContext";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  utxoId: string;
  onSelect: (tagId: string) => void;
  utxoTags: string[];
}

export const TagSelector = ({ utxoId, onSelect, utxoTags }: TagSelectorProps) => {
  const { tags, addTag, removeTagFromUTXO } = useWallet();
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const newTag = {
        id: Date.now().toString(),
        name: newTagName.trim(),
        color: newTagColor,
      };
      
      addTag(newTag);
      setNewTagName("");
      onSelect(newTag.id); // Apply the new tag immediately
    }
  };

  const handleRemoveTag = (tagId: string, tagName: string) => {
    removeTagFromUTXO(utxoId, tagId);
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagName.trim()) {
      handleAddTag();
    }
  };

  const availableColors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#8b5cf6", // purple
    "#f59e0b", // amber
    "#ef4444", // red
    "#6366f1", // indigo
    "#ec4899", // pink
    "#f97316", // orange
    "#06b6d4", // cyan
    "#14b8a6", // teal
  ];

  return (
    <>
      <div onClick={() => setOpen(true)} className="flex items-center cursor-pointer">
        <TagIcon className="h-4 w-4 mr-1" />
        <span>Manage Tags</span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
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
                    onClick={() => onSelect(tag.id)}
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
            <Button onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
