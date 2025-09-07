import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { CheckCircle, Coins, ArrowRight, Sparkles, Shield, Zap, Code } from "lucide-react";

interface WelcomeModalProps {
  isNewUser: boolean;
  userCredits: number;
  onGetStarted: (template?: string) => void;
}

const sampleContracts = [
  {
    id: "erc20",
    title: "ERC-20 Token",
    description: "Basic token contract with potential vulnerabilities",
    estimatedCost: "15-25 credits",
    difficulty: "Beginner",
    code: `Analyze this ERC-20 token contract:

\`\`\`solidity
pragma solidity ^0.8.19;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract MyToken is IERC20 {
    mapping(address => uint256) private _balances;
    uint256 private _totalSupply;
    string public name = "MyToken";
    string public symbol = "MTK";
    
    function transfer(address to, uint256 amount) external returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        return true;
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }
}
\`\`\`

Please check for security vulnerabilities and suggest improvements.`
  },
  {
    id: "defi",
    title: "DeFi Staking Pool",
    description: "Staking contract with reentrancy concerns",
    estimatedCost: "25-40 credits",
    difficulty: "Intermediate",
    code: `Review this DeFi staking contract:

\`\`\`solidity
pragma solidity ^0.8.19;

contract StakingPool {
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public rewards;
    uint256 public totalStaked;
    
    function stake(uint256 amount) external payable {
        stakes[msg.sender] += amount;
        totalStaked += amount;
    }
    
    function withdraw(uint256 amount) external {
        require(stakes[msg.sender] >= amount, "Insufficient stake");
        stakes[msg.sender] -= amount;
        totalStaked -= amount;
        payable(msg.sender).transfer(amount);
    }
    
    function claimRewards() external {
        uint256 reward = calculateReward(msg.sender);
        rewards[msg.sender] = 0;
        payable(msg.sender).transfer(reward);
    }
    
    function calculateReward(address user) public view returns (uint256) {
        return stakes[user] * 10 / 100; // 10% APY
    }
}
\`\`\`

Please audit for reentrancy and other DeFi vulnerabilities.`
  },
  {
    id: "multisig",
    title: "Multi-Signature Wallet",
    description: "Advanced wallet with multiple security checks",
    estimatedCost: "40-60 credits",
    difficulty: "Advanced",
    code: `Audit this multi-signature wallet:

\`\`\`solidity
pragma solidity ^0.8.19;

contract MultiSigWallet {
    address[] public owners;
    uint public required;
    mapping(address => bool) public isOwner;
    mapping(uint => mapping(address => bool)) public confirmations;
    
    struct Transaction {
        address destination;
        uint value;
        bytes data;
        bool executed;
    }
    
    Transaction[] public transactions;
    
    function submitTransaction(address destination, uint value, bytes memory data) 
        public returns (uint transactionId) {
        transactionId = transactions.length;
        transactions.push(Transaction({
            destination: destination,
            value: value,
            data: data,
            executed: false
        }));
    }
    
    function confirmTransaction(uint transactionId) public {
        require(isOwner[msg.sender], "Not owner");
        confirmations[transactionId][msg.sender] = true;
        
        if (isConfirmed(transactionId)) {
            executeTransaction(transactionId);
        }
    }
    
    function executeTransaction(uint transactionId) public {
        Transaction storage txn = transactions[transactionId];
        require(!txn.executed, "Already executed");
        txn.executed = true;
        (bool success,) = txn.destination.call{value: txn.value}(txn.data);
        require(success, "Transaction failed");
    }
    
    function isConfirmed(uint transactionId) public view returns (bool) {
        uint count = 0;
        for (uint i = 0; i < owners.length; i++) {
            if (confirmations[transactionId][owners[i]])
                count += 1;
            if (count == required)
                return true;
        }
        return false;
    }
}
\`\`\`

Focus on access control and transaction execution security.`
  }
];

export function WelcomeModal({ isNewUser, userCredits, onGetStarted }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show welcome modal for new users or when they first access the auditor
    if (isNewUser && userCredits >= 1000) {
      setIsOpen(true);
    }
  }, [isNewUser, userCredits]);

  const handleGetStarted = (template?: string) => {
    setIsOpen(false);
    onGetStarted(template);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-400 border-green-400';
      case 'Intermediate': return 'text-yellow-400 border-yellow-400';
      case 'Advanced': return 'text-red-400 border-red-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">
                Welcome to SmartAudit AI!
              </DialogTitle>
              <DialogDescription className="text-gray-300 text-base">
                Your AI-powered smart contract security companion
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Credits Showcase */}
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-400/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Coins className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-400">1,000 Free Credits Added!</h3>
                  <p className="text-sm text-gray-400">Ready to analyze 10-20 smart contracts</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">{userCredits.toLocaleString()}</div>
                <div className="text-xs text-gray-400">available credits</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-gray-300">No payment required</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-blue-400" />
                <span className="text-gray-300">Real AI analysis</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-300">Instant results</span>
              </div>
            </div>
          </div>

          {/* Sample Contracts */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-400" />
              Try These Sample Contracts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sampleContracts.map((contract) => (
                <Card key={contract.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all duration-200 cursor-pointer group">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-white group-hover:text-blue-300 transition-colors">
                        {contract.title}
                      </h4>
                      <Badge variant="outline" className={`text-xs px-2 py-1 ${getDifficultyColor(contract.difficulty)}`}>
                        {contract.difficulty}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                      {contract.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {contract.estimatedCost}
                      </span>
                    </div>
                    
                    <Button
                      onClick={() => handleGetStarted(contract.code)}
                      variant="outline"
                      size="sm"
                      className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      Try This Contract
                      <ArrowRight className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Get Started Options */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
            <Button
              onClick={() => handleGetStarted()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              Start with Your Own Contract
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              onClick={() => handleGetStarted(sampleContracts[0].code)}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 py-3"
            >
              Begin with ERC-20 Example
              <Code className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            💡 Tip: Start with a sample contract to see how our AI analysis works, then try your own code
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}