import { create } from 'zustand'

/** A three-route app does not need a router library. */
export const useRoute = create<{ path: string }>(() => ({ path: typeof location === 'undefined' ? '/' : location.pathname }))
export function navigate(path: string, replace = false): void {
  if (path === location.pathname) return
  if (replace) history.replaceState(null, '', path)
  else history.pushState(null, '', path)
  useRoute.setState({ path })
}
if (typeof window !== 'undefined') window.addEventListener('popstate', () => useRoute.setState({ path: location.pathname }))
