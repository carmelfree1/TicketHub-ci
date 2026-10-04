import React, { useEffect, useState } from 'react';
import { formatXof } from '@tickethub/shared';
import { type TripDeparture, type TicketedEvent } from '@/types';
import { catalogApi } from '@/features/catalog/api';

interface ExplorerScreenProps {
  onSelectTrip: (trip: TripDeparture) => void;
  onSelectEvent: (event: TicketedEvent) => void;
}

export const ExplorerScreen: React.FC<ExplorerScreenProps> = ({
  onSelectTrip,
  onSelectEvent,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'transport' | 'concerts' | 'football' | 'spectacles'>('transport');
  const [departCity, setDepartCity] = useState('Abidjan');
  const [destCity, setDestCity] = useState('Yamoussoukro');
  const [passengers] = useState('1 Adulte');
  const [trips, setTrips] = useState<TripDeparture[]>([]);
  const [events, setEvents] = useState<TicketedEvent[]>([]);
  const [visibleTrips, setVisibleTrips] = useState<TripDeparture[]>([]);
  const [catalogMessage, setCatalogMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [departureDate, setDepartureDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  });
  const [isSwapping, setIsSwapping] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([catalogApi.trips(), catalogApi.events()])
      .then(([nextTrips, nextEvents]) => {
        if (!active) return;
        setTrips(nextTrips);
        setVisibleTrips(nextTrips.slice(0, 3));
        setEvents(nextEvents);
        setCatalogMessage('');
      })
      .catch(() => {
        if (active) setCatalogMessage('Mode démonstration : le catalogue API est indisponible.');
      });
    return () => { active = false; };
  }, []);

  const handleSearch = async () => {
    setIsLoading(true);
    setCatalogMessage('');
    try {
      const result = await catalogApi.trips({ from: departCity.trim(), to: destCity.trim(), date: departureDate });
      setVisibleTrips(result);
      if (result.length === 0) setCatalogMessage('Aucun départ trouvé pour ces critères. Essayez une autre date ou destination.');
    } catch {
      const local = trips.filter((trip) =>
        trip.departCity.toLowerCase().includes(departCity.split('(')[0].trim().toLowerCase()) &&
        trip.arrivalCity.toLowerCase().includes(destCity.trim().toLowerCase())
      );
      setVisibleTrips(local.length ? local : trips.slice(0, 3));
      setCatalogMessage('Mode démonstration : les filtres sont appliqués aux données locales.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapCities = () => {
    setIsSwapping(true);
    const temp = departCity;
    setDepartCity(destCity);
    setDestCity(temp);
    setTimeout(() => setIsSwapping(false), 300);
  };

  const handleSelectSuggestion = (city: string) => {
    setDestCity(city);
  };

  const eventTypeFilter = selectedCategory === 'concerts'
    ? 'concert'
    : selectedCategory === 'football'
      ? 'sport'
      : selectedCategory === 'spectacles'
        ? 'show'
        : null;
  const filteredEvents = events.filter((event) => !eventTypeFilter || event.eventType === eventTypeFilter);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col pb-24">
      {/* 1. Dynamic Hero & Value Proposition */}
      <section className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#ff6b00] via-[#a04100] to-[#572000] text-white p-4 sm:p-6 lg:p-8 shadow-md">
          {/* Ambient decorative lighting */}
          <div className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
          <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-[#a8f3c1]/20 blur-lg pointer-events-none"></div>

          <div className="relative z-10 flex max-w-3xl flex-col gap-2">
            <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a8f3c1] animate-ping"></span>
              <span className="font-headline text-[10px] uppercase tracking-wider text-white font-bold">
                Pass 100% Officiel CI
              </span>
            </div>

            <h1 className="font-headline text-[24px] sm:text-[34px] lg:text-[42px] font-bold tracking-tight text-white leading-tight">
              Tous vos billets en Côte d'Ivoire au même endroit.
            </h1>

            <p className="font-body text-[13px] sm:text-[15px] text-[#ffdbcc] opacity-95 leading-snug">
              Un seul compte sécurisé, zéro tracas. Comparez les départs, réservez vos places de bus et vos soirées en toute confiance.
            </p>
          </div>

          {/* Quick Trust Counters */}
          <div className="relative z-10 grid grid-cols-3 gap-2 sm:max-w-xl pt-3 mt-4 border-t border-white/15 text-center">
            <div>
              <span className="block font-headline text-[20px] font-bold text-white leading-none">
                28+
              </span>
              <span className="font-body text-[11px] text-[#ffdbcc]/90">
                Compagnies
              </span>
            </div>
            <div>
              <span className="block font-headline text-[20px] font-bold text-white leading-none">
                0 FCFA
              </span>
              <span className="font-body text-[11px] text-[#ffdbcc]/90">
                Frais cachés
              </span>
            </div>
            <div>
              <span className="block font-headline text-[20px] font-bold text-white leading-none">
                &lt; 30s
              </span>
              <span className="font-body text-[11px] text-[#ffdbcc]/90">
                Paiement Mobile
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Filter Pill Selector */}
      <section className="px-4 sm:px-6 lg:px-8 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('transport')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full font-body text-[13px] font-semibold transition-all cursor-pointer ${
              selectedCategory === 'transport'
                ? 'bg-[#ff6b00] text-white shadow-sm'
                : 'bg-[#eff4ff] text-[#5a4136] hover:bg-[#dce9ff]'
            }`}
          >
            <span className="text-[15px] leading-none">🚌</span>
            <span>Transport Interurbain</span>
          </button>

          <button
            onClick={() => setSelectedCategory('concerts')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full font-body text-[13px] font-semibold transition-all cursor-pointer ${
              selectedCategory === 'concerts'
                ? 'bg-[#ff6b00] text-white shadow-sm'
                : 'bg-[#eff4ff] text-[#5a4136] hover:bg-[#dce9ff]'
            }`}
          >
            <span className="text-[15px] leading-none">🎵</span>
            <span>Concerts &amp; Festivals</span>
          </button>

          <button
            onClick={() => setSelectedCategory('football')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full font-body text-[13px] font-semibold transition-all cursor-pointer ${
              selectedCategory === 'football'
                ? 'bg-[#ff6b00] text-white shadow-sm'
                : 'bg-[#eff4ff] text-[#5a4136] hover:bg-[#dce9ff]'
            }`}
          >
            <span className="text-[15px] leading-none">⚽</span>
            <span>Ligue 1 LONACI</span>
          </button>

          <button
            onClick={() => setSelectedCategory('spectacles')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full font-body text-[13px] font-semibold transition-all cursor-pointer ${
              selectedCategory === 'spectacles'
                ? 'bg-[#ff6b00] text-white shadow-sm'
                : 'bg-[#eff4ff] text-[#5a4136] hover:bg-[#dce9ff]'
            }`}
          >
            <span className="text-[15px] leading-none">🎭</span>
            <span>Spectacles &amp; Humour</span>
          </button>
        </div>
      </section>

      {selectedCategory === 'transport' && (
        <>
      {/* 3. Search Engine Card */}
      <section className="px-4 sm:px-6 lg:px-8 pb-3">
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-[#e2bfb0]/30 flex flex-col gap-3 lg:grid lg:grid-cols-[1.4fr_0.8fr_auto] lg:items-end">
          {/* Departure & Destination Cluster with Swap Button */}
          <div className="relative flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
            {/* Departure Field */}
            <div className="relative flex items-center bg-[#eff4ff] rounded-xl p-2.5 transition-colors focus-within:bg-[#dce9ff]/60 border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[#ff6b00] text-[20px] mr-2 flex-shrink-0">
                my_location
              </span>
              <div className="flex-1 min-w-0">
                <label className="block font-headline text-[10px] text-[#5a4136] uppercase font-bold tracking-wider leading-none mb-0.5">
                  Ville de départ
                </label>
                <input
                  type="text"
                  value={departCity}
                  onChange={(e) => setDepartCity(e.target.value)}
                  className="w-full bg-transparent font-body text-[15px] font-semibold text-[#0b1c30] focus:outline-none truncate"
                />
              </div>
              <span className="font-headline text-[11px] px-1.5 py-0.5 rounded bg-[#dce9ff] text-[#0b1c30] font-bold">
                ABJ
              </span>
            </div>

            {/* Quick Switcher Button */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 lg:left-1/2 lg:right-auto lg:-translate-x-1/2">
              <button
                type="button"
                onClick={handleSwapCities}
                aria-label="Inverser les villes"
                className={`w-9 h-9 rounded-full bg-[#ff6b00] text-white shadow-md flex items-center justify-center active:scale-90 transition-transform duration-300 hover:scale-105 cursor-pointer ring-2 ring-white ${
                  isSwapping ? 'rotate-180' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">swap_vert</span>
              </button>
            </div>

            {/* Destination Field */}
            <div className="relative flex items-center bg-[#eff4ff] rounded-xl p-2.5 transition-colors focus-within:bg-[#dce9ff]/60 border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[#216b43] text-[20px] mr-2 flex-shrink-0">
                location_on
              </span>
              <div className="flex-1 min-w-0">
                <label className="block font-headline text-[10px] text-[#5a4136] uppercase font-bold tracking-wider leading-none mb-0.5">
                  Destination
                </label>
                <input
                  type="text"
                  value={destCity}
                  onChange={(e) => setDestCity(e.target.value)}
                  className="w-full bg-transparent font-body text-[15px] font-semibold text-[#0b1c30] focus:outline-none truncate"
                />
              </div>
              <span className="font-headline text-[11px] px-1.5 py-0.5 rounded bg-[#dce9ff] text-[#0b1c30] font-bold">
                {destCity.toUpperCase().slice(0, 5)}
              </span>
            </div>
          </div>

          {/* Quick Destination Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 lg:col-span-3">
            <span className="font-headline text-[11px] text-[#5a4136] font-semibold flex-shrink-0">
              Suggestions :
            </span>
            {['Yamoussoukro', 'Bouaké', 'San Pédro', 'Korhogo'].map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => handleSelectSuggestion(city)}
                className={`font-body text-[12px] px-2.5 py-1 rounded-full transition-all cursor-pointer font-medium ${
                  destCity.toLowerCase().includes(city.toLowerCase())
                    ? 'bg-[#ff6b00] text-white font-bold shadow-xs'
                    : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Date & Passengers Dual Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-[#eff4ff] rounded-xl p-2.5 flex items-center gap-2 border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[#ff6b00] text-[20px] flex-shrink-0">
                calendar_month
              </span>
              <div className="min-w-0">
                <span className="block font-headline text-[10px] uppercase font-bold tracking-wider text-[#5a4136] leading-none mb-0.5">
                  Date de départ
                </span>
                <input
                  aria-label="Date de départ"
                  type="date"
                  value={departureDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setDepartureDate(event.target.value)}
                  className="block max-w-full bg-transparent font-body text-[13px] font-semibold text-[#0b1c30] focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-[#eff4ff] rounded-xl p-2.5 flex items-center gap-2 border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[#ff6b00] text-[20px] flex-shrink-0">
                group
              </span>
              <div className="min-w-0">
                <span className="block font-headline text-[10px] uppercase font-bold tracking-wider text-[#5a4136] leading-none mb-0.5">
                  Voyageurs
                </span>
                <span className="block font-body text-[13px] font-semibold text-[#0b1c30] truncate">
                  {passengers}
                </span>
              </div>
            </div>
          </div>

          {/* Main Action CTA Button */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading}
            className="w-full mt-1 min-h-[48px] px-4 py-3 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff842b] text-white font-headline text-[15px] font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">{isLoading ? 'sync' : 'search'}</span>
            <span>{isLoading ? 'Recherche…' : `Comparer les départs (${visibleTrips.length} affichés)`}</span>
          </button>
        </div>
      </section>

      {/* 4. Aggregator Reassurance Banner */}
      <section className="px-4 sm:px-6 lg:px-8 pb-3">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#a5f0be]/30 border border-[#a5f0be] text-[#00522e]">
          <span className="material-symbols-outlined text-[20px] text-[#216b43] flex-shrink-0">
            verified_user
          </span>
          <p className="font-body text-[12px] leading-snug">
            <strong className="font-bold">Agrégateur agréé CI</strong> • Réservation certifiée en direct avec les transporteurs officiels &amp; billets horodatés instantanés.
          </p>
        </div>
      </section>

      {/* 5. Live Comparison Results Section */}
      <section className="px-4 sm:px-6 lg:px-8 pb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="flex items-center justify-between md:col-span-2 xl:col-span-3">
          <div className="flex items-center gap-1.5">
            <h2 className="font-headline text-[18px] font-bold text-[#0b1c30]">
              Départs vérifiés
            </h2>
            <span className="w-2 h-2 rounded-full bg-[#216b43] animate-pulse"></span>
          </div>
          <button
            type="button"
            className="font-body text-[13px] text-[#ff6b00] flex items-center gap-0.5 font-bold cursor-pointer"
          >
            <span>Filtres</span>
            <span className="material-symbols-outlined text-[16px]">tune</span>
          </button>
        </div>

        {catalogMessage && <p role="status" className="p-2.5 rounded-xl bg-[#eff4ff] text-[#5a4136] font-body text-[11px] md:col-span-2 xl:col-span-3">{catalogMessage}</p>}
        {visibleTrips.length === 0 && <p className="p-4 rounded-2xl bg-white border border-[#dce9ff] text-center font-body text-[12px] text-[#5a4136]">Aucun départ trouvé.</p>}
        {visibleTrips.map((trip, idx) => {
          const isFirst = idx === 0;
          return (
            <div
              key={trip.id}
              className={`relative bg-white rounded-2xl p-4 shadow-sm border transition-all duration-200 flex flex-col gap-3 ${
                isFirst ? 'border-[#ff6b00]/40 ring-1 ring-[#ff6b00]/20' : 'border-[#e2bfb0]/30'
              }`}
            >
              {/* Carrier Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-headline text-[14px] font-bold shadow-xs ${
                      trip.carrierCode === 'UTB'
                        ? 'bg-[#ffdbcc] text-[#a04100]'
                        : trip.carrierCode === 'SBTA'
                        ? 'bg-[#a5f0be] text-[#00522e]'
                        : 'bg-[#dce9ff] text-[#0b1c30]'
                    }`}
                  >
                    {trip.carrierCode}
                  </div>
                  <div>
                    <h3 className="font-headline text-[16px] font-bold text-[#0b1c30] leading-tight">
                      {trip.carrier}
                    </h3>
                    <span className="font-body text-[12px] text-[#5a4136]">
                      {trip.serviceTitle}
                    </span>
                  </div>
                </div>

                {trip.tag && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-headline text-[10px] font-bold flex items-center gap-1 ${
                      trip.tagType === 'best-price'
                        ? 'bg-[#a5f0be] text-[#00522e]'
                        : trip.tagType === 'guaranteed'
                        ? 'bg-[#dce9ff] text-[#0b1c30]'
                        : 'bg-[#eff4ff] text-[#5a4136]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {trip.tagType === 'best-price' ? 'price_check' : 'verified'}
                    </span>
                    {trip.tag}
                  </span>
                )}
              </div>

              {/* Schedule Timeline */}
              <div className="flex items-center justify-between bg-[#eff4ff] rounded-xl p-3 border border-[#dce9ff]">
                <div className="text-left">
                  <span className="font-headline text-[18px] font-bold text-[#0b1c30] leading-none block">
                    {trip.departTime}
                  </span>
                  <span className="font-body text-[12px] text-[#5a4136] mt-0.5 block">
                    {trip.departStation}
                  </span>
                </div>

                <div className="flex flex-col items-center flex-1 px-3">
                  <span className="font-body text-[11px] text-[#5a4136] font-medium">
                    {trip.duration}
                  </span>
                  <div className="w-full flex items-center gap-1 my-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00]"></span>
                    <span className="flex-1 h-[2px] bg-[#e2bfb0]/70"></span>
                    <span className="material-symbols-outlined text-[15px] text-[#ff6b00]">
                      directions_bus
                    </span>
                    <span className="flex-1 h-[2px] bg-[#e2bfb0]/70"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#216b43]"></span>
                  </div>
                  <span className="font-body text-[11px] text-[#216b43] font-bold">
                    Direct
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-headline text-[18px] font-bold text-[#0b1c30] leading-none block">
                    {trip.arrivalTime}
                  </span>
                  <span className="font-body text-[12px] text-[#5a4136] mt-0.5 block">
                    {trip.arrivalStation}
                  </span>
                </div>
              </div>

              {/* Amenities & Seat Availability */}
              <div className="flex items-center justify-between text-[#5a4136] font-body text-[12px]">
                <div className="flex items-center gap-2.5">
                  {trip.amenities.map((item) => (
                    <span key={item} className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[15px] text-[#216b43]">
                        {item.includes('Clim') ? 'ac_unit' : item.includes('Wifi') ? 'wifi' : 'power'}
                      </span>
                      <span>{item}</span>
                    </span>
                  ))}
                </div>

                <span
                  className={`font-headline text-[11px] font-bold ${
                    trip.availableSeats <= 4 ? 'text-[#ba1a1a]' : 'text-[#ff6b00]'
                  }`}
                >
                  {trip.availableSeats <= 4 ? `Dernières ${trip.availableSeats} places !` : `${trip.availableSeats} places restantes`}
                </span>
              </div>

              {/* Action Row & Price */}
              <div className="pt-2 flex items-center justify-between border-t border-[#eff4ff]">
                <div>
                  <span className="font-headline text-[20px] font-bold text-[#ff6b00] leading-none">
                    {formatXof(trip.price)}
                  </span>
                  <span className="font-headline text-[12px] text-[#0b1c30] font-semibold ml-1">
                    FCFA
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTrip(trip)}
                  className={`min-h-[44px] px-4 rounded-xl font-headline text-[13px] font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isFirst
                      ? 'bg-[#ff6b00] text-white hover:bg-[#a04100]'
                      : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]'
                  }`}
                >
                  <span>{isFirst ? 'Sélectionner les sièges' : 'Sélectionner'}</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {isFirst ? 'arrow_forward' : 'chevron_right'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </section>

        </>
      )}

      {/* 6. Real event catalogue — event purchases follow their own ticket categories */}
      <section className="px-4 sm:px-6 lg:px-8 pb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="flex items-center justify-between md:col-span-2 xl:col-span-3">
          <div>
            <h2 className="font-headline text-[18px] font-bold text-[#0b1c30]">
              {selectedCategory === 'transport' ? 'À la une ce week-end' : 'Billets événementiels'}
            </h2>
            <p className="font-body text-[12px] text-[#5a4136]">
              Concerts, sport et spectacles — billets et catégories dédiés
            </p>
          </div>
          <span className="font-headline text-[11px] text-[#ff6b00] font-bold">{filteredEvents.length} événements</span>
        </div>

        {filteredEvents.length === 0 && (
          <div className="p-4 rounded-2xl bg-white border border-[#dce9ff] text-center font-body text-[12px] text-[#5a4136]">
            Aucun événement dans cette catégorie pour le moment.
          </div>
        )}

        {filteredEvents.map((event) => {
          const lowestPrice = Math.min(...event.categories.map((category) => category.price));
          const startsAt = new Date(event.startsAt);
          const label = event.eventType === 'sport' ? 'Football' : event.eventType === 'show' ? 'Spectacle' : 'Concert';
          return (
            <article key={event.id} className="group relative overflow-hidden rounded-2xl bg-white shadow-sm border border-[#e2bfb0]/30 flex flex-col">
              <div className="relative h-44 w-full overflow-hidden">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c30]/90 via-[#0b1c30]/30 to-transparent"></div>
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#ff6b00] text-white font-headline text-[11px] font-bold shadow-sm">{label}</div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#a8f3c1] block">
                    {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(startsAt)}
                  </span>
                  <h3 className="font-headline text-[17px] font-bold text-white leading-tight drop-shadow-sm">{event.title}</h3>
                  <span className="font-body text-[12px] text-white/90 flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[14px]">pin_drop</span>{event.venue}
                  </span>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between gap-2 bg-white">
                <div>
                  <span className="block font-body text-[11px] text-[#5a4136]">Billets à partir de</span>
                  <span className="font-headline text-[17px] font-bold text-[#ff6b00]">{Number.isFinite(lowestPrice) ? `${formatXof(lowestPrice)} FCFA` : 'Voir les tarifs'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  className="min-h-[42px] px-4 rounded-xl bg-[#ff6b00] text-white font-headline text-[13px] font-bold shadow-sm hover:opacity-90 active:scale-95 transition-transform flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                  <span>Choisir un billet</span>
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {/* 7. Instant GeniusPay Secured Footing */}
      <section className="px-4 sm:px-6 lg:px-8 pb-6">
        <div className="rounded-2xl bg-[#eff4ff] p-4 flex flex-col items-center text-center gap-2 border border-[#dce9ff]">
          <div className="flex items-center gap-1.5 text-[#216b43]">
            <span className="material-symbols-outlined text-[20px]">lock</span>
            <span className="font-headline text-[12px] font-bold tracking-wide uppercase">
              Paiements 100% Sécurisés par GeniusPay
            </span>
          </div>
          <p className="font-body text-[12px] text-[#5a4136] max-w-xs leading-relaxed">
            Réglez instantanément avec vos comptes Wave, Orange Money, MTN MoMo, Moov Money ou carte bancaire sans frais supplémentaires.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-white font-headline text-[11px] font-bold text-[#0b1c30] shadow-xs border border-[#e2bfb0]/40">
              Wave 🌊
            </span>
            <span className="px-3 py-1 rounded-full bg-white font-headline text-[11px] font-bold text-[#ff6b00] shadow-xs border border-[#e2bfb0]/40">
              Orange Money
            </span>
            <span className="px-3 py-1 rounded-full bg-white font-headline text-[11px] font-bold text-[#d97706] shadow-xs border border-[#e2bfb0]/40">
              MTN MoMo
            </span>
            <span className="px-3 py-1 rounded-full bg-white font-headline text-[11px] font-bold text-[#0284c7] shadow-xs border border-[#e2bfb0]/40">
              Moov
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
