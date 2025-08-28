import { useState, useEffect } from 'react'
import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import { generateNonceAndMessage } from '@/lib/web3'
import type { User } from '@shared/schema'

export function useWeb3Auth() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false)

  // Check localStorage for existing authentication on mount
  useEffect(() => {
    if (!address || !isConnected) return
    
    const authKey = `auth_${address.toLowerCase()}`
    const storedAuth = localStorage.getItem(authKey)
    
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth)
        // Check if stored auth is not expired (24 hours)
        if (authData.timestamp && Date.now() - authData.timestamp < 24 * 60 * 60 * 1000) {
          setHasAttemptedAuth(true)
          queryClient.setQueryData([`/api/auth/user/${address}`], authData.user)
          return
        }
      } catch (error) {
        console.warn('Invalid stored auth data:', error)
      }
      // Clear expired auth
      localStorage.removeItem(authKey)
    }
  }, [address, isConnected, queryClient])

  // Get user data only after authentication attempt
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/auth/user/${address}`],
    enabled: isConnected && !!address && hasAttemptedAuth,
    retry: false,
  })

  // Sign and authenticate user
  const authenticateMutation = useMutation({
    mutationFn: async ({ address, signature, message }: { address: string; signature: string; message: string }) => {
      const response = await apiRequest('POST', '/api/auth/web3', {
        walletAddress: address,
        signature,
        message
      })
      return response.json()
    },
    onSuccess: (data) => {
      setHasAttemptedAuth(true)
      queryClient.invalidateQueries({ queryKey: [`/api/auth/user/${address}`] })
      queryClient.setQueryData([`/api/auth/user/${address}`], data.user)
      
      // Store authentication in localStorage
      if (address) {
        const authKey = `auth_${address.toLowerCase()}`
        localStorage.setItem(authKey, JSON.stringify({
          user: data.user,
          timestamp: Date.now()
        }))
      }
      
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
      
      // Generate nonce and message from server
      toast({
        title: "Generating secure nonce",
        description: "Creating secure authentication challenge..."
      })
      
      const { message } = await generateNonceAndMessage(address)
      
      // Sign the message with nonce
      toast({
        title: "Please sign the message",
        description: "Sign in your wallet to authenticate securely"
      })
      
      const signature = await signMessageAsync({ message })
      await authenticateMutation.mutateAsync({ address, signature, message })
    } catch (error) {
      console.error('Authentication error:', error)
      toast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Failed to authenticate with secure nonce",
        variant: "destructive"
      })
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleDisconnect = () => {
    // Clear stored authentication
    if (address) {
      const authKey = `auth_${address.toLowerCase()}`
      localStorage.removeItem(authKey)
    }
    
    disconnect()
    setHasAttemptedAuth(false)
    queryClient.removeQueries({ queryKey: [`/api/auth/user/${address}`] })
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