import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { HoverProvider } from './hooks/HoverContext.tsx'
import { AppProviders } from './components/context/Appcontext.tsx'

createRoot(document.getElementById('root')!).render(
  <>
    <BrowserRouter>
      <HoverProvider>
        <AppProviders>
          <App />
        </AppProviders>
      </HoverProvider>
    </BrowserRouter>

  </>
)
