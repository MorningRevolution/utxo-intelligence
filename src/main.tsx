
// Import A-Frame first and ensure it's globally available
import * as AFRAME from 'aframe';
// Make AFRAME globally available for components that expect it
window.AFRAME = AFRAME;
// Import any A-Frame extensions next
import 'aframe-extras';

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
