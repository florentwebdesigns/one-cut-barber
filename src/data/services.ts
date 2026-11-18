/**
 * Service menu, transcribed from One Cut's own printed price list.
 * To change a price or add a service, edit this list. Prices are in USD.
 * Only add a `note` when the detail is confirmed by the shop.
 */

export type Service = {
  name: string;
  price: number;
  note?: string;
  /** Highlights the item as the shop's signature service. */
  signature?: boolean;
};

export const services: Service[] = [
  { name: 'One Cut Haircut', price: 50 },
  { name: 'Haircut & Beard', price: 70, note: 'Includes hot towel' },
  { name: 'Kids Haircut', price: 40 },
  { name: 'Edge-Up & Beard', price: 40, note: 'Includes hot towel' },
  { name: 'One Cut Experience', price: 120, signature: true },
];

/** Footnotes printed on the shop's menu. */
export const serviceNotes = [
  'Beard services include a hot towel.',
  'Every service includes a complimentary hair wash on request.',
];

export const formatPrice = (n: number) => `$${n.toFixed(0)}`;
