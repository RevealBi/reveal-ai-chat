import { createRoot } from 'react-dom/client';
import { SetupGate } from './components/SetupGate';
// Ignite UI theme first (IgrChat renders unstyled without it); app styles override it.
import 'igniteui-webcomponents/themes/light/bootstrap.css';
import './index.css';
import './lib/icons'; // registers the icon set used by IgrIcon / IgrIconButton

// The gate decides whether to show first-run setup or initialize Reveal and render the app.
// (No StrictMode — it would double-invoke effects and create two RevealViews.)
createRoot(document.getElementById('root')!).render(<SetupGate />);
