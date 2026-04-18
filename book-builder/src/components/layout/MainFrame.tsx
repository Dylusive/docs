import type { ReactNode } from 'react'
import { GridBackground } from '../ui/GridBackground'
import { NavBar } from './NavBar'
import { AriaPanel } from './AriaPanel'

interface Props {
  children: ReactNode
  ariaContext?: string
}

export function MainFrame({ children, ariaContext }: Props) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: '#080810' }}>
      <GridBackground />
      <NavBar />
      <div className="flex flex-1 overflow-hidden relative z-10">
        <main className="flex-1 overflow-hidden">{children}</main>
        <AriaPanel contextNote={ariaContext} />
      </div>
    </div>
  )
}
