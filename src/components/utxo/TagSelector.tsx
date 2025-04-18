
import { useState } from "react";
import { Tag as TagIcon } from "lucide-react";
import { ManageTagsDialog } from "@/components/ui/ManageTagsDialog";

interface TagSelectorProps {
  utxoId: string;
  onSelect: (tagId: string) => void;
  utxoTags: string[];
}

export const TagSelector = ({ utxoId, onSelect, utxoTags }: TagSelectorProps) => {
  const [showTagDialog, setShowTagDialog] = useState(false);

  return (
    <>
      <div onClick={() => setShowTagDialog(true)} className="flex items-center cursor-pointer">
        <TagIcon className="h-4 w-4 mr-1" />
        <span>Manage Tags</span>
      </div>

      <ManageTagsDialog
        isOpen={showTagDialog}
        onOpenChange={setShowTagDialog}
        utxoId={utxoId}
        onSelect={onSelect}
        utxoTags={utxoTags}
      />
    </>
  );
};
