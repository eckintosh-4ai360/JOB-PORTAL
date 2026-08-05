import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ClerkProvider } from '@clerk/react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInUrl="/login"
      signUpUrl="/signup"
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </ClerkProvider>
  </StrictMode>,
)
