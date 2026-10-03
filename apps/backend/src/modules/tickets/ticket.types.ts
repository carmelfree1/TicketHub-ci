export interface TicketQrClaims {
  v: 1;
  ticketId: string;
  bookingId: string;
  exp: number;
}

export interface ManualTicketValidation {
  token?: string;
  ticketCode?: string;
}
