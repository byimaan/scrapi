import './globals.css'
import React, { ReactNode, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

interface LayoutProps {
  children?: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <main>
      {children ?? (
        <>
          <h1>Welcome to your React SPA</h1>
          <p>This is a single-file layout powered by React.</p>
        </>
      )}
    </main>
  )
}

// mount to #root
const rootEl = document.getElementById('root')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <Layout />
    </React.StrictMode>
  )
}

export default Layout
