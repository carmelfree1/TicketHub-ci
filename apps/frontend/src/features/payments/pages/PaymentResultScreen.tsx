import React from 'react';

export type PaymentReturnState = 'checking' | 'pending' | 'failed' | 'review' | 'error';

interface PaymentResultScreenProps {
  state: PaymentReturnState;
  message: string;
  onRetry: () => void;
  onExplore: () => void;
}

export const PaymentResultScreen: React.FC<PaymentResultScreenProps> = ({ state, message, onRetry, onExplore }) => {
  const isFailure = state === 'failed' || state === 'error';
  const title = state === 'checking'
    ? 'Vérification du paiement'
    : state === 'pending'
      ? 'Paiement en attente'
      : state === 'review'
        ? 'Vérification nécessaire'
        : isFailure
          ? 'Paiement non confirmé'
          : 'État du paiement';

  return (
    <div className="min-h-[70vh] px-5 py-12 flex flex-col items-center justify-center text-center gap-4">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isFailure ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-[#dce9ff] text-[#0b1c30]'}`}>
        <span className={`material-symbols-outlined text-[32px] ${state === 'checking' ? 'animate-spin' : ''}`}>
          {state === 'checking' ? 'progress_activity' : state === 'pending' ? 'hourglass_top' : state === 'review' ? 'support_agent' : isFailure ? 'error' : 'payments'}
        </span>
      </div>
      <h1 className="font-headline text-[21px] font-bold text-[#0b1c30]">{title}</h1>
      <p role="status" className="max-w-sm font-body text-[13px] text-[#5a4136] leading-relaxed">{message}</p>
      {(state === 'pending' || state === 'error') && (
        <button type="button" onClick={onRetry} className="px-5 py-3 rounded-xl bg-[#ff6b00] text-white font-headline text-[13px] font-bold cursor-pointer">Vérifier à nouveau</button>
      )}
      <button type="button" onClick={onExplore} className="px-5 py-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] font-headline text-[13px] font-bold cursor-pointer">Retour à l’exploration</button>
      <p className="max-w-sm font-body text-[10px] text-[#5a4136]">Le billet n’est émis qu’après confirmation du paiement par le serveur.</p>
    </div>
  );
};
