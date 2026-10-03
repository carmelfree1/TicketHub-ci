import React, { useEffect, useMemo, useState } from 'react';
import { ManifestPassenger, TripDeparture } from '../../types';
import { api, ApiError, PartnerManifestRecord } from '../../services/api';

export const PartnerManifestScreen: React.FC = () => {
  const [trips, setTrips] = useState<TripDeparture[]>([]);
  const [tripId, setTripId] = useState('');
  const [records, setRecords] = useState<PartnerManifestRecord[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'boarded' | 'pending'>('all');
  const [busyCode, setBusyCode] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    let active = true;
    api.trips()
      .then((result) => {
        if (!active) return;
        setTrips(result);
        setTripId((current) => current || result[0]?.id || '');
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger les départs.');
      })
      .finally(() => { if (active) setLoadingTrips(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!tripId) {
      setRecords([]);
      return;
    }
    let active = true;
    setLoadingManifest(true);
    setError('');
    api.partnerManifest(tripId)
      .then((result) => { if (active) setRecords(result); })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof ApiError && cause.status === 403
          ? 'Cette session ne dispose pas du rôle partenaire.'
          : cause instanceof Error ? cause.message : 'Impossible de charger le manifeste.');
      })
      .finally(() => { if (active) setLoadingManifest(false); });
    return () => { active = false; };
  }, [tripId]);

  const selectedTrip = trips.find((trip) => trip.id === tripId);
  const passengers: ManifestPassenger[] = useMemo(() => records.map((record) => ({
    seatNumber: Number(record.seatNumber || 0),
    name: record.name,
    phone: record.phone,
    ticketCode: record.ticketCode,
    operator: selectedTrip?.carrier || 'Transporteur',
    price: Number(record.price || 0),
    status: record.status === 'used' ? 'boarded' : record.status === 'cancelled' ? 'absent' : 'pending',
    scanTime: record.usedAt ? new Date(record.usedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : undefined,
    scanLocation: record.usedAt ? 'Contrôle partenaire' : undefined,
    luggageCount: 0,
  })), [records, selectedTrip?.carrier]);

  const boardedCount = passengers.filter((passenger) => passenger.status === 'boarded').length;
  const pendingCount = passengers.filter((passenger) => passenger.status === 'pending').length;
  const grossAmount = passengers.reduce((total, passenger) => total + passenger.price, 0);
  const filteredPassengers = passengers.filter((passenger) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || passenger.name.toLowerCase().includes(query) || passenger.phone.includes(query) || passenger.ticketCode.toLowerCase().includes(query) || String(passenger.seatNumber).includes(query);
    const matchesFilter = filter === 'all' || (filter === 'boarded' && passenger.status === 'boarded') || (filter === 'pending' && passenger.status === 'pending');
    return matchesSearch && matchesFilter;
  });

  const handleValidate = async (record: PartnerManifestRecord) => {
    setBusyCode(record.ticketCode);
    setError('');
    try {
      await api.scanTicket({ ticketCode: record.ticketCode });
      setRecords((current) => current.map((item) => item.ticketCode === record.ticketCode
        ? { ...item, status: 'used', usedAt: new Date().toISOString() }
        : item));
      setToastMessage(`Billet ${record.ticketCode} validé par le serveur.`);
      setTimeout(() => setToastMessage(''), 2500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le billet n’a pas pu être validé.');
    } finally {
      setBusyCode('');
    }
  };

  const handleDownloadCsv = () => {
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [
      ['Siège', 'Passager', 'Téléphone', 'Code billet', 'Statut', 'Prix XOF'],
      ...passengers.map((passenger) => [passenger.seatNumber, passenger.name, passenger.phone, passenger.ticketCode, passenger.status, passenger.price]),
    ];
    const csv = rows.map((row) => row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `manifeste-${tripId || 'trajet'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    const route = selectedTrip ? `${selectedTrip.departCity} → ${selectedTrip.arrivalCity}` : 'trajet';
    const text = encodeURIComponent(`Manifeste TicketHub CI · ${route} · ${passengers.length} billet(s), ${boardedCount} contrôlé(s), départ ${selectedTrip?.departTime || ''}.`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col w-full pb-24 max-w-md mx-auto px-4 pt-3 gap-3">
      <section className="bg-white rounded-3xl p-4 shadow-sm border border-[#dce9ff] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-headline text-[18px] font-bold text-[#0b1c30]">Manifeste passagers</h2>
            <p className="font-body text-[11px] text-[#5a4136]">Données des billets payés enregistrées côté serveur</p>
          </div>
          <span className="px-2 py-1 rounded-full bg-[#a5f0be] text-[#00522e] font-headline text-[10px] font-bold">{boardedCount} contrôlé{boardedCount === 1 ? '' : 's'}</span>
        </div>
        <label htmlFor="manifest-trip" className="font-headline text-[11px] font-bold text-[#0b1c30]">Départ à contrôler</label>
        <select id="manifest-trip" value={tripId} onChange={(event) => setTripId(event.target.value)} disabled={loadingTrips || trips.length === 0} className="h-11 w-full px-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] font-body text-[12px] text-[#0b1c30]">
          {trips.length === 0 && <option value="">Aucun départ disponible</option>}
          {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.departTime} · {trip.departCity} → {trip.arrivalCity} · {trip.carrier}</option>)}
        </select>
        {selectedTrip && <p className="font-body text-[11px] text-[#5a4136]">{selectedTrip.departAt ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(selectedTrip.departAt)) : ''} · {selectedTrip.departStation} → {selectedTrip.arrivalStation}</p>}
      </section>

      <section className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-2xl border border-[#dce9ff] text-center"><span className="block font-headline text-[9px] uppercase font-bold text-[#5a4136]">Billets payés</span><strong className="font-headline text-[18px] text-[#0b1c30]">{passengers.length}</strong></div>
        <div className="bg-white p-3 rounded-2xl border border-[#dce9ff] text-center"><span className="block font-headline text-[9px] uppercase font-bold text-[#5a4136]">À contrôler</span><strong className="font-headline text-[18px] text-[#ff6b00]">{pendingCount}</strong></div>
        <div className="bg-white p-3 rounded-2xl border border-[#dce9ff] text-center"><span className="block font-headline text-[9px] uppercase font-bold text-[#5a4136]">Total XOF</span><strong className="font-headline text-[14px] text-[#216b43]">{grossAmount.toLocaleString('fr-FR')}</strong></div>
      </section>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-3 text-[#5a4136] text-[18px]">search</span>
        <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Nom, téléphone, siège ou code billet" className="w-full h-11 pl-9 pr-3 rounded-xl bg-white text-[#0b1c30] placeholder:text-[#5a4136]/70 font-body text-[12px] border border-[#dce9ff] outline-none focus:ring-1 focus:ring-[#ff6b00]" />
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'boarded', 'pending'] as const).map((value) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={`px-3 py-1.5 rounded-full font-headline text-[11px] font-bold ${filter === value ? 'bg-[#ff6b00] text-white' : 'bg-white text-[#0b1c30] border border-[#dce9ff]'}`}>
            {value === 'all' ? 'Tous' : value === 'boarded' ? 'Contrôlés' : 'En attente'}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="p-3 rounded-xl bg-[#ffdad6] text-[#93000a] font-body text-[12px]">{error}</p>}
      {toastMessage && <p role="status" className="p-3 rounded-xl bg-[#a5f0be] text-[#00522e] font-body text-[12px]">{toastMessage}</p>}
      {(loadingTrips || loadingManifest) && <p role="status" className="p-4 rounded-2xl bg-white text-center font-body text-[12px] text-[#5a4136]">Chargement du manifeste…</p>}
      {!loadingTrips && !loadingManifest && !error && passengers.length === 0 && <p className="p-4 rounded-2xl bg-white text-center font-body text-[12px] text-[#5a4136]">Aucun billet payé pour ce départ.</p>}

      <div className="flex flex-col gap-2">
        {filteredPassengers.map((passenger) => {
          const record = records.find((item) => item.ticketCode === passenger.ticketCode)!;
          const boarded = passenger.status === 'boarded';
          return (
            <article key={passenger.ticketCode} className="p-3 rounded-2xl bg-white border border-[#dce9ff] flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-headline text-[13px] font-bold ${boarded ? 'bg-[#a5f0be] text-[#00522e]' : 'bg-[#eff4ff] text-[#0b1c30]'}`}>{passenger.seatNumber || '—'}</div>
              <div className="min-w-0 flex-1">
                <p className="font-headline text-[13px] font-bold text-[#0b1c30] truncate">{passenger.name}</p>
                <p className="font-body text-[10px] text-[#5a4136] truncate">{passenger.phone} · {passenger.ticketCode}</p>
                <p className={`font-headline text-[10px] font-bold ${boarded ? 'text-[#216b43]' : 'text-[#ff6b00]'}`}>{boarded ? `Contrôlé ${passenger.scanTime || ''}` : passenger.status === 'absent' ? 'Annulé' : 'En attente'}</p>
              </div>
              {!boarded && passenger.status !== 'absent' && (
                <button type="button" onClick={() => void handleValidate(record)} disabled={busyCode === record.ticketCode} className="shrink-0 px-2.5 py-2 rounded-xl bg-[#216b43] text-white font-headline text-[10px] font-bold disabled:opacity-50 cursor-pointer">{busyCode === record.ticketCode ? '…' : 'Valider'}</button>
              )}
            </article>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={handleDownloadCsv} disabled={!passengers.length} className="min-h-[44px] rounded-xl bg-[#eff4ff] border border-[#dce9ff] text-[#0b1c30] font-headline text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"><span className="material-symbols-outlined text-[17px]">download</span>Exporter CSV</button>
        <button type="button" onClick={handleShare} disabled={!passengers.length} className="min-h-[44px] rounded-xl bg-[#216b43] text-white font-headline text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"><span className="material-symbols-outlined text-[17px]">share</span>Partager le bilan</button>
      </div>
    </div>
  );
};
