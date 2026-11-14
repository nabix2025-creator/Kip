import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import '@/styles/animations.css'

async function boot(): Promise<void> {
  const { restoreFromElectronStore } = await import('@/lib/persist')
  await restoreFromElectronStore()
  const { default: App } = await import('@/App')
  const { ErrorBoundary } = await import('@/components/ErrorBoundary')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}

void boot()
