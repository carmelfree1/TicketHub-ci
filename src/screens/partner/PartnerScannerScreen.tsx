import React, { useState } from 'react';
import { AppScreen } from '../../types';

interface PartnerScannerScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onBack: () => void;
}

export const PartnerScannerScreen: React.FC<PartnerScannerScreenProps> = ({
  onNavigate,
}) => {
  const [torchOn, setTorchOn] = useState(false);
  const [showManualCode, setShowManualCode] = useState(false);
  const [manualCode, setManualCode] = useState('TKH-8492-9901');
  const [scanState, setScanState] = useState<'success' | 'fraud-test' | 'scanning'>('success');
  const [boardedCount, setBoardedCount] = useState(38);
  const totalSeats = 41;

  const handleNextPassenger = () => {
    setScanState('scanning');
    setTimeout(() => {
      setBoardedCount((c) => Math.min(c + 1, totalSeats));
      setScanState('success');
    }, 1200);
  };

  const handleSimulateDuplicateScan = () => {
    setScanState('fraud-test');
  };

  const handleManualValidation = () => {
    if (manualCode.trim().length > 0) {
      setScanState('success');
      setShowManualCode(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-20 max-w-md mx-auto">
      {/* 1. Context & Mission Status Header */}
      <section className="px-4 pt-2 pb-3 bg-[#eff4ff] flex flex-col gap-2 border-b border-[#dce9ff]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex w-2.5 h-2.5 rounded-full bg-[#216b43] animate-ping"></span>
            <span className="font-headline text-[10px] text-[#00522e] uppercase font-bold tracking-wider">
              Session Active
            </span>
          </div>
          <div className="flex items-center gap-1 bg-[#dce9ff] px-2.5 py-0.5 rounded-full">
            <span className="material-symbols-outlined text-[#ff6b00] text-[15px]">verified_user</span>
            <span className="font-body text-[11px] text-[#0b1c30] font-semibold">
              Agent Konan #AG-442
            </span>
          </div>
        </div>

        {/* Active Route & Dock Selector Card */}
        <div className="bg-white p-3 rounded-2xl shadow-xs border border-[#e2bfb0]/30 flex items-center justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#ffdbcc] flex items-center justify-center flex-shrink-0 text-[#a04100]">
              <span className="material-symbols-outlined text-[22px]">directions_bus</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-headline text-[10px] px-1.5 py-0.2 rounded bg-[#eff4ff] text-[#0b1c30] font-bold border border-[#dce9ff]">
                  Gare Adjamé - Quai 3
                </span>
                <span className="font-headline text-[10px] text-[#ff6b00] font-bold">
                  Car VIP #12
                </span>
              </div>
              <div className="font-headline text-[14px] font-bold text-[#0b1c30] truncate mt-0.5">
                08:30 Abidjan <span className="text-[#ff6b00] font-bold">➔</span> Yamoussoukro
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSimulateDuplicateScan}
            title="Tester détection anti-fraude double scan"
            className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#0b1c30] hover:bg-[#dce9ff] flex-shrink-0 border border-[#dce9ff] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
          </button>
        </div>

        {/* Realtime Boarding Gauge */}
        <div className="bg-white p-3 rounded-2xl shadow-xs border border-[#e2bfb0]/30 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[#0b1c30]">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#216b43]">how_to_reg</span>
              <span className="font-headline text-[13px] font-bold">Embarquement en direct</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-[18px] text-[#216b43] font-bold tabular-nums">
                {boardedCount}
              </span>
              <span className="font-body text-[12px] text-[#5a4136]">
                / {totalSeats} Validés
              </span>
              <span className="font-headline text-[10px] px-1.5 py-0.2 rounded-full bg-[#a5f0be] text-[#00522e] font-bold ml-1">
                {Math.round((boardedCount / totalSeats) * 100)}%
              </span>
            </div>
          </div>

          <div className="w-full bg-[#eff4ff] rounded-full h-2.5 p-0.5 overflow-hidden flex border border-[#dce9ff]">
            <div
              className="bg-[#216b43] rounded-full h-full transition-all duration-700 ease-out"
              style={{ width: `${(boardedCount / totalSeats) * 100}%` }}
            ></div>
          </div>

          <div className="flex justify-between items-center text-[#5a4136] font-body text-[11px] pt-0.5">
            <span>{totalSeats - boardedCount} sièges vacants restants</span>
            <span className="text-[#ff6b00] font-bold">Clôture quai dans 00:15:38</span>
          </div>
        </div>
      </section>

      {/* 2. Live Optical Scanner Central Stage */}
      <section className="px-4 py-3 flex flex-col gap-2">
        <div className="relative w-full aspect-[4/3] max-h-[280px] rounded-3xl bg-[#0b1c30] overflow-hidden shadow-lg flex items-center justify-center border border-[#0b1c30]">
          {/* Viewfinder Dots grid */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          ></div>

          {/* Animated Scanning Corner Frame */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Top-Left */}
            <div className="absolute top-0 left-0 w-8 h-8 rounded-tl-xl border-t-4 border-l-4 border-[#ff6b00]"></div>
            {/* Top-Right */}
            <div className="absolute top-0 right-0 w-8 h-8 rounded-tr-xl border-t-4 border-r-4 border-[#ff6b00]"></div>
            {/* Bottom-Left */}
            <div className="absolute bottom-0 left-0 w-8 h-8 rounded-bl-xl border-b-4 border-l-4 border-[#ff6b00]"></div>
            {/* Bottom-Right */}
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-br-xl border-b-4 border-r-4 border-[#ff6b00]"></div>

            {/* Laser Scanning Bar */}
            <div className="absolute inset-x-0 h-1 bg-[#216b43] shadow-[0_0_12px_#216b43] animate-scan-laser pointer-events-none"></div>

            {/* Central Hologram Target Cue */}
            <div className="w-20 h-20 rounded-2xl bg-white/5 backdrop-blur-[2px] flex items-center justify-center">
              <span className="material-symbols-outlined text-white/40 text-[44px] animate-pulse">
                qr_code_scanner
              </span>
            </div>
          </div>

          {/* Top Controls Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0b1c30]/80 backdrop-blur text-white font-headline text-[10px] font-bold border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a8f3c1] animate-pulse"></span>
              <span>Capteur Optique Actif • Auto-focus</span>
            </div>

            <button
              type="button"
              onClick={() => setTorchOn(!torchOn)}
              aria-label="Lampe torche"
              className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur active:scale-90 transition-transform cursor-pointer border ${
                torchOn
                  ? 'bg-[#ff6b00] text-white border-[#ff6b00]'
                  : 'bg-white/20 text-white border-white/20 hover:bg-white/30'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {torchOn ? 'flashlight_off' : 'flashlight_on'}
              </span>
            </button>
          </div>

          <div className="absolute bottom-3 inset-x-3 text-center pointer-events-none">
            <p className="font-body text-[11px] text-white/90 px-3 py-1 rounded-full bg-[#0b1c30]/80 backdrop-blur inline-block border border-white/10">
              Pointez sur le QR Code du billet papier ou smartphone
            </p>
          </div>
        </div>

        {/* Manual Code Fallback Action */}
        <div className="flex items-center justify-between gap-2 bg-[#eff4ff] p-3 rounded-2xl border border-[#dce9ff]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[#ff6b00] text-[20px] flex-shrink-0">
              pin
            </span>
            <div className="min-w-0">
              <p className="font-headline text-[12px] font-bold text-[#0b1c30] leading-tight">
                Écran rayé ou QR endommagé ?
              </p>
              <p className="font-body text-[11px] text-[#5a4136] truncate">
                Saisir le code d'urgence alphanumérique
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowManualCode(!showManualCode)}
            className="px-3 py-1.5 rounded-xl bg-white text-[#0b1c30] font-headline text-[11px] font-bold flex-shrink-0 hover:bg-[#dce9ff] transition-colors border border-[#dce9ff] cursor-pointer shadow-xs"
          >
            {showManualCode ? 'Fermer' : 'Saisir code'}
          </button>
        </div>

        {/* Fallback Input Drawer */}
        {showManualCode && (
          <div className="flex flex-col gap-2 p-3 bg-white rounded-2xl shadow-sm border border-[#e2bfb0]/30 animate-in fade-in duration-200">
            <label
              htmlFor="manual-code-input"
              className="font-headline text-[11px] text-[#0b1c30] font-bold"
            >
              Code Billet TicketHub CI (Format: TKH-XXXX-XXXX)
            </label>
            <div className="flex gap-2">
              <input
                id="manual-code-input"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="ex: TKH-8492-9901"
                className="w-full h-11 px-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] font-headline text-[15px] tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-[#ff6b00] border border-[#dce9ff]"
              />
              <button
                type="button"
                onClick={handleManualValidation}
                className="px-4 h-11 bg-[#ff6b00] text-white font-headline text-[13px] font-bold rounded-xl flex items-center justify-center active:scale-95 cursor-pointer shadow-xs"
              >
                Valider
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Validation Result Card */}
      <section className="px-4 pb-3 flex flex-col gap-2">
        {scanState === 'fraud-test' ? (
          /* Red Alert for Duplicate Scan */
          <div className="bg-[#ffdad6] text-[#93000a] p-4 rounded-3xl shadow-md border border-[#ba1a1a]/30 flex flex-col gap-2 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#ba1a1a] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[28px]">block</span>
              </div>
              <div>
                <span className="font-headline text-[16px] font-bold tracking-tight text-[#93000a] block">
                  ACCÈS REFUSÉ : DOUBLON
                </span>
                <span className="font-body text-[12px] text-[#93000a] opacity-90">
                  Ce billet a déjà été validé à la porte Quai 3 à 08:14:22.
                </span>
              </div>
            </div>

            <div className="p-3 bg-white/80 rounded-2xl text-[12px] font-body text-[#93000a] flex flex-col gap-1 border border-[#ba1a1a]/20">
              <span className="font-headline text-[12px] font-bold">
                Jeton Anti-Rejeu HMAC Détecté :
              </span>
              <span>Code : TKH-8492-9901 • Passager : Awa Kouassi</span>
              <span className="text-[#ba1a1a] font-bold">
                Alerte sécurité transmise au superviseur de gare.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setScanState('success')}
              className="w-full py-2.5 bg-[#ba1a1a] text-white font-headline text-[12px] font-bold rounded-xl mt-1 active:scale-95 cursor-pointer shadow-sm"
            >
              Réinitialiser le scanner
            </button>
          </div>
        ) : (
          /* Success Boarding Validation */
          <div className="relative bg-white rounded-3xl shadow-md border border-[#e2bfb0]/30 overflow-hidden flex flex-col">
            {/* High-Contrast Safety Banner */}
            <div className="bg-[#216b43] p-3.5 flex items-center justify-between text-white shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#a5f0be] text-[#00522e] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[28px] font-bold">
                    check_circle
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-headline text-[17px] font-bold tracking-tight">
                      ACCÈS AUTORISÉ
                    </span>
                    <span className="px-2 py-0.2 rounded-full bg-white/20 font-headline text-[9px] uppercase font-bold text-white">
                      Pass VIP
                    </span>
                  </div>
                  <p className="font-body text-[11px] text-[#a8f3c1]">
                    Billet officiel validé sans anomalie
                  </p>
                </div>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#a5f0be] animate-ping"></div>
            </div>

            {/* Ticket Passenger & Seat Content */}
            <div className="p-4 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-headline text-[10px] text-[#5a4136] uppercase tracking-wider font-bold">
                    Passager Principal
                  </span>
                  <h2 className="font-headline text-[16px] text-[#0b1c30] font-bold truncate">
                    Awa KOUASSI
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-headline text-[10px] px-2 py-0.2 rounded bg-[#ffdbcc] text-[#a04100] font-bold">
                      CI-UTB-8921
                    </span>
                    <span className="font-body text-[11px] text-[#5a4136]">
                      Pièce CNI vérifiée
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="font-headline text-[10px] text-[#5a4136] uppercase font-bold">
                    Place Réservée
                  </span>
                  <div className="flex items-center gap-1 bg-[#ffdbcc] px-2.5 py-1 rounded-xl border border-[#ffb693]">
                    <span className="material-symbols-outlined text-[#ff6b00] text-[18px]">
                      airline_seat_recline_extra
                    </span>
                    <span className="font-headline text-[15px] text-[#a04100] font-bold">
                      Siège 14
                    </span>
                  </div>
                  <span className="font-body text-[10px] text-[#5a4136] mt-0.5">
                    Fenêtre Rangée 4
                  </span>
                </div>
              </div>

              {/* Fare & Baggage */}
              <div className="grid grid-cols-2 gap-2 bg-[#eff4ff] p-2.5 rounded-2xl border border-[#dce9ff]">
                <div>
                  <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase">
                    Tarif Réglé
                  </span>
                  <div className="font-headline text-[14px] text-[#0b1c30] font-bold">
                    5 000 FCFA
                  </div>
                  <span className="font-body text-[10px] text-[#216b43] font-bold">
                    Payé via Wave CI
                  </span>
                </div>
                <div>
                  <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase">
                    Bagages Soute
                  </span>
                  <div className="font-headline text-[14px] text-[#0b1c30] font-bold">
                    1 Valise (18 kg)
                  </div>
                  <span className="font-body text-[10px] text-[#5a4136]">
                    Étiquette #BG-702
                  </span>
                </div>
              </div>

              {/* Cryptographic Footprint */}
              <div className="bg-[#eff4ff] p-2.5 rounded-2xl flex flex-col gap-1 text-[#0b1c30] border border-[#dce9ff]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#216b43]">lock</span>
                    <span className="font-headline text-[11px] font-bold">
                      Preuve d'Intégrité HMAC-SHA256
                    </span>
                  </div>
                  <span className="font-headline text-[9px] px-1.5 py-0.2 rounded-full bg-[#dce9ff] text-[#0b1c30] font-bold">
                    STATUT : USED
                  </span>
                </div>
                <p className="font-body text-[10px] text-[#5a4136] break-all font-mono bg-white p-1.5 rounded-lg border border-[#dce9ff]">
                  9f82c4...e81a0b3 • Transaction commitée sur noeud central Abidjan-01
                </p>
                <div className="flex items-center justify-between text-[#5a4136] font-body text-[10px] pt-0.5">
                  <span>Validation : Aujourd'hui à 08:14:22</span>
                  <span>Contrôleur : AG-442</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleNextPassenger}
            className="w-full h-12 bg-gradient-to-r from-[#ff6b00] to-[#ff842b] text-white rounded-xl font-headline text-[14px] font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
            <span>Scanner le Passager Suivant</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('partner-manifest')}
            className="w-full h-11 bg-white text-[#0b1c30] rounded-xl font-headline text-[13px] font-bold flex items-center justify-center gap-2 border border-[#dce9ff] hover:bg-[#eff4ff] transition-colors cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px] text-[#565e74]">fact_check</span>
            <span>Consulter le Manifeste d'Embarquement (3 restants)</span>
          </button>
        </div>
      </section>

      {/* 4. Anti-Fraud & Replay Protection Reassurance */}
      <section className="px-4 pb-4">
        <div className="bg-[#eff4ff] p-3 rounded-2xl flex items-start gap-2.5 border border-[#dce9ff]">
          <div className="w-8 h-8 rounded-lg bg-[#a5f0be] text-[#00522e] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[18px]">gpp_maybe</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-headline text-[12px] font-bold text-[#0b1c30]">
                Système Anti-Fraude &amp; Rejeu
              </p>
              <span className="font-headline text-[9px] px-1.5 py-0.2 rounded bg-[#a5f0be] text-[#00522e] font-bold">
                Actif
              </span>
            </div>
            <p className="font-body text-[11px] text-[#5a4136] mt-0.5">
              En cas de présentation d'une copie ou capture écran du même pass, le serveur déclenche automatiquement une alerte rouge.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
