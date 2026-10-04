import { useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { authApi } from '@/features/auth/api';
import type { SecurityStatus } from '@/services/api';

interface MfaSettingsProps {
  security: SecurityStatus | null;
  onChange: (security: SecurityStatus) => void;
}

type Step = 'idle' | 'enrolling' | 'done' | 'disabling';

const inputClass =
  'h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b00]';
const primaryButton =
  'min-h-[44px] px-4 rounded-xl bg-[#ff6b00] text-white font-headline text-[13px] font-bold cursor-pointer disabled:opacity-60';
const secondaryButton =
  'min-h-[44px] px-4 rounded-xl bg-white border border-[#dce9ff] text-[#0b1c30] font-headline text-[13px] font-bold cursor-pointer disabled:opacity-60';

export function MfaSettings({ security, onChange }: MfaSettingsProps) {
  const [step, setStep] = useState<Step>('idle');
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!security) return null;

  const run = async (action: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Opération impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const startEnrollment = () =>
    run(async () => {
      setSetup(await authApi.mfaSetup());
      setCode('');
      setStep('enrolling');
    });

  const confirmEnrollment = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await authApi.mfaEnable(code.trim());
      setBackupCodes(result.backupCodes);
      setSetup(null);
      setCode('');
      setStep('done');
      onChange({ ...security, mfaEnabled: true });
    });
  };

  const confirmDisable = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await authApi.mfaDisable({ password, code: code.trim() });
      setPassword('');
      setCode('');
      setStep('idle');
      onChange({ ...security, mfaEnabled: false });
    });
  };

  return (
    <section aria-labelledby="mfa-title" className="flex flex-col gap-3 p-3 rounded-2xl border border-[#dce9ff]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="mfa-title" className="font-headline text-[13px] font-bold text-[#0b1c30]">Double authentification</h3>
          <p className="font-body text-[11px] text-[#5a4136]">
            {security.mfaEnabled
              ? 'Active. Un code de votre application d’authentification est demandé à chaque connexion.'
              : security.mfaRequired
                ? 'Obligatoire pour votre type de compte. Activez-la pour accéder au scanner et aux manifestes.'
                : 'Ajoute un code à usage unique à votre mot de passe.'}
          </p>
        </div>
        <span
          className={`shrink-0 px-2 py-1 rounded-md font-headline text-[10px] font-bold uppercase ${
            security.mfaEnabled ? 'bg-[#a5f0be] text-[#00522e]' : 'bg-[#ffdbcc] text-[#a04100]'
          }`}
        >
          {security.mfaEnabled ? 'Active' : 'Inactive'}
        </span>
      </div>

      {step === 'idle' && !security.mfaEnabled && (
        <button type="button" onClick={startEnrollment} disabled={busy} className={primaryButton}>
          {busy ? 'Veuillez patienter…' : 'Activer la double authentification'}
        </button>
      )}

      {step === 'idle' && security.mfaEnabled && !security.mfaRequired && (
        <button type="button" onClick={() => { setStep('disabling'); setError(''); }} className={secondaryButton}>
          Désactiver
        </button>
      )}

      {step === 'enrolling' && setup && (
        <form onSubmit={confirmEnrollment} className="flex flex-col gap-3">
          <ol className="list-decimal pl-4 font-body text-[12px] text-[#0b1c30] flex flex-col gap-1">
            <li>Ouvrez votre application d’authentification et ajoutez un compte.</li>
            <li>Scannez ce QR code, ou saisissez la clé manuellement.</li>
            <li>Entrez le code à 6 chiffres affiché pour confirmer.</li>
          </ol>
          <div className="self-center p-3 bg-white border border-[#dce9ff] rounded-xl">
            <QRCodeSVG value={setup.otpauthUri} size={160} title="QR code de configuration de la double authentification" />
          </div>
          <p className="font-body text-[11px] text-[#5a4136] break-all">
            Clé de configuration : <span className="font-mono text-[#0b1c30] select-all">{setup.secret}</span>
          </p>
          <label className="flex flex-col gap-1 font-headline text-[11px] font-bold text-[#0b1c30]">
            Code à 6 chiffres
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setStep('idle'); setSetup(null); }} className={secondaryButton}>Annuler</button>
            <button type="submit" disabled={busy || code.length !== 6} className={primaryButton}>Confirmer</button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <div className="flex flex-col gap-2">
          <p className="font-body text-[12px] text-[#0b1c30]">
            Conservez ces codes de secours dans un endroit sûr. Chacun ne peut être utilisé qu’une fois et ils ne seront plus affichés.
          </p>
          <ul className="grid grid-cols-2 gap-1 font-mono text-[13px] text-[#0b1c30] p-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
            {backupCodes.map((backupCode) => (
              <li key={backupCode} className="select-all">{backupCode}</li>
            ))}
          </ul>
          <button type="button" onClick={() => { setBackupCodes([]); setStep('idle'); }} className={primaryButton}>
            J’ai conservé mes codes
          </button>
        </div>
      )}

      {step === 'disabling' && (
        <form onSubmit={confirmDisable} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 font-headline text-[11px] font-bold text-[#0b1c30]">
            Mot de passe
            <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 font-headline text-[11px] font-bold text-[#0b1c30]">
            Code à 6 chiffres ou code de secours
            <input required autoComplete="one-time-code" maxLength={16} value={code} onChange={(event) => setCode(event.target.value)} className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setStep('idle'); setError(''); }} className={secondaryButton}>Annuler</button>
            <button type="submit" disabled={busy} className={primaryButton}>Désactiver</button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="p-2.5 rounded-xl bg-[#ffdad6] text-[#93000a] font-body text-[12px]">{error}</p>}
    </section>
  );
}
