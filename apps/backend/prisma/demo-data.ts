export interface DemoTrip {
  id: string;
  carrier: string;
  carrierCode: string;
  serviceTitle: string;
  departTime: string;
  departStation: string;
  departCity: string;
  arrivalTime: string;
  arrivalStation: string;
  arrivalCity: string;
  duration: string;
  price: number;
  amenities: string[];
  vehicle: string;
  registration: string;
}

export interface DemoEvent {
  id: string;
  title: string;
  eventType: string;
  description: string;
  venue: string;
  city: string;
  startsAt: string;
  imageUrl: string;
  categories: {
    id: string;
    name: string;
    price: number;
    capacity: number;
  }[];
}

export const DEMO_TRIPS: DemoTrip[] = [
  {
    id: 'trip-utb-0830',
    carrier: 'UTB Express',
    carrierCode: 'UTB',
    serviceTitle: 'Liaison Express A3 direct',
    departTime: '08:30',
    departStation: 'Gare Adjame',
    departCity: 'Abidjan',
    arrivalTime: '11:15',
    arrivalStation: 'Yamoussoukro',
    arrivalCity: 'Yamoussoukro',
    duration: '2h 45m',
    price: 5000,
    amenities: ['Clim', 'Wifi', 'Prises'],
    vehicle: 'Marcopolo VIP',
    registration: '4829 JJ 01',
  },
  {
    id: 'trip-sbta-0915',
    carrier: 'SBTA Confort Plus',
    carrierCode: 'SBTA',
    serviceTitle: 'Liaison rapide Treichville',
    departTime: '09:15',
    departStation: 'Gare Treichville',
    departCity: 'Abidjan',
    arrivalTime: '12:00',
    arrivalStation: 'Yamoussoukro',
    arrivalCity: 'Yamoussoukro',
    duration: '2h 45m',
    price: 5500,
    amenities: ['Clim', 'Siege XXL'],
    vehicle: 'Scania Grand Tourisme',
    registration: '7721 KL 01',
  },
  {
    id: 'trip-get-1000',
    carrier: 'General Express',
    carrierCode: 'GET',
    serviceTitle: 'Service Standard Regulier',
    departTime: '10:00',
    departStation: 'Adjame Bracodi',
    departCity: 'Abidjan',
    arrivalTime: '12:40',
    arrivalStation: 'Yamoussoukro',
    arrivalCity: 'Yamoussoukro',
    duration: '2h 40m',
    price: 4500,
    amenities: ['Clim', 'Soute 25kg'],
    vehicle: 'Mercedes Tourismo',
    registration: '3391 HM 01',
  },
  {
    id: 'trip-utb-bouake-1015',
    carrier: 'UTB Express',
    carrierCode: 'UTB',
    serviceTitle: 'Liaison Directe Centre',
    departTime: '10:15',
    departStation: 'Gare Treichville',
    departCity: 'Abidjan',
    arrivalTime: '14:45',
    arrivalStation: 'Gare de Broukro',
    arrivalCity: 'Bouake',
    duration: '4h 30m',
    price: 9000,
    amenities: ['Clim', 'Wifi', 'Video'],
    vehicle: 'Marcopolo Confort #08',
    registration: '8812 KT 01',
  },
  {
    id: 'trip-utb-sanpedro-1300',
    carrier: 'UTB Express',
    carrierCode: 'UTB',
    serviceTitle: 'Cotiere Express Rapide',
    departTime: '13:00',
    departStation: 'Gare Adjame',
    departCity: 'Abidjan',
    arrivalTime: '18:15',
    arrivalStation: 'Gare San Pedro Port',
    arrivalCity: 'San Pedro',
    duration: '5h 15m',
    price: 11000,
    amenities: ['Clim', 'Siege Relax', 'Prises USB'],
    vehicle: 'Car Express #15',
    registration: '2049 LM 01',
  },
];

export const DEMO_EVENTS: DemoEvent[] = [
  {
    id: 'event-didi-b-2026',
    title: 'Concert Live Didi B - Sacre Tour',
    eventType: 'concert',
    description: 'Une grande soiree live au Palais de la Culture.',
    venue: 'Palais de la Culture, Treichville',
    city: 'Abidjan',
    startsAt: '2026-10-24T20:00:00+00:00',
    imageUrl: '',
    categories: [
      { id: 'didi-standard', name: 'Standard', price: 5000, capacity: 800 },
      { id: 'didi-vip', name: 'VIP', price: 10000, capacity: 200 },
    ],
  },
  {
    id: 'event-asec-africa-2026',
    title: 'ASEC Mimosas vs Africa Sports',
    eventType: 'sport',
    description: 'Le grand rendez-vous du football ivoirien.',
    venue: 'Stade Felix Houphouet-Boigny, Le Plateau',
    city: 'Abidjan',
    startsAt: '2026-10-25T16:30:00+00:00',
    imageUrl: '',
    categories: [
      { id: 'asec-virage', name: 'Virage', price: 2000, capacity: 5000 },
      { id: 'asec-tribune', name: 'Tribune', price: 5000, capacity: 1200 },
    ],
  },
  {
    id: 'event-humour-abidjan-2026',
    title: 'Les soirees du rire d Abidjan',
    eventType: 'show',
    description: 'Une soiree de stand-up avec des artistes ivoiriens.',
    venue: 'Palais de la Culture, Treichville',
    city: 'Abidjan',
    startsAt: '2026-11-07T19:00:00+00:00',
    imageUrl: '',
    categories: [
      { id: 'rire-standard', name: 'Standard', price: 3000, capacity: 600 },
      { id: 'rire-vip', name: 'VIP', price: 8000, capacity: 100 },
    ],
  },
];
