import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// igniteui-webcomponents is installed nested under igniteui-react (its optional `marked@^17` peer
// conflicts with our marked@18), so a bare import of its theme CSS can't resolve from src/. Resolve
// the theme through igniteui-react instead — this keeps working if npm ever hoists the package.
const require = createRequire(import.meta.url);
const IGC_THEME = 'igniteui-webcomponents/themes/light/bootstrap.css';
const igcThemePath = require.resolve(IGC_THEME, {
  paths: [path.dirname(require.resolve('igniteui-react'))],
});

// Dev: the client (this dev server, :5173) and the ASP.NET server run as separate processes. The
// client talks to the server cross-origin at its real URL (see src/lib/serverUrl.ts), allowed by
// the server's Development CORS policy — so the Reveal SDK gets the absolute server URL it needs.
//
// The production build outputs into the server's wwwroot, so the shipped app runs from one process
// at one origin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { [IGC_THEME]: igcThemePath } },
  server: { port: 5173 },
  build: {
    outDir: '../server/aspnet/RevealAIChat.Server/wwwroot',
    emptyOutDir: true,
  },
});
