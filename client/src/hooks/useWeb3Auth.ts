import { useState, useEffect } from 'react'
import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import { SIGN_MESSAGE } from '@/lib/web3'
import type { User } from '@shared/schema'

export function useWeb3Auth() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Get user data if wallet is connected
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user', address],
    enabled: isConnected && !!address,
    retry: false,
  })

  // Sign and authenticate user
  const authenticateMutation = useMutation({
    mutationFn: async ({ address, signature }: { address: string; signature: string }) => {
      const response = await apiRequest('POST', '/api/auth/web3', {
        walletAddress: address,
        signature,
        message: SIGN_MESSAGE
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] })
      toast({
        title: "Successfully authenticated",
        description: "Welcome to SmartAudit AI!"
      })
    },
    onError: (error) => {
      toast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Failed to authenticate",
        variant: "destructive"
      })
    }
  })

  const handleAuthenticate = async () => {
    if (!address || !isConnected) return

    try {
      setIsAuthenticating(true)
      const signature = await signMessageAsync({ message: SIGN_MESSAGE })
      await authenticateMutation.mutateAsync({ address, signature })
    } catch (error) {
      console.error('Authentication error:', error)
      toast({
        title: "Authentication failed",
        description: "Failed to sign message or authenticate",
        variant: "destructive"
      })
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    queryClient.removeQueries({ queryKey: ['/api/auth/user'] })
    toast({
      title: "Disconnected",
      description: "Wallet disconnected successfully"
    })
  }

  return {
    // Wallet connection state
    address,
    isConnected,
    
    // User authentication state
    user,
    isAuthenticated: !!user,
    isUserLoading: userLoading,
    
    // Authentication actions
    authenticate: handleAuthenticate,
    disconnect: handleDisconnect,
    isAuthenticating: isAuthenticating || authenticateMutation.isPending,
  }
}