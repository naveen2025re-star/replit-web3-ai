import React from "react";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, LogOut, Copy, Check } from "lucide-react";
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface WalletConnectProps {
  children?: React.ReactNode;
}

export function WalletConnect({ children }: WalletConnectProps) {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { user, isAuthenticated, authenticate, isAuthenticating } = useWeb3Auth();
  const [showDialog, setShowDialog] = useState(false);

  if (isConnected && isAuthenticated && user) {
    return children || <ConnectedWallet />;
  }

  if (isConnected && !isAuthenticated) {
    return (
      <Card className="p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Complete Authentication</h3>
        <p className="text-muted-foreground mb-6">
          Sign a secure message with your wallet to verify ownership and access your personalized audit history. This creates a unique nonce for security.
        </p>
        <div className="space-y-3">
          <Button 
            onClick={authenticate} 
            disabled={isAuthenticating}
            data-testid="button-authenticate"
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isAuthenticating ? "🔐 Creating secure nonce..." : "🔐 Sign Message & Authenticate"}
          </Button>
          <p className="text-xs text-muted-foreground">
            This will open your wallet to sign a secure message
          </p>
          <Button variant="outline" onClick={() => disconnect()} className="w-full">
            Disconnect Wallet
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button data-testid="button-connect-wallet">
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Your Wallet
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            Choose a wallet to connect. You'll need to sign a message afterward to authenticate.
          </p>
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              variant="outline"
              onClick={() => {
                connect({ connector });
                setShowDialog(false);
              }}
              disabled={isPending}
              className="w-full justify-start h-12"
              data-testid={`button-connect-${connector.name.toLowerCase()}`}
            >
              <Wallet className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">{connector.name}</div>
                <div className="text-xs text-muted-foreground">Connect & authenticate</div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConnectedWallet() {
  const { user, disconnect, address } = useWeb3Auth();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyAddress = async () => {
    const walletAddress = user?.walletAddress || address;
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const walletAddress = user?.walletAddress || address || "";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="font-mono text-sm" data-testid="text-wallet-address">
          {formatAddress(walletAddress)}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={copyAddress}
          data-testid="button-copy-address"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => disconnect()}
        title="Disconnect Wallet"
        data-testid="button-disconnect"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}