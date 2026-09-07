import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '../../index.css'
import { CookiesPolicy } from './CookiesPolicy'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')

createRoot(container).render(
  <StrictMode>
    <CookiesPolicy />
  </StrictMode>,
)
