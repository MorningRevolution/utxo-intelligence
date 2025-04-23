import { useState, useEffect } from "react";
import { Check, Plus, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/store/WalletContext";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";

interface TagSelectorProps {
  utxoId: string;
  onSelect: (tagId: string | null) => void;
  utxoTags: string[];
  trigger?: React.ReactNode;
}

export const TagSelector = ({ 
  utxoId, 
  onSelect, 
  utxoTags, 
  trigger 
}: TagSelectorProps) => {
  const { tags, addTag } = useWallet();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  
  // Fallback cleanup for route changes
  useEffect(() => {
    return () => {
      setIsOpen(false);
    };
  }, [location.pathname]);

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
      console.log("TagSelector: Added new tag:", newTag.name);
      // Keep dialog open for multiple selections
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagName.trim()) {
      handleAddTag();
    }
  };

  const handleTagSelect = (tagId: string) => {
    // Find if this tag is already assigned
    const tag = tags.find(t => t.id === tagId);
    if (tag && utxoTags.includes(tag.name)) {
      // Tag already assigned, so unassign it
      console.log("TagSelector: Removing tag:", tag.name);
      onSelect(null);
    } else {
      // Tag not assigned, so assign it
      console.log("TagSelector: Adding tag:", tag?.name);
      onSelect(tagId);
    }
    // Explicitly not closing dialog to allow multiple selections
  };

  const availableColors = [
    "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
    "#6366f1", "#ec4899", "#f97316", "#06b6d4", "#14b8a6",
  ];

  const defaultTrigger = (
    <div className="flex items-center cursor-pointer" tabIndex={0} data-testid="tag-selector-default-trigger">
      <TagIcon className="h-4 w-4 mr-1" />
      <span>Manage Tags</span>
    </div>
  );

  // Using AlertDialog instead of Dialog to avoid nesting issues
  // AlertDialog uses a different context than Dialog
  return (
    <>
      <div 
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsOpen(true);
        }}
        className="cursor-pointer"
        data-testid="tag-selector-wrapper"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        {trigger ? trigger : defaultTrigger}
      </div>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent 
          className="bg-background text-foreground p-4 border border-border shadow-md w-72 max-w-[95vw]"
          onClick={(e) => e.stopPropagation()}
          data-testid="tag-selector-dialog"
          tabIndex={0}
        >
          <AlertDialogTitle className="font-medium text-foreground">Manage Tags</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Manage tags for the selected UTXO. You can add new tags or remove existing ones.
          </AlertDialogDescription>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-2">
              <h4 className="font-medium text-foreground">Assign Tags</h4>
              
              <ScrollArea className="h-[180px] pr-4">
                <div className="space-y-1">
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
                        data-testid={`tag-item-${tag.id}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleTagSelect(tag.id);
                          }
                        }}
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
              </ScrollArea>
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
                  onClick={(e) => e.stopPropagation()}
                  data-testid="tag-name-input"
                  tabIndex={0}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewTagColor(color);
                        }}
                        data-testid={`tag-color-${color.substring(1)}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setNewTagColor(color);
                          }
                        }}
                      />
                    ))}
                  </div>
                  
                  <Button 
                    size="sm"
                    disabled={!newTagName.trim()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddTag();
                    }}
                    data-testid="add-tag-button"
                    tabIndex={0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <AlertDialogFooter className="mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              data-testid="tag-selector-close"
              tabIndex={0}
            >
              Done
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
