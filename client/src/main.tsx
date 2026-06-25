import { createRoot } from 'react-dom/client';
import { SetupGate } from './components/SetupGate';
import './index.css';

// The gate decides whether to show first-run setup or initialize Reveal and render the app.
// (No StrictMode — it would double-invoke effects and create two RevealViews.)
createRoot(document.getElementById('root')!).render(<SetupGate />);
