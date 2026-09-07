import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '../../index.css'
import { TermsOfUse } from './TermsOfUse'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')

createRoot(container).render(
  <StrictMode>
    <TermsOfUse />
  </StrictMode>,
)
