import { createContext, useContext } from 'react'

export const MindMapContext = createContext(null)

export function useMindMapActions() {
  const ctx = useContext(MindMapContext)
  if (!ctx) {
    throw new Error('useMindMapActions must be used inside MindMapContext provider')
  }
  return ctx
}
