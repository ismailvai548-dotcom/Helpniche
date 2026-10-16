import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // H12 FIX: dist/ is the HAND-WRITTEN shipped app (Capacitor webDir: dist) —
    // it is NOT vite build output. Keep emptyOutDir DISABLED: enabling it would
    // make `vite build` permanently WIPE the real app files under dist/.
    // Releases are deployed with `npm run build` (npx cap copy android), which
    // only copies dist/ into the Android project. Never run `vite build`.
    emptyOutDir: false
  }
})
