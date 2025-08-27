import { createConfig, http } from 'wagmi'
import { mainnet, polygon, arbitrum, base } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, base],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
  },
})

// Get nonce from server for secure authentication
export const generateNonceAndMessage = async (address: string) => {
  const response = await fetch('/api/auth/generate-nonce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: address })
  })
  
  if (!response.ok) {
    throw new Error('Failed to generate nonce')
  }
  
  const { nonce, message, expiresAt } = await response.json()
  return { nonce, message, expiresAt }
}