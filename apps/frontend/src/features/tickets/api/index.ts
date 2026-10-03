import { api } from '@/services/api';

export const ticketsApi = {
  list: api.tickets,
  scan: api.scanTicket,
  partnerManifest: api.partnerManifest,
};
