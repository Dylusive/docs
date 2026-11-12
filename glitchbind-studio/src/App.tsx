import { lazy, Suspense, useEffect } from 'react'
import { useRoute } from './lib/router'
import { loadPrefs } from './store/ui'
import ProjectsScreen from './components/ProjectsScreen'
import { ErrorBoundary } from './components/ErrorBoundary'

const Studio = lazy(() => import('./components/Studio'))
const PaginationTest = lazy(() => import('./components/PaginationTest'))

const Loading = () => <div className="h-full flex flex-col items-center justify-center gap-4"><div className="gb-loader" /><div className="gb-label">Loading</div></div>

export default function App() {
  const path = useRoute((s) => s.path)
  useEffect(() => { void loadPrefs() }, [])
  const book = /^\/book\/([^/]+)/.exec(path)
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        {book ? <Studio key={book[1]} id={book[1]} /> : path.startsWith('/pagination-test') ? <PaginationTest /> : <ProjectsScreen />}
      </Suspense>
    </ErrorBoundary>
  )
}
