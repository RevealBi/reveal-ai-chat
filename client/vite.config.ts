import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev: the client (this dev server, :5173) and the ASP.NET server run as separate processes. The
// client talks to the server cross-origin at its real URL (see src/lib/serverUrl.ts), allowed by
// the server's Development CORS policy — so the Reveal SDK gets the absolute server URL it needs.
//
// The production build outputs into the server's wwwroot, so the shipped app runs from one process
// at one origin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  build: {
    outDir: '../server/aspnet/RevealAIChat.Server/wwwroot',
    emptyOutDir: true,
  },
});
