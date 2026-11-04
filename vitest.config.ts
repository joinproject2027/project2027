import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      // Set here rather than per instance: Vitest only skips its browser UI
      // when this top-level flag is set, and that UI overlaps the left edge of
      // the test iframe, swallowing clicks on elements there.
      headless: true,
      // https://vitest.dev/config/browser/playwright
      instances: [
        { browser: 'chromium' },
      ],
    },
  },
})
