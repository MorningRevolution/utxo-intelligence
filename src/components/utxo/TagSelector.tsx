
import { useState, useEffect } from "react";
import { Check, Plus, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/store/WalletContext";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface TagSelectorProps {
  utxoId: string;
  onSelect: (tagId: string, remove?: boolean) => void;
  utxoTags: string[];
  trigger?: React.ReactNode;
}

export const TagSelector = ({ 
  utxoId, 
  onSelect, 
  utxoTags, 
  trigger 
}: TagSelectorProps) => {
  const { tags, addTag, walletData } = useWallet();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  
  useEffect(() => {
    console.log("TagSelector mounted for UTXO:", utxoId?.substring(0, 6));
    console.log("Current tags for this UTXO:", utxoTags);
    
    return () => {
      console.log("TagSelector unmounted");
    };
  }, [utxoId, utxoTags, location.pathname]);

  const handleAddTag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (newTagName.trim()) {
      const newTag = {
        id: Date.now().toString(),
        name: newTagName.trim(),
        color: newTagColor,
      };
      addTag(newTag);
      setNewTagName("");
      
      console.log("TagSelector: Added new tag:", newTag.name);
      console.log("Calling onSelect with new tag ID:", newTag.id);
      onSelect(newTag.id);
      
      if (walletData) {
        const updatedUtxo = walletData.utxos.find(u => u.txid === utxoId);
        console.log("Updated UTXO tags after add:", updatedUtxo?.tags);
      }
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagName.trim()) {
      e.preventDefault();
      e.stopPropagation();
      handleAddTag(e as unknown as React.MouseEvent);
    }
  };

  const handleTagSelect = (e: React.MouseEvent, tagId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return;
    
    const isTagApplied = walletData?.utxos.find(u => u.txid === utxoId)?.tags.some(tagName => {
      const existingTag = tags.find(t => t.name === tagName);
      return existingTag?.id === tag.id;
    });
    
    if (isTagApplied) {
      console.log("TagSelector: Removing tag:", tag.name);
      onSelect(tagId, true);
    } else {
      console.log("TagSelector: Adding tag:", tag.name);
      onSelect(tagId, false);
    }
    
    setTimeout(() => {
      if (walletData) {
        const updatedUtxo = walletData.utxos.find(u => u.txid === utxoId);
        console.log("Updated UTXO tags after selection:", updatedUtxo?.tags);
      }
    }, 0);
  };

  // Remove the openChange handler as we want to control closing only via the Done button
  const handleOpenDialog = () => {
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
  };

  const defaultTrigger = (
    <div className="flex items-center cursor-pointer" tabIndex={0} data-testid="tag-selector-default-trigger">
      <TagIcon className="h-4 w-4 mr-1" />
      <span>Manage Tags</span>
    </div>
  );

  return (
    <>
      <div 
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log("TagSelector trigger clicked");
          handleOpenDialog();
        }}
        className="cursor-pointer"
        data-testid="tag-selector-wrapper"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            handleOpenDialog();
          }
        }}
      >
        {trigger ? trigger : defaultTrigger}
      </div>

      <Dialog 
        open={isOpen} 
        modal={true}
      >
        <DialogContent 
          className="bg-background text-foreground p-4 border border-border shadow-md w-72 max-w-[95vw] z-50"
          onClick={(e) => e.stopPropagation()}
          data-testid="tag-selector-dialog"
        >
          <DialogTitle className="font-medium text-foreground">Manage Tags</DialogTitle>
          <DialogDescription className="sr-only">
            Manage tags for the selected UTXO. You can add new tags or remove existing ones.
          </DialogDescription>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-2">
              <h4 className="font-medium text-foreground">Assign Tags</h4>
              
              <ScrollArea className="h-[180px] pr-4">
                <div className="space-y-1">
                  {tags.map((tag) => {
                    const isTagApplied = walletData?.utxos.find(u => u.txid === utxoId)?.tags.some(tagName => {
                      const existingTag = tags.find(t => t.name === tagName);
                      return existingTag?.id === tag.id;
                    });
                    
                    return (
                      <div 
                        key={tag.id} 
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted/50",
                          isTagApplied && "bg-muted"
                        )}
                        onClick={(e) => handleTagSelect(e, tag.id)}
                        data-testid={`tag-item-${tag.id}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTagSelect(e as unknown as React.MouseEvent, tag.id);
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
                        {isTagApplied && <Check className="h-4 w-4 text-primary" />}
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
                  onChange={(e) => {
                    e.stopPropagation();
                    setNewTagName(e.target.value);
                  }}
                  className="flex-1 bg-background text-foreground"
                  onKeyPress={handleTagKeyPress}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="tag-name-input"
                  tabIndex={0}
                />
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex flex-wrap gap-1">
                    {[
                      "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
                      "#6366f1", "#ec4899", "#f97316", "#06b6d4", "#14b8a6",
                    ].map((color) => (
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
                            e.stopPropagation();
                            setNewTagColor(color);
                          }
                        }}
                      />
                    ))}
                  </div>
                  
                  <Button 
                    size="sm"
                    disabled={!newTagName.trim()}
                    onClick={handleAddTag}
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
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                console.log("TagSelector dialog closing via Done button");
                handleCloseDialog();
              }}
              data-testid="tag-selector-close"
              tabIndex={0}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
