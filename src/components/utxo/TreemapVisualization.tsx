
import React, { useState } from "react";
import { UTXO } from "@/types/utxo";
import { createTreemapData, safeFormatBTC } from "@/utils/visualization-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit } from "lucide-react";
import { getRiskBadgeStyle } from "@/utils/utxo-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface TreemapVisualizationProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
}

export const TreemapVisualization: React.FC<TreemapVisualizationProps> = ({ 
  utxos, 
  onSelectUtxo 
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedUtxo, setSelectedUtxo] = useState<UTXO | null>(null);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [showUtxoDialog, setShowUtxoDialog] = useState(false);
  const [editableNote, setEditableNote] = useState("");
  
  // Generate treemap data
  const treemapData = React.useMemo(() => {
    return createTreemapData(utxos);
  }, [utxos]);
  
  // Calculate total BTC amount
  const totalAmount = React.useMemo(() => {
    return treemapData.reduce((sum, item) => sum + item.value, 0);
  }, [treemapData]);
  
  // Handle category selection
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setShowCategoryDrawer(true);
  };
  
  // Handle UTXO selection
  const handleUtxoClick = (utxo: UTXO) => {
    setSelectedUtxo(utxo);
    setEditableNote(utxo.notes || "");
    setShowUtxoDialog(true);
    
    if (onSelectUtxo) {
      onSelectUtxo(utxo);
    }
  };
  
  // Calculate relative size based on BTC amount
  const calculateSize = (amount: number) => {
    if (totalAmount === 0) return 0;
    return (amount / totalAmount) * 100;
  };

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
          <span>Low Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#ea384c]"></div>
          <span>High Risk</span>
        </div>
      </div>
      
      {/* Treemap visualization */}
      <div className="bg-card rounded-lg shadow-sm p-4" style={{ minHeight: '60vh' }}>
        <h2 className="text-lg font-semibold mb-4">UTXO Privacy Risk Distribution</h2>
        
        {utxos.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No UTXOs to display.
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {treemapData.map((category) => (
                <div 
                  key={category.name} 
                  className="bg-muted p-3 rounded-lg text-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <h3 className="font-medium" style={{ color: category.color }}>{category.name}</h3>
                  <p className="text-2xl font-bold mt-1">{category.count}</p>
                  <p className="text-sm mt-1">{safeFormatBTC(category.value)}</p>
                  <p className="text-xs mt-1">
                    {totalAmount > 0 ? `${((category.value / totalAmount) * 100).toFixed(1)}%` : '0%'}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Treemap visualization */}
            <div className="grid grid-cols-1 gap-4">
              {treemapData.map((category) => (
                <div 
                  key={category.name}
                  className="relative overflow-hidden rounded-lg cursor-pointer transition-transform hover:scale-[1.01]"
                  style={{ 
                    backgroundColor: `${category.color}20`,
                    height: `${Math.max(100, calculateSize(category.value) * 4)}px`,
                    borderLeft: `4px solid ${category.color}`
                  }}
                  onClick={() => handleCategoryClick(category.name)}
                >
                  <div className="absolute top-0 left-0 p-3">
                    <h3 className="font-medium" style={{ color: category.color }}>
                      {category.name}
                    </h3>
                    <p className="text-sm">
                      {category.count} UTXOs | {safeFormatBTC(category.value)}
                    </p>
                  </div>
                  
                  {/* Visual representation of UTXOs within category */}
                  <div className="absolute inset-0 flex flex-wrap items-center justify-center p-12 opacity-50">
                    {category.utxos.slice(0, 20).map((utxo, i) => (
                      <div 
                        key={`${utxo.txid}-${utxo.vout}`}
                        className="m-1 rounded-sm"
                        style={{ 
                          width: `${Math.max(10, Math.log10(1 + utxo.amount) * 20)}px`,
                          height: `${Math.max(10, Math.log10(1 + utxo.amount) * 20)}px`,
                          backgroundColor: category.color
                        }}
                      />
                    ))}
                    {category.utxos.length > 20 && (
                      <div className="text-xs font-medium ml-2">
                        +{category.utxos.length - 20} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Category Drawer */}
      <Drawer open={showCategoryDrawer} onOpenChange={setShowCategoryDrawer}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>
              {selectedCategory} UTXOs
            </DrawerTitle>
            <DrawerDescription>
              {treemapData.find(c => c.name === selectedCategory)?.count || 0} UTXOs found
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 py-2">
            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-2">
              {selectedCategory && treemapData.find(c => c.name === selectedCategory)?.utxos.map((utxo) => (
                <div 
                  key={`${utxo.txid}-${utxo.vout}`}
                  className="border rounded-md p-3 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleUtxoClick(utxo)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium truncate">
                        UTXO {utxo.txid.substring(0, 8)}...:{utxo.vout}
                      </p>
                      <p className="text-sm mt-1 font-mono">{safeFormatBTC(utxo.amount)}</p>
                    </div>
                    <Badge className={getRiskBadgeStyle(utxo.privacyRisk)}>
                      {utxo.privacyRisk}
                    </Badge>
                  </div>
                  
                  {/* Tags */}
                  {utxo.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {utxo.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <DrawerFooter>
            <Button variant="outline" onClick={() => setShowCategoryDrawer(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      
      {/* UTXO Dialog */}
      <Dialog open={showUtxoDialog} onOpenChange={setShowUtxoDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>UTXO Details</DialogTitle>
            <DialogDescription>
              {selectedUtxo ? `TXID: ${selectedUtxo.txid.substring(0, 10)}...` : ""}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUtxo && (
            <div className="space-y-4 py-2">
              {/* Basic info */}
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Outpoint:</span>
                  <span className="text-sm font-mono">{selectedUtxo.txid}:{selectedUtxo.vout}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium">Amount:</span>
                  <span className="text-sm font-mono">{safeFormatBTC(selectedUtxo.amount)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium">Address:</span>
                  <span className="text-sm font-mono truncate max-w-[250px]">{selectedUtxo.address}</span>
                </div>
                {selectedUtxo.receiverAddress && (
                  <div className="flex justify-between mt-1">
                    <span className="text-sm font-medium">Receiver:</span>
                    <span className="text-sm font-mono truncate max-w-[250px]">{selectedUtxo.receiverAddress}</span>
                  </div>
                )}
                {selectedUtxo.acquisitionDate && (
                  <div className="flex justify-between mt-1">
                    <span className="text-sm font-medium">Date:</span>
                    <span className="text-sm">{new Date(selectedUtxo.acquisitionDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              {/* Tags */}
              <div>
                <h3 className="text-sm font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedUtxo.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="cursor-pointer">
                      {tag} <span className="ml-1 text-muted-foreground">×</span>
                    </Badge>
                  ))}
                  {selectedUtxo.tags.length === 0 && (
                    <span className="text-xs text-muted-foreground">No tags</span>
                  )}
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  Add Tag
                </Button>
              </div>
              
              {/* Notes (editable) */}
              <div>
                <h3 className="text-sm font-medium mb-1">Notes</h3>
                <div className="flex items-center gap-2">
                  <Input
                    value={editableNote}
                    onChange={(e) => setEditableNote(e.target.value)}
                    placeholder="Add notes..."
                    className="text-sm"
                  />
                  <Button size="sm" className="shrink-0">
                    <Edit className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
              
              {/* Privacy analysis */}
              <div>
                <h3 className="text-sm font-medium mb-2">Privacy Analysis</h3>
                <div className={`p-3 rounded-lg text-sm ${
                  selectedUtxo.privacyRisk === 'high' ? 'bg-red-100 dark:bg-red-950/20' :
                  selectedUtxo.privacyRisk === 'medium' ? 'bg-orange-100 dark:bg-orange-950/20' :
                  'bg-green-100 dark:bg-green-950/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getRiskBadgeStyle(selectedUtxo.privacyRisk)}>
                      {selectedUtxo.privacyRisk.toUpperCase()} RISK
                    </Badge>
                  </div>
                  
                  {selectedUtxo.privacyRisk === 'high' && (
                    <p>This UTXO has high privacy risk due to its traceability to KYC-related sources.</p>
                  )}
                  
                  {selectedUtxo.privacyRisk === 'medium' && (
                    <p>This UTXO has medium privacy risk. Consider using CoinJoin before spending.</p>
                  )}
                  
                  {selectedUtxo.privacyRisk === 'low' && (
                    <p>This UTXO has good privacy characteristics.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUtxoDialog(false)}>
              Close
            </Button>
            <Button>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
