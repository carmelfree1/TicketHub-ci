import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router';
import { AppShell } from './AppShell';
import { ErrorPage } from '@/pages/ErrorPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { StatusPanel } from '@/components/feedback/StatusPanel';

// Route modules export `Component` and are code-split, so a traveler never downloads the partner area.
const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <ErrorPage />,
    hydrateFallbackElement: <StatusPanel tone="loading" title="Chargement" />,
    children: [
      { index: true, lazy: () => import('@/routes/ExplorerRoute') },
      { path: 'trajets/:tripId', lazy: () => import('@/routes/TripRoute') },
      { path: 'evenements/:eventId', lazy: () => import('@/routes/EventRoute') },
      { path: 'paiement', lazy: () => import('@/routes/PaymentRoute') },
      { path: 'paiement/retour', lazy: () => import('@/routes/PaymentReturnRoute') },
      { path: 'billets', lazy: () => import('@/routes/WalletRoute') },
      { path: 'billets/:ticketCode', lazy: () => import('@/routes/TicketRoute') },
      {
        path: 'partenaire',
        lazy: async () => ({ Component: (await import('@/routes/PartnerRoutes')).PartnerGuard }),
        children: [
          { index: true, lazy: async () => ({ Component: (await import('@/routes/PartnerRoutes')).Dashboard }) },
          // The former fleet screen only displayed placeholder data and was removed.
          { path: 'flotte', element: <Navigate to="/partenaire/manifeste" replace /> },
          { path: 'scanner', lazy: async () => ({ Component: (await import('@/routes/PartnerRoutes')).Scanner }) },
          { path: 'manifeste', lazy: async () => ({ Component: (await import('@/routes/PartnerRoutes')).Manifest }) },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
