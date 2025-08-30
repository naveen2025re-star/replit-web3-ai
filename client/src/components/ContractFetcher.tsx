import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Globe, Search, AlertCircle } from "lucide-react";

interface ContractFetcherProps {
  onContractFetch: (contractAddress: string, network: string) => Promise<void>;
}

const SUPPORTED_NETWORKS = [
  { value: "ethereum", label: "Ethereum", icon: "⟠" },
  { value: "polygon", label: "Polygon", icon: "🔷" },
  { value: "bsc", label: "BNB Smart Chain", icon: "🟡" },
  { value: "arbitrum", label: "Arbitrum", icon: "🔵" },
  { value: "optimism", label: "Optimism", icon: "🔴" },
  { value: "avalanche", label: "Avalanche", icon: "🔺" },
];

export function ContractFetcher({ onContractFetch }: ContractFetcherProps) {
  const [contractAddress, setContractAddress] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("ethereum");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractAddress.trim()) {
      return;
    }

    // Validate address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(contractAddress.trim())) {
      return;
    }

    setIsLoading(true);
    try {
      await onContractFetch(contractAddress.trim(), selectedNetwork);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidAddress = contractAddress.trim() === "" || /^0x[a-fA-F0-9]{40}$/.test(contractAddress.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contract-address" className="text-sm font-medium text-white">
          Contract Address
        </Label>
        <Input
          id="contract-address"
          type="text"
          placeholder="0x..."
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          className={`bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 ${
            !isValidAddress ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
          }`}
          data-testid="input-contract-address"
        />
        {!isValidAddress && (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <AlertCircle className="h-3 w-3" />
            Please enter a valid Ethereum address (0x...)
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="network" className="text-sm font-medium text-white">
          Blockchain Network
        </Label>
        <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_NETWORKS.map((network) => (
              <SelectItem key={network.value} value={network.value}>
                <div className="flex items-center gap-2">
                  <span>{network.icon}</span>
                  <span>{network.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-blue-500/10 border-blue-500/20 p-3">
        <div className="flex items-start gap-2 text-sm text-blue-400">
          <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium mb-1">Verified Contracts Only</div>
            <div className="text-xs text-blue-300">
              Only verified smart contracts can be fetched. The source code must be publicly available on blockchain explorers.
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={!contractAddress.trim() || !isValidAddress || isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          data-testid="button-fetch-contract"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Fetching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Fetch Contract
            </>
          )}
        </Button>
      </div>
    </form>
  );
}