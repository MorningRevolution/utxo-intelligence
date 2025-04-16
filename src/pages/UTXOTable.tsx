
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom"; 
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/store/WalletContext";
import { TagSelector } from "@/components/utxo/TagSelector";
import { formatBTC, formatTxid, getRiskColor } from "@/utils/utxo-utils";
import { ArrowUpDown, Filter, MoreVertical, Tag, Eye, Info, Bookmark } from "lucide-react";
import { UTXO } from "@/types/utxo";

const UTXOTable = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { walletData, tags, tagUTXO, hasWallet, selectUTXO } = useWallet();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof UTXO; direction: 'asc' | 'desc' }>({
    key: 'amount',
    direction: 'desc'
  });
  const [detailsUtxo, setDetailsUtxo] = useState<UTXO | null>(null);

  // Redirect if no wallet is loaded
  if (!hasWallet) {
    navigate("/wallet-import");
    toast({
      title: "No wallet loaded",
      description: "Please import a wallet first",
    });
  }

  const filteredUtxos = useMemo(() => {
    if (!walletData) return [];

    return walletData.utxos.filter(utxo => {
      // Filter by search term
      const matchesSearch = 
        searchTerm === "" || 
        utxo.txid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utxo.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utxo.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by selected tags
      const matchesTags = 
        selectedTags.length === 0 || 
        selectedTags.some(tagId => {
          const tagName = tags.find(t => t.id === tagId)?.name;
          return tagName && utxo.tags.includes(tagName);
        });
      
      // Filter by risk level
      const matchesRisk = 
        selectedRisk.length === 0 || 
        selectedRisk.includes(utxo.privacyRisk);
      
      return matchesSearch && matchesTags && matchesRisk;
    }).sort((a, b) => {
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' 
          ? a.amount - b.amount 
          : b.amount - a.amount;
      }
      
      if (sortConfig.key === 'confirmations') {
        return sortConfig.direction === 'asc'
          ? a.confirmations - b.confirmations
          : b.confirmations - a.confirmations;
      }
      
      // String comparison for other fields
      const aValue = String(a[sortConfig.key]);
      const bValue = String(b[sortConfig.key]);
      
      if (sortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      }
      return bValue.localeCompare(aValue);
    });
  }, [walletData, searchTerm, selectedTags, selectedRisk, sortConfig, tags]);

  const handleSort = (key: keyof UTXO) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleTagSelection = (utxoId: string, tagId: string) => {
    if (tagId && utxoId) {
      tagUTXO(utxoId, tagId);
      toast({
        title: "Tag applied",
        description: "The tag has been applied to the UTXO",
      });
    }
  };

  const handleViewDetails = (utxo: UTXO) => {
    setDetailsUtxo(utxo);
  };

  const handleAddToSimulation = (utxo: UTXO) => {
    selectUTXO(utxo);
    toast({
      title: "UTXO added to simulation",
      description: "Navigate to Risk Simulator to analyze transaction privacy",
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
    setSelectedRisk([]);
  };

  if (!walletData) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-white mb-4">No wallet data available.</p>
        <Button onClick={() => navigate("/wallet-import")}>Import Wallet</Button>
      </div>
    );
  }

  return (
    <div className="container px-2 md:px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">UTXO Table</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/risk-simulator")}
          >
            <Eye className="mr-2 h-4 w-4" />
            Risk Simulator
          </Button>
        </div>
      </div>

      <div className="bg-dark-card rounded-lg shadow-lg p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by txid, address or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="mr-2 h-4 w-4" />
                  Tags
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                {tags.map((tag) => (
                  <DropdownMenuItem 
                    key={tag.id}
                    className="flex items-center gap-2"
                    onClick={() => {
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
              <DropdownMenuContent align="end">
                {['low', 'medium', 'high'].map((risk) => (
                  <DropdownMenuItem
                    key={risk}
                    className="flex items-center gap-2"
                    onClick={() => {
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

        <div className="rounded-md border border-dark-border">
          <Table>
            <TableCaption>
              {filteredUtxos.length} of {walletData.utxos.length} UTXOs • Total Balance: {formatBTC(walletData.totalBalance)}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('txid')}>
                    TxID
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('amount')}>
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('confirmations')}>
                    Confs
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('privacyRisk')}>
                    Risk
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUtxos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No UTXOs matching the current filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredUtxos.map((utxo) => (
                  <TableRow key={utxo.txid + "-" + utxo.vout}>
                    <TableCell className="font-mono">
                      {formatTxid(utxo.txid)}
                    </TableCell>
                    <TableCell>{formatBTC(utxo.amount)}</TableCell>
                    <TableCell>{utxo.confirmations}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {utxo.tags.map((tagName, index) => {
                          const tag = tags.find(t => t.name === tagName);
                          return tag ? (
                            <Badge 
                              key={index}
                              style={{ backgroundColor: tag.color }} 
                              className="text-white"
                            >
                              {tagName}
                            </Badge>
                          ) : null;
                        })}
                        {utxo.tags.length === 0 && (
                          <span className="text-muted-foreground text-sm">No tags</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${getRiskColor(utxo.privacyRisk)}`}></div>
                        <span className="ml-2 capitalize">{utxo.privacyRisk}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(utxo)}>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Tag className="mr-2 h-4 w-4" />
                            <TagSelector 
                              utxoId={utxo.txid}
                              onSelect={(tagId) => handleTagSelection(utxo.txid, tagId)}
                              utxoTags={utxo.tags}
                            />
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddToSimulation(utxo)}>
                            <Bookmark className="mr-2 h-4 w-4" />
                            Add to Simulation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!detailsUtxo} onOpenChange={(open) => !open && setDetailsUtxo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>UTXO Details</DialogTitle>
            <DialogDescription>
              Detailed information about this UTXO
            </DialogDescription>
          </DialogHeader>
          
          {detailsUtxo && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transaction ID</Label>
                  <div className="font-mono text-xs mt-1 bg-dark-lighter p-2 rounded overflow-x-auto">
                    {detailsUtxo.txid}
                  </div>
                </div>
                <div>
                  <Label>Output Index</Label>
                  <div className="font-mono text-sm mt-1">{detailsUtxo.vout}</div>
                </div>
              </div>
              
              <div>
                <Label>Address</Label>
                <div className="font-mono text-xs mt-1 bg-dark-lighter p-2 rounded overflow-x-auto">
                  {detailsUtxo.address}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount</Label>
                  <div className="font-mono text-sm mt-1">{formatBTC(detailsUtxo.amount)}</div>
                </div>
                <div>
                  <Label>Confirmations</Label>
                  <div className="font-mono text-sm mt-1">{detailsUtxo.confirmations}</div>
                </div>
              </div>
              
              <div>
                <Label>Script Pubkey</Label>
                <div className="font-mono text-xs mt-1 bg-dark-lighter p-2 rounded overflow-x-auto">
                  {detailsUtxo.scriptPubKey}
                </div>
              </div>
              
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {detailsUtxo.tags.length > 0 ? (
                    detailsUtxo.tags.map((tagName, index) => {
                      const tag = tags.find(t => t.name === tagName);
                      return tag ? (
                        <Badge 
                          key={index}
                          style={{ backgroundColor: tag.color }} 
                          className="text-white"
                        >
                          {tagName}
                        </Badge>
                      ) : null;
                    })
                  ) : (
                    <span className="text-muted-foreground">No tags assigned</span>
                  )}
                </div>
              </div>
              
              <div>
                <Label>Privacy Risk</Label>
                <div className="flex items-center mt-1">
                  <div className={`w-3 h-3 rounded-full ${getRiskColor(detailsUtxo.privacyRisk)}`}></div>
                  <span className="ml-2 capitalize">{detailsUtxo.privacyRisk}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setDetailsUtxo(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UTXOTable;
