import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import '@fontsource-variable/space-grotesk/wght.css';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <AppRouter />
  </AppProviders>,
);
