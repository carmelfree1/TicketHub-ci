import { useRegisterSW } from 'virtual:pwa-register/react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Connection and update notices. A new version is applied only when the person agrees, so a reload can never
 * interrupt a payment in progress.
 */
export function AppStatusBanners() {
  const online = useOnlineStatus();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <>
      {!online && (
        <div role="status" className="flex items-center gap-2 px-4 py-2 bg-[#0b1c30] text-white font-body text-[12px]">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">cloud_off</span>
          <span>Vous êtes hors ligne. Vos billets déjà chargés restent consultables ; les achats nécessitent une connexion.</span>
        </div>
      )}
      {needRefresh && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#ffdbcc] text-[#0b1c30] font-body text-[12px]">
          <span>Une nouvelle version de TicketHub est disponible.</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="min-h-[36px] px-3 rounded-lg bg-[#0b1c30] text-white font-headline text-[12px] font-bold cursor-pointer"
            >
              Mettre à jour
            </button>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="min-h-[36px] px-3 rounded-lg bg-white border border-[#dce9ff] font-headline text-[12px] font-bold cursor-pointer"
            >
              Plus tard
            </button>
          </span>
        </div>
      )}
    </>
  );
}
