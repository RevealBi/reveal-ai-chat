// Where the ASP.NET server lives — the single source of truth for the client.
//
// In development the client (Vite dev server) and the ASP.NET server run as separate processes on
// different ports, so the client talks to the server cross-origin at its real URL. The Reveal SDK
// and the Reveal AI client REQUIRE this absolute URL at init (RevealSdkSettings.setBaseUrl /
// RevealSdkClient.initialize({ hostUrl })) — they can't use a relative path. Cross-origin requests
// are allowed by the server's Development CORS policy (see Program.cs).
//
// In production the client is served from the server's own wwwroot, so it's the page's own origin.
//
// DEV_SERVER_URL must match `applicationUrl` in the server's Properties/launchSettings.json. To
// override without editing this file, set VITE_SERVER_URL (e.g. in client/.env.local).
const DEV_SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:7654';

/** Absolute base URL of the server, always with a single trailing slash. */
export const API_HOST =
  (import.meta.env.DEV ? DEV_SERVER_URL : window.location.origin).replace(/\/+$/, '') + '/';
