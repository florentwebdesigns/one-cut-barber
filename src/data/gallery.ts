/**
 * Gallery media. Only authentic One Cut photography belongs here.
 * To add a photo: drop the file into src/assets/gallery/, import it below,
 * and add an entry. `shape` sets the tile proportion: 'tall' | 'square' | 'wide'.
 */
import type { ImageMetadata } from 'astro';
import lounge from '../assets/gallery/lounge.png';
import skinFadeBeard from '../assets/gallery/skin-fade-beard.png';
import curlsDesign from '../assets/gallery/curls-design.png';
import taperNape from '../assets/gallery/taper-nape-design.png';
import beardLineup from '../assets/gallery/beard-lineup.png';
import windowLowFade from '../assets/gallery/window-low-fade.png';
import shopFloor from '../assets/gallery/shop-floor.png';

export type GalleryItem = {
  src: ImageMetadata;
  alt: string;
  caption: string;
  shape: 'tall' | 'square' | 'wide';
};

export const gallery: GalleryItem[] = [
  {
    src: skinFadeBeard,
    alt: 'Client with a skin fade, slicked-back top and full shaped beard, seated inside One Cut with barber chairs behind him',
    caption: 'Skin fade, full beard',
    shape: 'tall',
  },
  {
    src: curlsDesign,
    alt: 'Back view of curly hair with a taper and a sharp freehand line design above the ear',
    caption: 'Curls with a freehand design',
    shape: 'square',
  },
  {
    src: beardLineup,
    alt: 'Barber in black gloves lining up a client’s beard with a trimmer',
    caption: 'Beard line-up',
    shape: 'tall',
  },
  {
    src: windowLowFade,
    alt: 'Client with a low fade and shaped beard in front of the One Cut Barber Shop window lettering',
    caption: 'Low fade at the window',
    shape: 'tall',
  },
  {
    src: taperNape,
    alt: 'Textured top with a low taper and a nape design, seen from behind',
    caption: 'Taper with nape design',
    shape: 'square',
  },
  {
    src: lounge,
    alt: 'The One Cut lounge: a black fluted wall with the illuminated One Cut sign above a fireplace',
    caption: 'The lounge',
    shape: 'tall',
  },
];

/** Images used outside the gallery grid (About section). */
export const shopImages = { lounge, windowLowFade, beardLineup, shopFloor };
