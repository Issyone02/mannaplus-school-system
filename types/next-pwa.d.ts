// Ambient declaration: next-pwa ships no TypeScript types.
// This tells TS the module exists and its default export is a config HOC.
declare module 'next-pwa' {
  import type { NextConfig } from 'next'

  interface PWAOptions {
    dest?: string
    register?: boolean
    skipWaiting?: boolean
    disable?: boolean
    swSrc?: string
    buildExcludes?: (string | RegExp)[]
    [key: string]: any
  }

  function withPWA(options?: PWAOptions): (nextConfig?: NextConfig) => NextConfig
  export default withPWA
}