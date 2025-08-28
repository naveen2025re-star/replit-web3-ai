import React, { useState, useEffect } from "react";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Wallet, LogOut, Copy, Check, Shield, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface LandingWalletConnectProps {
  children?: React.ReactNode;
  contractInput?: string;
}

export function LandingWalletConnect({ children, contractInput }: LandingWalletConnectProps) {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { user, isAuthenticated, authenticate, isAuthenticating } = useWeb3Auth();
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<'connecting' | 'signing' | 'completed'>('connecting');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Handle wallet connection state changes
  useEffect(() => {
    if (isConnected && !isAuthenticated) {
      setShowWalletDialog(false);
      setShowAuthModal(true);
      setAuthStep('signing');
    }
  }, [isConnected, isAuthenticated]);

  // Handle successful authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      setAuthStep('completed');
      setTimeout(() => {
        setShowAuthModal(false);
        setLocation("/auditor");
      }, 1500);
    }
  }, [isAuthenticated, user, setLocation]);

  const handleConnect = (connector: any) => {
    setAuthStep('connecting');
    connect({ connector });
    setShowWalletDialog(false);
  };

  const handleAuthenticate = async () => {
    setAuthStep('signing');
    await authenticate();
  };

  // If already authenticated, redirect or show children
  if (isAuthenticated && user) {
    return children || null;
  }

  return (
    <>
      {/* Connect Wallet Button */}
      {children ? (
        <div onClick={() => setShowWalletDialog(true)} className="cursor-pointer">
          {children}
        </div>
      ) : (
        <Button 
          onClick={() => setShowWalletDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          data-testid="button-connect-wallet"
        >
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </Button>
      )}

      {/* Wallet Selection Dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Wallet className="h-5 w-5 text-blue-400" />
              Connect Your Wallet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-400 mb-4">
              Choose a wallet to connect. You'll need to sign a message afterward to authenticate securely.
            </p>
            {connectors.map((connector) => (
              <Button
                key={connector.id}
                variant="outline"
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className="w-full justify-start h-12 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                data-testid={`button-connect-${connector.name.toLowerCase()}`}
              >
                <Wallet className="h-5 w-5 mr-3 text-blue-400" />
                <div className="text-left">
                  <div className="font-medium">{connector.name}</div>
                  <div className="text-xs text-gray-400">Connect & authenticate</div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Authentication Progress Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700 text-white">
          <DialogHeader className="sr-only">
            <DialogTitle>Wallet Authentication</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            {authStep === 'connecting' && (
              <div className="space-y-6">
                <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Connecting Wallet</h3>
                  <p className="text-gray-400">
                    Please check your wallet and approve the connection request.
                  </p>
                </div>
              </div>
            )}

            {authStep === 'signing' && (
              <div className="space-y-6">
                <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Complete Authentication</h3>
                  <p className="text-gray-400 mb-6">
                    Sign a secure message with your wallet to verify ownership and access your personalized audit history.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <Button 
                    onClick={handleAuthenticate} 
                    disabled={isAuthenticating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                    data-testid="button-authenticate"
                  >
                    {isAuthenticating ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating secure nonce...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Sign Message & Authenticate
                      </div>
                    )}
                  </Button>
                  
                  <p className="text-xs text-gray-400">
                    This will open your wallet to sign a secure message for authentication
                  </p>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      disconnect();
                      setShowAuthModal(false);
                    }} 
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect Wallet
                  </Button>
                </div>
              </div>
            )}

            {authStep === 'completed' && (
              <div className="space-y-6">
                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-green-400 mb-2">Authentication Successful!</h3>
                  <p className="text-gray-400 mb-4">
                    Welcome to SmartAudit AI! Redirecting to the auditor interface...
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
                    <Clock className="h-4 w-4" />
                    <span>Redirecting in a moment...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <div className={`w-2 h-2 rounded-full ${authStep === 'connecting' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
              <div className={`w-8 h-px ${authStep === 'connecting' ? 'bg-gray-600' : 'bg-green-500'}`}></div>
              <div className={`w-2 h-2 rounded-full ${
                authStep === 'connecting' ? 'bg-gray-600' : 
                authStep === 'signing' ? 'bg-blue-500' : 'bg-green-500'
              }`}></div>
              <div className={`w-8 h-px ${authStep === 'completed' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
              <div className={`w-2 h-2 rounded-full ${authStep === 'completed' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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