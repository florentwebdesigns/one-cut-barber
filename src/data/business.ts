/**
 * Verified business facts for One Cut Barbershop.
 * Edit this file to update contact details or hours. Components read from here only.
 */

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** 24h "HH:MM" strings. `null` means closed all day. */
export type DayHours = { open: string; close: string } | null;

export const business = {
  name: 'One Cut Barbershop',
  shortName: 'One Cut',
  category: 'Barbershop',
  /** From the shop's own printed price list ("EST. 2024"). */
  established: 2024,
  address: {
    street: '223 Mountain Avenue',
    streetShort: '223 Mountain Ave',
    city: 'Springfield',
    region: 'NJ',
    regionName: 'New Jersey',
    postalCode: '07081',
    country: 'US',
  },
  phone: {
    display: '(908) 363-0066',
    e164: '+19083630066',
  },
  /**
   * Number that receives booking requests by text message. Must be able to receive SMS
   * (a mobile line or a text-enabled business line). Change it if bookings go to a different phone.
   */
  sms: {
    display: '(908) 363-0066',
    e164: '+19083630066',
  },
  /** No confirmed booking URL. Booking happens by text or phone. Add a URL here if one is ever confirmed. */
  bookingUrl: null as string | null,
  /** No verified official social profiles supplied yet. Add them here when confirmed. */
  social: [] as { label: string; url: string }[],
  mapsQuery: '223 Mountain Ave, Springfield, NJ 07081',
  timezone: 'America/New_York',
  hours: {
    mon: { open: '09:00', close: '20:00' },
    tue: { open: '09:00', close: '20:00' },
    wed: { open: '09:00', close: '20:00' },
    thu: { open: '09:00', close: '20:00' },
    fri: { open: '09:00', close: '20:00' },
    sat: { open: '08:00', close: '16:00' },
    sun: null,
  } as Record<DayKey, DayHours>,
  /** Publicly listed attributes. Only include what is verified. */
  amenities: ['Walk-ins welcome', 'Kid-friendly', 'Free parking'],
};

export const dayOrder: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const dayNames: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
