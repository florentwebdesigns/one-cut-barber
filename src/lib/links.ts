import { business } from '../data/business';

/** tel: link from an E.164 or loosely formatted number. */
export const telLink = (phone: string = business.phone.e164) =>
  `tel:${phone.replace(/[^\d+]/g, '')}`;

/**
 * sms: link with an optional prefilled message.
 * Apple devices read `&body=`, everything else reads `?body=`. Pass `apple` from a UA check at runtime.
 */
export const smsLink = (body = '', apple = false, phone: string = business.sms.e164) => {
  const n = phone.replace(/[^\d+]/g, '');
  if (!body) return `sms:${n}`;
  return `sms:${n}${apple ? '&' : '?'}body=${encodeURIComponent(body)}`;
};

/** Google Maps directions link for an address string. */
export const directionsLink = (query: string = business.mapsQuery) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;

/** Google Maps search link (opens the place). */
export const mapsSearchLink = (query: string = business.mapsQuery) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/** Embeddable Google Map (no API key required). */
export const mapsEmbedLink = (query: string = business.mapsQuery) =>
  `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;

/** On-page booking form. If a booking URL is ever confirmed in business.ts, buttons use it instead. */
export const bookingLink = () => business.bookingUrl ?? '#book';
