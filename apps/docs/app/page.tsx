import './globals.css'
import React from 'react'
import { Button } from '@repo/ui/button'

interface ThemeImageProps {
  srcLight: string
  srcDark: string
  alt: string
  width?: number
  height?: number
  className?: string
}

const ThemeImage: React.FC<ThemeImageProps> = ({
  srcLight,
  srcDark,
  alt,
  width,
  height,
  className = '',
}) => (
  <>
    <img
      src={srcLight}
      alt={alt}
      width={width}
      height={height}
      className={`imgLight ${className}`}
    />
    <img
      src={srcDark}
      alt={alt}
      width={width}
      height={height}
      className={`imgDark ${className}`}
    />
  </>
)

export default function Home() {
  return (
    <div className="page">
      <main className="main">
        <ThemeImage
          className="logo"
          srcLight="turborepo-dark.svg"
          srcDark="turborepo-light.svg"
          alt="Turborepo logo"
          width={180}
          height={38}
        />

        <ol>
          <li>
            Get started by editing <code>apps/docs/app/page.tsx</code>
          </li>
          <li>Save and see your changes instantly.</li>
        </ol>

        <div className="ctas">
          <a
            className="primary"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              className="logo"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>

          <a
            className="secondary"
            href="https://turborepo.com/docs?utm_source"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>

        <Button appName="docs" className="secondary">
          Open alert
        </Button>
      </main>

      <footer className="footer">
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>

        <a
          href="https://turborepo.com?utm_source=create-turbo"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to turborepo.com →
        </a>
      </footer>
    </div>
  )
}
