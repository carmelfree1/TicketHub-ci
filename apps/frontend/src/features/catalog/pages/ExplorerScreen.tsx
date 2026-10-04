import React, { useCallback, useEffect, useState } from 'react';
import { formatXof } from '@tickethub/shared';
import { type TripDeparture, type TicketedEvent } from '@/types';
import { catalogApi } from '@/features/catalog/api';

interface ExplorerScreenProps {
  onSelectTrip: (trip: TripDeparture) => void;
  onSelectEvent: (event: TicketedEvent) => void;
}

type Category = 'transport' | 'concerts' | 'football' | 'spectacles';

const categories: Array<{ id: Category; label: string; icon: string; eventType: TicketedEvent['eventType'] | null }> = [
  { id: 'transport', label: 'Bus interurbain', icon: 'directions_bus', eventType: null },
  { id: 'concerts', label: 'Concerts', icon: 'music_note', eventType: 'concert' },
  { id: 'football', label: 'Football', icon: 'sports_soccer', eventType: 'sport' },
  { id: 'spectacles', label: 'Spectacles', icon: 'theater_comedy', eventType: 'show' },
];

const eventTypeLabel: Record<TicketedEvent['eventType'], string> = { concert: 'Concert', sport: 'Football', show: 'Spectacle' };

const PAGE_SIZE = 9;

const suggestions = ['Yamoussoukro', 'Bouaké', 'San Pédro', 'Korhogo'];

const fieldClass =
  'w-full bg-transparent font-body text-[15px] font-semibold text-[#0b1c30] focus:outline-none placeholder:font-normal placeholder:text-[#8a7a70]';
const fieldBoxClass =
  'flex items-center gap-2 rounded-lg border border-[#dce9ff] bg-[#f4f7ff] px-3 py-2 focus-within:border-[#ff6b00] focus-within:ring-2 focus-within:ring-[#ff6b00]/25';
const fieldLabelClass = 'block font-headline text-[11px] font-bold uppercase tracking-wider text-[#5a4136]';

function todayPlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#ffb4ab] bg-[#ffdad6] px-4 py-3 text-[#93000a]">
      <p className="font-body text-[13px]">{message}</p>
      <button type="button" onClick={onRetry} className="min-h-[40px] rounded-lg bg-white px-3 font-headline text-[12px] font-bold text-[#93000a] cursor-pointer">
        Réessayer
      </button>
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-44 animate-pulse rounded-xl border border-[#e6e9f2] bg-white" />
      ))}
    </div>
  );
}

export const ExplorerScreen: React.FC<ExplorerScreenProps> = ({ onSelectTrip, onSelectEvent }) => {
  const [category, setCategory] = useState<Category>('transport');
  const [departCity, setDepartCity] = useState('Abidjan');
  const [destCity, setDestCity] = useState('Yamoussoukro');
  const [departureDate, setDepartureDate] = useState(() => todayPlusDays(1));
  const [trips, setTrips] = useState<TripDeparture[]>([]);
  const [events, setEvents] = useState<TicketedEvent[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);
  const [tripLimit, setTripLimit] = useState(PAGE_SIZE);

  const loadCatalog = useCallback(() => {
    let active = true;
    setLoadingCatalog(true);
    setCatalogError('');
    Promise.all([catalogApi.trips(), catalogApi.events()])
      .then(([nextTrips, nextEvents]) => {
        if (!active) return;
        setTrips(nextTrips);
        setEvents(nextEvents);
      })
      .catch(() => {
        if (active) setCatalogError('Le catalogue n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.');
      })
      .finally(() => { if (active) setLoadingCatalog(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => loadCatalog(), [loadCatalog]);

  const search = async () => {
    setSearching(true);
    setSearchError('');
    try {
      setTrips(await catalogApi.trips({ from: departCity.trim(), to: destCity.trim(), date: departureDate }));
      setTripLimit(PAGE_SIZE);
      setSearched(true);
    } catch {
      setSearchError('La recherche a échoué. Vérifiez votre connexion puis réessayez.');
    } finally {
      setSearching(false);
    }
  };

  const swapCities = () => {
    setDepartCity(destCity);
    setDestCity(departCity);
  };

  const activeCategory = categories.find((item) => item.id === category)!;
  const visibleEvents = events.filter((event) => !activeCategory.eventType || event.eventType === activeCategory.eventType);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <header className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="font-headline text-[26px] font-bold leading-tight tracking-tight text-[#0b1c30] sm:text-[32px]">
          Billets de bus et d’événements
        </h1>
        <p className="font-body text-[15px] leading-relaxed text-[#5a4136]">
          Choisissez un départ ou un événement, réservez vos places et payez par Mobile Money. Vos billets restent dans votre compte.
        </p>
      </header>

      <div role="group" aria-label="Catégorie" className="flex gap-2 overflow-x-auto no-scrollbar">
        {categories.map((item) => {
          const active = item.id === category;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(item.id)}
              className={`flex min-h-[44px] flex-shrink-0 items-center gap-2 rounded-lg border px-4 font-headline text-[13px] font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] focus-visible:ring-offset-2 ${
                active ? 'border-[#0b1c30] bg-[#0b1c30] text-white' : 'border-[#dce9ff] bg-white text-[#0b1c30] hover:bg-[#eff4ff]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      {catalogError && <InlineError message={catalogError} onRetry={loadCatalog} />}

      {category === 'transport' && (
        <>
          <section aria-labelledby="search-title" className="rounded-xl border border-[#e6e9f2] bg-white p-4 sm:p-5">
            <h2 id="search-title" className="sr-only">Rechercher un départ</h2>
            <form
              onSubmit={(event) => { event.preventDefault(); void search(); }}
              className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_220px_auto] lg:items-end"
            >
              <label className={fieldBoxClass}>
                <span className="material-symbols-outlined text-[20px] text-[#ff6b00]" aria-hidden="true">trip_origin</span>
                <span className="min-w-0 flex-1">
                  <span className={fieldLabelClass}>Départ</span>
                  <input value={departCity} onChange={(event) => setDepartCity(event.target.value)} required autoComplete="off" className={fieldClass} placeholder="Ville de départ" />
                </span>
              </label>

              <button
                type="button"
                onClick={swapCities}
                aria-label="Inverser le départ et la destination"
                className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[#dce9ff] bg-white text-[#0b1c30] hover:bg-[#eff4ff] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">swap_horiz</span>
              </button>

              <label className={fieldBoxClass}>
                <span className="material-symbols-outlined text-[20px] text-[#216b43]" aria-hidden="true">location_on</span>
                <span className="min-w-0 flex-1">
                  <span className={fieldLabelClass}>Destination</span>
                  <input value={destCity} onChange={(event) => setDestCity(event.target.value)} required autoComplete="off" className={fieldClass} placeholder="Ville d’arrivée" />
                </span>
              </label>

              <label className={fieldBoxClass}>
                <span className="material-symbols-outlined text-[20px] text-[#ff6b00]" aria-hidden="true">calendar_month</span>
                <span className="min-w-0 flex-1">
                  <span className={fieldLabelClass}>Date</span>
                  <input type="date" value={departureDate} min={todayPlusDays(0)} onChange={(event) => setDepartureDate(event.target.value)} required className={fieldClass} />
                </span>
              </label>

              <button
                type="submit"
                disabled={searching}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-[#ff6b00] px-6 font-headline text-[14px] font-bold text-white hover:bg-[#e65f00] disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] focus-visible:ring-offset-2"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">search</span>
                {searching ? 'Recherche…' : 'Rechercher'}
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-body text-[12px] text-[#5a4136]">Destinations :</span>
              {suggestions.map((city) => (
                <button
                  key={city}
                  type="button"
                  aria-pressed={destCity.toLowerCase() === city.toLowerCase()}
                  onClick={() => setDestCity(city)}
                  className={`min-h-[36px] rounded-md border px-3 font-body text-[12px] font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                    destCity.toLowerCase() === city.toLowerCase() ? 'border-[#ff6b00] bg-[#fff1e8] text-[#a04100]' : 'border-[#dce9ff] bg-white text-[#0b1c30] hover:bg-[#eff4ff]'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="trips-title" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="trips-title" className="font-headline text-[20px] font-bold text-[#0b1c30]">
                {searched ? 'Résultats de la recherche' : 'Prochains départs'}
              </h2>
              {!loadingCatalog && <span className="font-body text-[13px] text-[#5a4136]">{trips.length} départ{trips.length > 1 ? 's' : ''}</span>}
            </div>

            {searchError && <InlineError message={searchError} onRetry={() => void search()} />}
            {loadingCatalog && <ListSkeleton rows={3} />}
            {!loadingCatalog && !catalogError && trips.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#c9d7ff] bg-white px-4 py-10 text-center">
                <p className="font-headline text-[15px] font-bold text-[#0b1c30]">Aucun départ trouvé</p>
                <p className="mt-1 font-body text-[13px] text-[#5a4136]">Essayez une autre date ou une autre destination.</p>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {trips.slice(0, tripLimit).map((trip) => (
                <article key={trip.id} className="flex flex-col gap-3 rounded-xl border border-[#e6e9f2] bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#eff4ff] font-headline text-[13px] font-bold text-[#0b1c30]" aria-hidden="true">
                        {trip.carrierCode}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-headline text-[16px] font-bold text-[#0b1c30]">{trip.carrier}</h3>
                        <p className="truncate font-body text-[12px] text-[#5a4136]">{trip.serviceTitle}</p>
                      </div>
                    </div>
                    {trip.tag && (
                      <span className="flex-shrink-0 rounded-md bg-[#e9f9ee] px-2 py-1 font-headline text-[11px] font-bold text-[#00522e]">{trip.tag}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-[#f4f7ff] px-3 py-3">
                    <div>
                      <p className="font-headline text-[20px] font-bold leading-none text-[#0b1c30]">{trip.departTime}</p>
                      <p className="mt-1 font-body text-[12px] text-[#5a4136]">{trip.departStation}</p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-[#5a4136]">
                      <span className="font-body text-[11px]">{trip.duration}</span>
                      <span className="h-px w-12 bg-[#c9b8ad]" aria-hidden="true" />
                      <span className="font-body text-[11px]">Direct</span>
                    </div>
                    <div className="text-right">
                      <p className="font-headline text-[20px] font-bold leading-none text-[#0b1c30]">{trip.arrivalTime}</p>
                      <p className="mt-1 font-body text-[12px] text-[#5a4136]">{trip.arrivalStation}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 font-body text-[12px] text-[#5a4136]">
                    <ul className="flex flex-wrap gap-x-3 gap-y-1">
                      {trip.amenities.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <span className={`font-semibold ${trip.availableSeats <= 4 ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'}`}>
                      {trip.availableSeats} place{trip.availableSeats > 1 ? 's' : ''} restante{trip.availableSeats > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-[#eef1f8] pt-3">
                    <p className="font-headline text-[20px] font-bold text-[#0b1c30]">
                      {formatXof(trip.price)} <span className="text-[12px] font-semibold text-[#5a4136]">FCFA</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => onSelectTrip(trip)}
                      disabled={trip.availableSeats === 0}
                      className="min-h-[44px] rounded-lg bg-[#ff6b00] px-4 font-headline text-[13px] font-bold text-white hover:bg-[#e65f00] disabled:bg-[#c9b8ad] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] focus-visible:ring-offset-2"
                    >
                      {trip.availableSeats === 0 ? 'Complet' : 'Choisir les sièges'}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {trips.length > tripLimit && (
              <button
                type="button"
                onClick={() => setTripLimit((limit) => limit + PAGE_SIZE)}
                className="mx-auto min-h-[44px] rounded-lg border border-[#dce9ff] bg-white px-5 font-headline text-[13px] font-bold text-[#0b1c30] hover:bg-[#eff4ff] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
              >
                Afficher plus de départs ({trips.length - tripLimit} restants)
              </button>
            )}
          </section>
        </>
      )}

      <section aria-labelledby="events-title" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="events-title" className="font-headline text-[20px] font-bold text-[#0b1c30]">
            {category === 'transport' ? 'Événements à venir' : activeCategory.label}
          </h2>
          {!loadingCatalog && <span className="font-body text-[13px] text-[#5a4136]">{visibleEvents.length} événement{visibleEvents.length > 1 ? 's' : ''}</span>}
        </div>

        {loadingCatalog && <ListSkeleton rows={category === 'transport' ? 3 : 2} />}
        {!loadingCatalog && !catalogError && visibleEvents.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#c9d7ff] bg-white px-4 py-10 text-center">
            <p className="font-headline text-[15px] font-bold text-[#0b1c30]">Aucun événement pour le moment</p>
            <p className="mt-1 font-body text-[13px] text-[#5a4136]">Les nouveaux événements apparaîtront ici dès leur mise en vente.</p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleEvents.map((event) => {
            const startsAt = new Date(event.startsAt);
            const lowestPrice = Math.min(...event.categories.map((item) => item.price));
            return (
              <article key={event.id} className="flex flex-col rounded-xl border border-[#e6e9f2] bg-white">
                <div className="flex gap-3 p-4">
                  <time
                    dateTime={startsAt.toISOString()}
                    className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-[#0b1c30] text-white"
                  >
                    <span className="font-headline text-[22px] font-bold leading-none">{startsAt.getDate()}</span>
                    <span className="mt-1 font-body text-[11px] uppercase tracking-wide">
                      {new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(startsAt).replace('.', '')}
                    </span>
                  </time>
                  <div className="min-w-0">
                    <p className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#a04100]">{eventTypeLabel[event.eventType]}</p>
                    <h3 className="font-headline text-[17px] font-bold leading-tight text-[#0b1c30]">{event.title}</h3>
                    <p className="mt-1 font-body text-[12px] text-[#5a4136]">
                      {event.venue}, {event.city}
                    </p>
                    <p className="font-body text-[12px] text-[#5a4136]">
                      {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(startsAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#eef1f8] p-4">
                  <div>
                    <p className="font-body text-[11px] text-[#5a4136]">À partir de</p>
                    <p className="font-headline text-[18px] font-bold text-[#0b1c30]">
                      {Number.isFinite(lowestPrice) ? <>{formatXof(lowestPrice)} <span className="text-[12px] font-semibold text-[#5a4136]">FCFA</span></> : 'Voir les tarifs'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className="min-h-[44px] rounded-lg bg-[#ff6b00] px-4 font-headline text-[13px] font-bold text-white hover:bg-[#e65f00] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] focus-visible:ring-offset-2"
                  >
                    Choisir un billet
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <p className="max-w-2xl font-body text-[12px] leading-relaxed text-[#5a4136]">
        Paiement par Wave, Orange Money, MTN MoMo, Moov Money ou carte bancaire, traité par GeniusPay. Votre code PIN Mobile Money n’est jamais saisi sur TicketHub.
      </p>
    </div>
  );
};
