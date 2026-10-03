import React, { useEffect, useRef, useState } from 'react';
import { formatXof } from '@tickethub/shared';
import { AppScreen } from '@/types';
import { ticketsApi } from '@/features/tickets/api';

interface PartnerScannerScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onBack: () => void;
}

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

interface ScanTicketResult {
  ticketCode?: string;
  status?: string;
  passengerName?: string;
  passengerPhone?: string;
  productType?: 'transport' | 'event';
  carrier?: string;
  departCity?: string;
  arrivalCity?: string;
  departStation?: string;
  arrivalStation?: string;
  eventTitle?: string;
  venue?: string;
  category?: string;
  seats?: number[];
  price?: number;
  usedAt?: string;
}

interface ScanMessage {
  ok: boolean;
  message: string;
  result?: ScanTicketResult;
}

export const PartnerScannerScreen: React.FC<PartnerScannerScreenProps> = ({ onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('Autorisez l’accès à la caméra pour scanner un billet.');
  const [manualCode, setManualCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanMessage, setScanMessage] = useState<ScanMessage | null>(null);
  const [sessionValidated, setSessionValidated] = useState(0);

  const stopCamera = () => setCameraActive(false);

  const submitScan = async (value: string, isToken: boolean) => {
    if (!value.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setScanMessage(null);
    try {
      const data = await ticketsApi.scan(isToken ? { token: value.trim() } : { ticketCode: value.trim() });
      const result = data as ScanTicketResult;
      setScanMessage({ ok: true, message: 'Billet validé par le serveur. Ce jeton ne pourra plus être réutilisé.', result });
      setSessionValidated((count) => count + 1);
      setManualCode('');
    } catch (error) {
      setScanMessage({ ok: false, message: error instanceof Error ? error.message : 'Le serveur n’a pas pu vérifier ce billet.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!cameraActive) return;
    let active = true;
    let stream: MediaStream | undefined;
    let frame = 0;

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraMessage('La caméra n’est pas disponible dans ce navigateur. Utilisez la saisie du code billet.');
          setCameraActive(false);
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraMessage('Caméra active · placez le QR code dans le cadre.');

        const detectorConstructor = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
        if (!detectorConstructor) {
          setCameraMessage('Le scan automatique n’est pas pris en charge par ce navigateur. Saisissez le code billet ci-dessous.');
          return;
        }
        const detector = new detectorConstructor({ formats: ['qr_code'] });
        const detectFrame = async () => {
          if (!active || !videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            if (active) frame = window.requestAnimationFrame(detectFrame);
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            const rawValue = codes[0]?.rawValue;
            if (rawValue) {
              stopCamera();
              const normalized = rawValue.trim();
              const isTicketCode = /^TKH-[A-Z0-9-]+$/i.test(normalized);
              await submitScan(normalized, !isTicketCode);
              return;
            }
          } catch {
            // A single blurred frame should not interrupt the live camera scan.
          }
          if (active) frame = window.requestAnimationFrame(detectFrame);
        };
        frame = window.requestAnimationFrame(detectFrame);
      } catch (error) {
        if (!active) return;
        setCameraMessage(error instanceof Error && error.name === 'NotAllowedError'
          ? 'Accès caméra refusé. Autorisez la caméra ou saisissez le code billet.'
          : 'Impossible de démarrer la caméra. Saisissez le code billet pour continuer.');
        setCameraActive(false);
      }
    };

    void start();
    return () => {
      active = false;
      if (frame) window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraActive]);

  const result = scanMessage?.result;
  const isEvent = result?.productType === 'event';

  return (
    <div className="flex flex-col w-full pb-24 max-w-md mx-auto">
      <section className="px-4 pt-3 pb-4 bg-[#eff4ff] flex flex-col gap-3 border-b border-[#dce9ff]">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-headline text-[10px] text-[#216b43] uppercase font-bold tracking-wider">Contrôle partenaire</p>
            <h2 className="font-headline text-[19px] text-[#0b1c30] font-bold">Scanner les billets</h2>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white border border-[#dce9ff] text-[#0b1c30] font-headline text-[10px] font-bold">{sessionValidated} validé{sessionValidated === 1 ? '' : 's'} ici</span>
        </div>
        <p className="font-body text-[12px] text-[#5a4136]">Chaque scan est contrôlé côté serveur et le billet est marqué comme utilisé de façon atomique.</p>
      </section>

      <section className="px-4 py-4 flex flex-col gap-3">
        <div className="relative w-full aspect-[4/3] max-h-[330px] rounded-3xl bg-[#0b1c30] overflow-hidden shadow-lg flex items-center justify-center border border-[#0b1c30]">
          {cameraActive ? (
            <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover" aria-label="Aperçu caméra du scanner" />
          ) : (
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          )}
          <div className="relative z-10 w-52 h-52 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 rounded-2xl border-2 border-white/60" />
            <span className="material-symbols-outlined text-white/75 text-[46px]">qr_code_scanner</span>
            <span className="absolute inset-x-1 h-1 bg-[#ff6b00] shadow-[0_0_14px_#ff6b00] animate-scan-laser" />
          </div>
          <div className="absolute bottom-3 inset-x-3 z-20 text-center">
            <p role="status" className="font-body text-[11px] text-white bg-[#0b1c30]/80 px-3 py-1.5 rounded-full inline-block">{cameraMessage}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {!cameraActive ? (
            <button type="button" onClick={() => { setScanMessage(null); setCameraActive(true); }} disabled={isSubmitting} className="flex-1 min-h-[46px] rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff842b] text-white font-headline text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              <span className="material-symbols-outlined">photo_camera</span>Démarrer la caméra
            </button>
          ) : (
            <button type="button" onClick={stopCamera} className="flex-1 min-h-[46px] rounded-xl bg-white border border-[#dce9ff] text-[#0b1c30] font-headline text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer">
              <span className="material-symbols-outlined">videocam_off</span>Arrêter la caméra
            </button>
          )}
        </div>
      </section>

      <section className="px-4 pb-3 flex flex-col gap-2">
        <div className="p-3 bg-white rounded-2xl border border-[#dce9ff] flex flex-col gap-2">
          <label htmlFor="manual-ticket-code" className="font-headline text-[12px] font-bold text-[#0b1c30]">Saisie manuelle du code billet</label>
          <div className="flex gap-2">
            <input id="manual-ticket-code" type="text" value={manualCode} onChange={(event) => setManualCode(event.target.value.toUpperCase())} placeholder="TKH-XXXXXXXX" autoCapitalize="characters" className="min-w-0 flex-1 h-11 px-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] font-headline text-[14px] tracking-wider focus:outline-none focus:ring-2 focus:ring-[#ff6b00] border border-[#dce9ff]" />
            <button type="button" onClick={() => void submitScan(manualCode, false)} disabled={!manualCode.trim() || isSubmitting} className="px-4 h-11 bg-[#0b1c30] text-white font-headline text-[12px] font-bold rounded-xl disabled:opacity-50 cursor-pointer">
              {isSubmitting ? 'Vérification…' : 'Vérifier'}
            </button>
          </div>
        </div>

        {scanMessage && (
          <div role={scanMessage.ok ? 'status' : 'alert'} className={`p-4 rounded-2xl border flex flex-col gap-2 ${scanMessage.ok ? 'bg-[#a5f0be] text-[#00522e] border-[#216b43]/20' : 'bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]/20'}`}>
            <div className="flex items-center gap-2 font-headline text-[14px] font-bold">
              <span className="material-symbols-outlined">{scanMessage.ok ? 'verified' : 'block'}</span>
              {scanMessage.ok ? 'ACCÈS AUTORISÉ' : 'ACCÈS REFUSÉ'}
            </div>
            <p className="font-body text-[12px]">{scanMessage.message}</p>
            {result && (
              <div className="pt-2 border-t border-current/20 flex flex-col gap-1 font-body text-[12px]">
                <span className="font-bold">{result.passengerName || 'Billet vérifié'} · {result.ticketCode}</span>
                {isEvent
                  ? <span>{result.eventTitle} · {result.venue} · {result.category}</span>
                  : <span>{result.departCity} → {result.arrivalCity} · Siège {result.seats?.join(', ') || '—'}</span>}
                <span>{formatXof(Number(result.price || 0))} FCFA · {result.usedAt ? new Date(result.usedAt).toLocaleTimeString('fr-FR') : 'contrôlé maintenant'}</span>
              </div>
            )}
          </div>
        )}

        <button type="button" onClick={onBack} className="w-full min-h-[44px] rounded-xl bg-[#eff4ff] text-[#0b1c30] font-headline text-[12px] font-bold border border-[#dce9ff] cursor-pointer">Retour au tableau partenaire</button>
      </section>
    </div>
  );
};
