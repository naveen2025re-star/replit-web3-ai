import React from "react";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, LogOut, Copy, Check } from "lucide-react";
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
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
      <Card className="p-6 text-center">
        <Wallet className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h3 className="text-lg font-semibold mb-2">Authenticate Wallet</h3>
        <p className="text-muted-foreground mb-4">
          Sign a message to verify your wallet and access your personalized audit history
        </p>
        <Button 
          onClick={authenticate} 
          disabled={isAuthenticating}
          data-testid="button-authenticate"
        >
          {isAuthenticating ? "Authenticating..." : "Sign Message"}
        </Button>
        <Button variant="ghost" onClick={disconnect} className="ml-2">
          Disconnect
        </Button>
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
          <DialogTitle>Connect Your Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              variant="outline"
              onClick={() => {
                connect({ connector });
                setShowDialog(false);
              }}
              disabled={isPending}
              className="w-full justify-start"
              data-testid={`button-connect-${connector.name.toLowerCase()}`}
            >
              <Wallet className="h-4 w-4 mr-2" />
              {connector.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConnectedWallet() {
  const { user, disconnect } = useWeb3Auth();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyAddress = async () => {
    if (user?.walletAddress) {
      await navigator.clipboard.writeText(user.walletAddress);
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

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="font-mono text-sm" data-testid="text-wallet-address">
          {formatAddress(user?.walletAddress || "")}
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
        onClick={disconnect}
        title="Disconnect Wallet"
        data-testid="button-disconnect"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}