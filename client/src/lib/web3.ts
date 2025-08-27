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

// Generate secure sign message with nonce and timestamp
export const generateSignMessage = (address: string) => {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).substring(2, 15)
  return `Welcome to SmartAudit AI!

Please sign this message to authenticate your wallet and access your personalized audit dashboard.

Wallet: ${address}
Timestamp: ${timestamp}
Nonce: ${nonce}

This request will not trigger any blockchain transaction or cost any gas fees.`
}