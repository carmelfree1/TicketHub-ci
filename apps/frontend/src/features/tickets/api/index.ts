import { api, ApiError, type TicketRecord } from '@/services/api';
import { loadOfflineTickets, saveOfflineTickets } from '@/lib/offlineTickets';

/**
 * Network first. A failed request that never reached the server (offline, DNS, timeout) falls back to the copy saved
 * by the last successful load; any answer from the API, including 401, is authoritative and is never masked.
 */
async function list(): Promise<TicketRecord[]> {
  try {
    const tickets = await api.tickets();
    void saveOfflineTickets(tickets);
    return tickets;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const cached = await loadOfflineTickets();
    if (cached) return cached.tickets;
    throw error;
  }
}

export const ticketsApi = {
  list,
  scan: api.scanTicket,
  partnerManifest: api.partnerManifest,
  partnerMe: api.partnerMe,
  partnerTrips: api.partnerTrips,
  partnerStats: api.partnerStats,
};
