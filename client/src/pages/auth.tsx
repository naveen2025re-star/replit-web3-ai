import React from "react";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wallet, Shield, Zap, Lock } from "lucide-react";
import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { user, isAuthenticated, authenticate, isAuthenticating } = useWeb3Auth();
  const [, setLocation] = useLocation();

  // Redirect to auditor if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation("/app");
    }
  }, [isAuthenticated, user, setLocation]);

  if (isConnected && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="p-8 bg-slate-800/50 border-slate-700 backdrop-blur">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Shield className="h-10 w-10 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Complete Authentication</h1>
              <p className="text-slate-300 mb-8">
                Sign a secure message with your wallet to verify ownership and access SmartAudit AI. 
                This creates a unique cryptographic nonce for maximum security.
              </p>
              <div className="space-y-4">
                <Button 
                  onClick={authenticate} 
                  disabled={isAuthenticating}
                  data-testid="button-authenticate"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {isAuthenticating ? (
                    <>
                      <Lock className="h-5 w-5 mr-2 animate-spin" />
                      Creating secure nonce...
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5 mr-2" />
                      Sign Message & Authenticate
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-400">
                  This will open your wallet to sign a secure message
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => disconnect()} 
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Disconnect Wallet
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mr-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">SmartAudit AI</h1>
              <p className="text-blue-300">Web3 Smart Contract Security Auditor</p>
            </div>
          </div>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Advanced AI-powered smart contract analysis. Connect your wallet to access 
            personalized audit history and secure contract evaluation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="p-6 bg-slate-800/50 border-slate-700 backdrop-blur">
            <Zap className="h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast Analysis</h3>
            <p className="text-slate-300">
              Get comprehensive security analysis in seconds using cutting-edge AI models 
              trained on thousands of smart contracts.
            </p>
          </Card>
          <Card className="p-6 bg-slate-800/50 border-slate-700 backdrop-blur">
            <Lock className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Secure & Private</h3>
            <p className="text-slate-300">
              Your contracts are analyzed securely with Web3 authentication. 
              Keep track of your audit history with wallet-based authentication.
            </p>
          </Card>
        </div>

        <Card className="p-8 bg-slate-800/50 border-slate-700 backdrop-blur">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-6">Connect Your Wallet</h2>
            <p className="text-slate-300 mb-8">
              Choose a wallet to connect. You'll need to sign a message afterward to authenticate securely.
            </p>
            <div className="grid gap-4 max-w-sm mx-auto">
              {connectors.map((connector) => (
                <Button
                  key={connector.id}
                  variant="outline"
                  onClick={() => connect({ connector })}
                  disabled={isPending}
                  className="h-14 border-slate-600 text-slate-200 hover:bg-slate-700 justify-start"
                  data-testid={`button-connect-${connector.name.toLowerCase()}`}
                >
                  <Wallet className="h-6 w-6 mr-4" />
                  <div className="text-left">
                    <div className="font-medium text-lg">{connector.name}</div>
                    <div className="text-sm text-slate-400">Connect & authenticate securely</div>
                  </div>
                </Button>
              ))}
            </div>
            <div className="mt-8 text-sm text-slate-400">
              🔒 Secure authentication powered by Web3 cryptographic signatures
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}