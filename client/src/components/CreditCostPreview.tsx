import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Coins, Info, AlertCircle } from "lucide-react";

interface CreditCostPreviewProps {
  contractCode: string;
  contractLanguage?: string;
  userCredits?: number;
}

interface CostEstimate {
  baseCost: number;
  factors: {
    codeLength: number;
    complexity: number;
    hasMultipleFiles: boolean;
    language: string;
  };
  totalCost: number;
}

export function CreditCostPreview({ contractCode, contractLanguage = "solidity", userCredits = 0 }: CreditCostPreviewProps) {
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);

  useEffect(() => {
    if (!contractCode || contractCode.trim().length === 0) {
      setEstimate(null);
      return;
    }

    // Calculate estimate similar to server-side logic
    const calculateEstimate = (): CostEstimate => {
      let baseCredits = 10; // Minimum cost
      
      // Code length factor (logarithmic scaling)
      const lengthMultiplier = Math.max(1, Math.log10(contractCode.length / 100) * 0.5);
      baseCredits *= lengthMultiplier;
      
      // Complexity factor based on contract features
      let complexity = 1;
      const codeUpper = contractCode.toUpperCase();
      if (codeUpper.includes('MAPPING')) complexity += 1;
      if (codeUpper.includes('MODIFIER')) complexity += 1;
      if (codeUpper.includes('EVENT')) complexity += 0.5;
      if (codeUpper.includes('INTERFACE')) complexity += 0.5;
      if (codeUpper.includes('ASSEMBLY')) complexity += 2;
      if (codeUpper.includes('DELEGATECALL')) complexity += 1.5;
      if (codeUpper.includes('SELFDESTRUCT')) complexity += 1;
      
      complexity = Math.min(10, Math.max(1, complexity));
      const complexityMultiplier = 1 + (complexity - 1) * 0.2;
      baseCredits *= complexityMultiplier;
      
      // Multiple files check
      const hasMultipleFiles = contractCode.includes("import") || 
                               contractCode.includes("pragma") && 
                               (contractCode.match(/contract\s+\w+/gi) || []).length > 1;
      
      if (hasMultipleFiles) {
        baseCredits *= 1.5;
      }
      
      // Language multiplier
      const languageMultipliers: Record<string, number> = {
        'solidity': 1.0,
        'rust': 1.3,
        'go': 1.1,
        'vyper': 1.2,
        'cairo': 1.4,
        'move': 1.3
      };
      baseCredits *= languageMultipliers[contractLanguage.toLowerCase()] || 1.0;
      
      // Round and apply caps
      const finalCredits = Math.ceil(baseCredits);
      const totalCost = Math.max(5, Math.min(finalCredits, 500));
      
      return {
        baseCost: 10,
        factors: {
          codeLength: contractCode.length,
          complexity: Math.round(complexity * 10) / 10,
          hasMultipleFiles,
          language: contractLanguage
        },
        totalCost
      };
    };

    setEstimate(calculateEstimate());
  }, [contractCode, contractLanguage]);

  if (!estimate) {
    return null;
  }

  const canAfford = userCredits >= estimate.totalCost;
  const isExpensive = estimate.totalCost > 50;

  return (
    <Card className="p-4 bg-slate-800/50 border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Estimated Cost</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
            {estimate.totalCost}
          </span>
          <span className="text-sm text-gray-400">credits</span>
        </div>
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Code length:</span>
          <span className="text-gray-300">{estimate.factors.codeLength.toLocaleString()} chars</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Complexity:</span>
          <span className="text-gray-300">{estimate.factors.complexity}/10</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Language:</span>
          <span className="text-gray-300 capitalize">{estimate.factors.language}</span>
        </div>
        {estimate.factors.hasMultipleFiles && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Multiple files:</span>
            <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-orange-400 text-orange-300">
              +50%
            </Badge>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {!canAfford ? (
          <>
            <AlertCircle className="h-3 w-3 text-red-400" />
            <span className="text-xs text-red-400">
              Need {estimate.totalCost - userCredits} more credits
            </span>
          </>
        ) : isExpensive ? (
          <>
            <Info className="h-3 w-3 text-yellow-400" />
            <span className="text-xs text-yellow-400">
              High complexity analysis
            </span>
          </>
        ) : (
          <>
            <Coins className="h-3 w-3 text-green-400" />
            <span className="text-xs text-green-400">
              Ready to analyze
            </span>
          </>
        )}
      </div>
    </Card>
  );
}