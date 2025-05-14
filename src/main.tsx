
// Import A-Frame first to ensure it's initialized before anything that needs it
import 'aframe';
// Import any A-Frame extensions next
import 'aframe-extras';

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
