// vite.config.js (or vite.config.ts)
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react'
// If using a framework like React, import its plugin too
// import react from '@vitejs/plugin-react'; 

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(), // Add your framework plugin here if needed
  ],
});
