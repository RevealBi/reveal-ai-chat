import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The production build outputs straight into the ASP.NET host's wwwroot, so the
// whole demo runs from one process: `dotnet run` serves API + client at one URL.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  build: {
    outDir: '../server/aspnet/RevealAIChat.Server/wwwroot',
    emptyOutDir: true,
  },
});
