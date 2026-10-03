import { TicketedEvent } from '../types';
import { ASSETS } from './mockData';

export const MOCK_EVENTS: TicketedEvent[] = [
  {
    id: 'event-didi-b-2026',
    title: 'Concert Live Didi B • Sacré Tour',
    eventType: 'concert',
    description: 'Une grande soirée live au Palais de la Culture.',
    venue: 'Palais de la Culture, Treichville',
    city: 'Abidjan',
    startsAt: '2026-10-24T20:00:00+00:00',
    imageUrl: ASSETS.didiBConcert,
    categories: [
      { id: 'didi-standard', name: 'Standard', price: 5000, capacity: 800, available: 800 },
      { id: 'didi-vip', name: 'VIP', price: 10000, capacity: 200, available: 200 },
    ],
  },
  {
    id: 'event-asec-africa-2026',
    title: 'ASEC Mimosas vs Africa Sports',
    eventType: 'sport',
    description: 'Le grand rendez-vous du football ivoirien.',
    venue: 'Stade Félix Houphouët-Boigny, Le Plateau',
    city: 'Abidjan',
    startsAt: '2026-10-25T16:30:00+00:00',
    imageUrl: ASSETS.asecAfricaMatch,
    categories: [
      { id: 'asec-virage', name: 'Virage', price: 2000, capacity: 5000, available: 5000 },
      { id: 'asec-tribune', name: 'Tribune', price: 5000, capacity: 1200, available: 1200 },
    ],
  },
  {
    id: 'event-humour-abidjan-2026',
    title: 'Les soirées du rire d’Abidjan',
    eventType: 'show',
    description: 'Une soirée de stand-up avec des artistes ivoiriens.',
    venue: 'Palais de la Culture, Treichville',
    city: 'Abidjan',
    startsAt: '2026-11-07T19:00:00+00:00',
    imageUrl: ASSETS.stationAdjame,
    categories: [
      { id: 'rire-standard', name: 'Standard', price: 3000, capacity: 600, available: 600 },
      { id: 'rire-vip', name: 'VIP', price: 8000, capacity: 100, available: 100 },
    ],
  },
];
