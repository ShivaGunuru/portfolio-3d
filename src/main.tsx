import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import './index.css'
import { startPreloader } from './preloader/run'

// Before render, so the assets the overlay waits on start downloading now
// rather than whenever their components happen to mount.
startPreloader()

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
