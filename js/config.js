/**
 * Site-wide settings. Edit this file only; every page reads from here.
 */
export const CONFIG = {
  /**
   * WhatsApp number in international format, digits only (no +, spaces or dashes).
   * Owner's number: +91 96381 72211.
   */
  WHATSAPP_NUMBER: '919638172211',

  /** Show catalogue dealer rates (₹, GST extra) in spec tables. Default: hidden. */
  SHOW_PRICES: false,

  EMAIL: 'dpsmart94@gmail.com',
  MAP_URL: 'https://maps.google.com?q=22.16376,70.78683',
  MAP_EMBED_URL: 'https://maps.google.com/maps?q=22.16376,70.78683&z=15&output=embed',
  CATALOGUE_PDF: 'assets/pdf/CAPSON%20Pipe%20and%20fitting.pdf',

  /** Default WhatsApp greeting when a button has no specific message. */
  DEFAULT_MESSAGE:
    'Hello CAPSON, I would like a quote for your pipes & fittings. Please share rates and availability.',
};

/** Business facts (from CLAUDE.md). Used by the header, footer and pages. */
export const BRAND = {
  name: 'CAPSON',
  tagline: 'Easy to Flow Forever',
  promise: '100% Satisfaction Guaranteed',
  strapline: 'UPVC & CPVC pipe and fitting for hot & cold water plumbing solution',
  manufacturer: 'Shreenath Polytech',
  proprietor: 'Dhaval Patel',
  established: 2017,
  constitution: 'Sole Proprietorship',
  gst: '24CICPP9418B1ZF',
  address: 'Plot No 15, SR No. 452/3, Nr Jay Sardar Starch, Shapar, Kotda Sangani, Rajkot - 360024, Gujarat',
  email: CONFIG.EMAIL,
  mapUrl: CONFIG.MAP_URL,
  logo: 'assets/img/brand/logo-240.webp',
  logoLarge: 'assets/img/brand/logo-480.webp',
  terms: 'GST extra · Subject to Rajkot jurisdiction · Payment advance / immediate only · Goods sent by transport at buyer’s risk · Packing & forwarding extra · E.&O.E.',
};
