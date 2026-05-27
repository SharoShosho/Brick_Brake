import { defineConfig } from 'vite'

// @note: some @vitejs plugins are ESM-only and can cause issues when Vite's
// internal tooling attempts to `require` them. To avoid the ESM/require issue,
// dynamically import the plugin in an async config function so the ESM module
// is loaded with a native import instead of require.
export default defineConfig(async () => {
  const react = (await import('@vitejs/plugin-react')).default
  return {
    plugins: [react()],
    server: { port: 5173 }
  }
})

