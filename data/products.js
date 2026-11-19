/**
 * CAPSON product catalogue: the single source of truth for every page.
 *
 * Transcribed visually from assets/pdf/CAPSON Pipe and fitting.pdf (scanned; no text layer).
 * - Numbers (packing, weights, rates) are copied exactly as printed, including apparent
 *   printing errors (see data/QA.md).
 * - Product names have obvious catalogue typos fixed for display.
 * - Size notation is normalised (1.1/4" and 1 1/4" -> 1-1/4"; 3/4X1/2" -> 3/4" × 1/2").
 * - "rate" is the catalogue dealer rate in ₹, GST extra. Hidden on the site unless
 *   SHOW_PRICES is true in js/config.js.
 *
 * Exports
 *   lines[]       -> the three product lines: upvc | cpvc | agri
 *   categories[]  -> { id, name, line, slug, description, image } (groups within a line)
 *   products[]    -> { id, slug, category, line, type, kind, name, aka?, image, page,
 *                      columns[{key,label}], rows[{...}] }
 *
 * Row shapes by `kind`
 *   pipe     { sizeInch, sizeMm, weight3m, pkg3m, weight6m, pkg6m }  (SDR-11: weight5m, pkg5m)
 *   fitting  { size, innerPacking, masterPacking, rate }
 *   packing  { size, packing?, masterPacking?, rate }   valves, bends, clamps, bushes, plugs
 *   solvent  { ml, packing?, masterPacking, rate }
 *   garden   { size, meter, weight, rate }
 *   Optional keys are omitted when the catalogue table has no such column.
 */

/* ---------- Product lines ---------- */
export const lines = [
  {
    id: 'upvc',
    name: 'UPVC Pipes & Fittings',
    short: 'UPVC',
    slug: 'upvc',
    page: 'upvc.html',
    image: 'assets/img/products/upvc-pipe-sch-40.webp',
    description:
      'SCH-40 and SCH-80 pipes with plain and brass fittings, valves, tank nipples, clamps and solvent.',
  },
  {
    id: 'cpvc',
    name: 'CPVC Pipes & Fittings',
    short: 'CPVC',
    slug: 'cpvc',
    page: 'cpvc.html',
    image: 'assets/img/products/cpvc-pipe-sdr-11.webp',
    description:
      'SDR-11 and SDR-13.5 pipes with fittings, brass fittings, valves and solvent for hot and cold water lines.',
  },
  {
    id: 'agri',
    name: 'Agri & Garden Pipes',
    short: 'Agri',
    slug: 'agri',
    page: 'agri.html',
    image: 'assets/img/products/garden-colour-virgin.webp',
    description:
      'Transparent, Zibra, Petrol, Halwa/Dual, Blue Metallic, Colour Virgin, Contractor and Level pipes in 30 m coils.',
  },
];

/** Product types (used for filter chips). `slug` forms the category id with the line. */
export const TYPES = {
  pipes: { label: 'Pipes', slug: 'pipes' },
  fittings: { label: 'Fittings', slug: 'fittings' },
  brass: { label: 'Brass fittings', slug: 'brass-fittings' },
  valves: { label: 'Valves', slug: 'valves' },
  nipples: { label: 'Tank nipples', slug: 'nipples' },
  accessories: { label: 'Accessories', slug: 'accessories' },
};

/**
 * Filter chips shown on catalogue pages. Each chip covers one or more product types
 * (tank nipples are listed under Fittings).
 */
export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pipes', label: 'Pipes', types: ['pipes'] },
  { id: 'fittings', label: 'Fittings', types: ['fittings', 'nipples'] },
  { id: 'brass', label: 'Brass', types: ['brass'] },
  { id: 'valves', label: 'Valves', types: ['valves'] },
  { id: 'accessories', label: 'Accessories', types: ['accessories'] },
];

/** Categories = groups within a line. Images are filled in from the first product below. */
const CATEGORY_DEFS = [
  // [line, type, name, description, short menu label]
  ['upvc', 'pipes', 'UPVC Pipes', 'SCH-40 and SCH-80 UPVC pipes in 3 m and 6 m lengths, 1/2" to 2".', 'Pipes SCH-40 / SCH-80'],
  ['upvc', 'fittings', 'UPVC Plain Fittings', 'Plain UPVC elbows, tees, couplers, unions, FTA/MTA, reducers, end caps and bends.', 'Plain fittings'],
  ['upvc', 'brass', 'UPVC Brass Fittings', 'UPVC elbows, tees, FTA and MTA with brass threaded inserts.', 'Brass fittings'],
  ['upvc', 'valves', 'UPVC Valves', 'UPVC ball valves (short and long) and concealed valves.', 'Valves'],
  ['upvc', 'nipples', 'UPVC Tank Nipples', 'Socket type, thread type and pipe tank nipples, 1/2" to 2".', 'Tank nipples'],
  ['upvc', 'accessories', 'UPVC Clamps & Accessories', 'Solvent cement, nail clamps, metal clamps and PP long plugs.', 'Clamps & accessories'],
  ['cpvc', 'pipes', 'CPVC Pipes', 'SDR-11 (3 m and 5 m) and SDR-13.5 (3 m and 6 m) CPVC pipes, 1/2" to 2".', 'Pipes SDR-11 / SDR-13.5'],
  ['cpvc', 'fittings', 'CPVC Fittings', 'CPVC elbows, tees, couplers, unions, FTA/MTA, end caps, reducers, tank nipples, bends and bushes.', 'Fittings'],
  ['cpvc', 'brass', 'CPVC Brass Fittings', 'CPVC elbows, tees, FTA and MTA with brass threaded inserts.', 'Brass fittings'],
  ['cpvc', 'valves', 'CPVC Valves', 'CPVC ball valves and concealed valves.', 'Valves'],
  ['cpvc', 'accessories', 'CPVC Accessories', 'CPVC solvent cement.', 'Solvent & accessories'],
  ['agri', 'pipes', 'Garden Pipes', 'Garden and level pipes in 30 m coils, 1/4" to 1-1/4".', 'Garden pipes'],
];

const categoryId = (line, type) => (line === 'agri' ? 'agri-garden-pipes' : `${line}-${TYPES[type].slug}`);

/* ---------- Column presets ---------- */
const col = (key, label) => ({ key, label });
const preset = (kind, ...columns) => ({ kind, columns });

const SIZE = col('size', 'Size');
const ML = col('ml', 'Size (ml)');
const INNER = col('innerPacking', 'Inner packing');
const MASTER = col('masterPacking', 'Master packing');
const PACKING = col('packing', 'Packing');
const BOX = col('packing', 'Packing in box');
const RATE = col('rate', 'Rate (₹, GST extra)');

const FITTING = preset('fitting', SIZE, INNER, MASTER, RATE);
const CLAMP = preset('packing', SIZE, PACKING, MASTER, RATE);
const VALVE_BOX = preset('packing', SIZE, BOX, RATE);
const MASTER_ONLY = preset('packing', SIZE, MASTER, RATE);
const PLUG = preset('packing', col('variant', 'Variant (1/2")'), PACKING, MASTER, RATE);
const SOLVENT = preset('solvent', ML, PACKING, MASTER, RATE);
const SOLVENT_MASTER = preset('solvent', ML, MASTER, RATE);
const GARDEN = preset('garden', SIZE, col('meter', 'Length (m)'), col('weight', 'Weight'), RATE);
const pipeCols = (longLen) =>
  preset(
    'pipe',
    col('sizeInch', 'Size (inch)'),
    col('sizeMm', 'Size (mm)'),
    col('weight3m', 'Weight (3 m)'),
    col('pkg3m', 'Pkg. (3 m)'),
    col(`weight${longLen}m`, `Weight (${longLen} m)`),
    col(`pkg${longLen}m`, `Pkg. (${longLen} m)`)
  );

/**
 * Tiny table parser: one row per line, cells separated by "|".
 * Keeps the data below readable and close to the printed catalogue.
 */
const t = (str) =>
  str
    .trim()
    .split('\n')
    .map((line) => line.split('|').map((c) => c.trim()));

const img = (slug) => `assets/img/products/${slug}.webp`;

/** Build a product record; rows become objects keyed by column. */
const p = (line, type, slug, name, spec, rows, extra = {}) => ({
  id: slug,
  slug,
  category: categoryId(line, type),
  line,
  type,
  kind: spec.kind,
  name,
  image: img(slug),
  columns: spec.columns,
  rows: t(rows).map((cells) => {
    if (cells.length !== spec.columns.length) throw new Error(`Row/column mismatch in ${slug}: ${cells}`);
    return Object.fromEntries(spec.columns.map((c, i) => [c.key, cells[i]]));
  }),
  ...extra,
});

/* ======================================================================
   UPVC
   ====================================================================== */
const upvc = [
  p('upvc', 'pipes', 'upvc-pipe-sch-40', 'UPVC Pipe SCH-40', pipeCols(6), `
    1/2"   | 15 mm | 0.75 | 50 | 1.5 | 30
    3/4"   | 20 mm | 0.95 | 35 | 1.9 | 25
    1"     | 25 mm | 1.4  | 25 | 2.8 | 15
    1-1/4" | 32 mm | 2    | 15 | 4   | 10
    1-1/2" | 40 mm | 2.35 | 15 | 4.7 | 10
    2"     | 50 mm | 3    | 10 | 6   | 8`),
  p('upvc', 'pipes', 'upvc-pipe-sch-80', 'UPVC Pipe SCH-80', pipeCols(6), `
    1/2"   | 15 mm | 0.9  | 50 | 1.8 | 30
    3/4"   | 20 mm | 1.25 | 35 | 2.5 | 25
    1"     | 25 mm | 1.8  | 25 | 3.6 | 15
    1-1/4" | 32 mm | 2.5  | 15 | 5   | 10
    1-1/2" | 40 mm | 3    | 15 | 6   | 10
    2"     | 50 mm | 4    | 10 | 8   | 8`),
  p('upvc', 'fittings', 'upvc-plain-elbow', 'UPVC Plain Elbow', FITTING, `
    1/2"   | 70X10=700  | 700X3=2100 | 6.75
    3/4"   | 50X8=400   | 400X3=1200 | 11.08
    1"     | 25X9=225   | 225X3=675  | 16.2
    1-1/4" | 20X7=140   | 140X3=420  | 27.2
    1-1/2" | 10X10=100  | 100X3=300  | 35.1
    2"     | 6X10=60    | 60X3=180   | 61.2`),
  p('upvc', 'fittings', 'upvc-plain-tee', 'UPVC Plain Tee', FITTING, `
    1/2"   | 50X9=450   | 450X3=1350 | 9.45
    3/4"   | 30X9=270   | 270X3=810  | 14.85
    1"     | 15X10=150  | 450X3=450  | 21.1
    1-1/4" | 10X9=90    | 90X3=270   | 37.4
    1-1/2" | 8X8=64     | 64X3=192   | 46.6
    2"     | 5X7=35     | 35X3=105   | 82`),
  p('upvc', 'fittings', 'upvc-plain-fta', 'UPVC Plain FTA', FITTING, `
    1/2"   | 100X10=1000 | 1000X3=3000 | 5.58
    3/4"   | 70X8=560    | 560X3=1680  | 9
    1"     | 35X10=350   | 350X3=1050  | 12.8
    1-1/4" | 30X8=240    | 240X3=720   | 22.1
    1-1/2" | 30X7=210    | 210X3=630   | 25.5
    2"     | 10X8=80     | 80X3=240    | 37`, { aka: 'Female threaded adaptor' }),
  p('upvc', 'fittings', 'upvc-plain-mta', 'UPVC Plain MTA', FITTING, `
    1/2"   | 100X10=1000 | 1000X3=3000 | 5
    3/4"   | 70X10=700   | 700X3=2100  | 7.2
    1"     | 50X9=450    | 450X3=1350  | 11.25
    1-1/4" | 30X8=240    | 240X3=720   | 19
    1-1/2" | 30X8=240    | 240X3=720   | 26
    2"     | 10X8=80     | 80X3=240    | 38`, { aka: 'Male threaded adaptor' }),
  p('upvc', 'fittings', 'upvc-coupler', 'UPVC Coupler', FITTING, `
    1/2"   | 100X9=900 | 900X3=2700 | 5.14
    3/4"   | 50X10=500 | 500X3=1500 | 7.3
    1"     | 35X9=315  | 35X9=945   | 11.1
    1-1/4" | 25X8=200  | 200X3=600  | 18.7
    1-1/2" | 20X7=140  | 140X3=420  | 22.8
    2"     | 12X8=96   | 96X3=288   | 35.1`),
  p('upvc', 'fittings', 'upvc-union', 'UPVC Union', FITTING, `
    1/2"   | 50X7=350  | 350X3=1050 | 17.38
    3/4"   | 25X10=250 | 250X3=750  | 23.6
    1"     | 20X8=160  | 160X3=480  | 32.55
    1-1/4" | 15X7=105  | 105X3=315  | 49.7
    1-1/2" | 9X7=63    | 63X3=189   | 78.2
    2"     | 6X7=42    | 42X3=126   | 116`),
  p('upvc', 'nipples', 'upvc-tank-nipple-socket', 'UPVC Tank Nipple (Socket Type)', FITTING, `
    1/2"   | 70X8=560 | 560X3=1680 | 11.8
    3/4"   | 40X9=360 | 360X3=1080 | 16.75
    1"     | 30X8=240 | 240X3=720  | 21.7
    1-1/4" | 20X8=160 | 160X3=480  | 36.75
    1-1/2" | 16X8=128 | 128X3=384  | 48.6
    2"     | 9X10=90  | 90X3=270   | 64.8`),
  p('upvc', 'nipples', 'upvc-pipe-tank-nipple', 'UPVC Pipe Tank Nipple', FITTING, `
    1/2"   | 70X8=560 | 560X3=1680 | 16
    3/4"   | 40X9=360 | 360X3=1080 | 20
    1"     | 30X8=240 | 240X3=720  | 26
    1-1/4" | 20X8=160 | 160X3=480  | 44
    1-1/2" | 16X8=128 | 128X3=384  | 60
    2"     | 9X10=90  | 90X3=270   | 84`),
  p('upvc', 'nipples', 'upvc-tank-nipple-thread', 'UPVC Tank Nipple (Thread Type)', FITTING, `
    1/2"   | 70X8=560 | 560X3=1680 | 13.35
    3/4"   | 40X9=360 | 360X3=1080 | 19.55
    1"     | 30X8=240 | 240X3=720  | 26.35
    1-1/4" | 20X8=160 | 160X3=480  | 45
    1-1/2" | 15X8=120 | 120X3=360  | 61.3
    2"     | 9X10=90  | 90X3=270   | 86.5`),
  p('upvc', 'fittings', 'upvc-end-cap', 'UPVC End Cap', FITTING, `
    1/2"   | 200X8=1600  | 1600X3=4800 | 4.4
    3/4"   | 100X10=1000 | 1000X3=3000 | 5.5
    1"     | 70X9=630    | 630X3=1890  | 9
    1-1/4" | 30X8=240    | 240X3=720   | 13.6
    1-1/2" | 25X6=150    | 150X3=450   | 17
    2"     | 15X10=150   | 150X3=450   | 27.9`),
  p('upvc', 'fittings', 'upvc-reducing-elbow', 'UPVC Reducing Elbow', FITTING, `
    3/4" × 1/2" | 50X8=400 | 400X3=1200 | 10
    1" × 3/4"   | 25X9=225 | 225X3=675  | 15
    1" × 1/2"   | 30X9=270 | 270X3=810  | 13`),
  p('upvc', 'fittings', 'upvc-reducing-tee', 'UPVC Reducing Tee', FITTING, `
    3/4" × 1/2"   | 30X8=240 | 240X3=720 | 13
    1" × 3/4"     | 20X8=160 | 160X3=480 | 17
    1" × 1/2"     | 25X8=200 | 25X3=600  | 21
    1-1/4" × 1"   | 10X9=90  | 90X3=270  | 42
    1-1/2" × 1"   | 8X8=64   | 64X3=192  | 50
    2" × 1"       | 6X7=42   | 42X3=126  | 80`),
  p('upvc', 'fittings', 'upvc-reducer', 'UPVC Reducer', FITTING, `
    3/4" × 1/2"   | 50X10=500 | 500X3=1500 | 6
    1" × 3/4"     | 35X9=315  | 315X3=945  | 9.5
    1" × 1/2"     | 35X9=315  | 315X3=945  | 9
    1-1/4" × 1"   | 30X8=240  | 240X3=720  | 19
    1-1/2" × 1"   | 25X7=175  | 175X3=525  | 22`),
  p('upvc', 'fittings', 'upvc-45-elbow', 'UPVC 45° Elbow', FITTING, `
    1/2"   | 100X6=600 | 600X3=1800 | 8.5
    3/4"   | 50X10=500 | 500X3=1500 | 13
    1"     | 25X9=225  | 225X3=675  | 22
    1-1/4" | 20X7=140  | 140X3=420  | 45
    1-1/2" | 10X10=100 | 100X3=300  | 55
    2"     | 6X10=60   | 60X3=180   | 75`),
  p('upvc', 'fittings', 'upvc-four-way-tee', 'UPVC Four Way Tee (Cross Tee)', FITTING, `
    1/2" | 25X20=500 | 500X3=1500 | 21
    3/4" | 15X20=300 | 300X3=900  | 32
    1"   | 10X25=250 | 250X3=750  | 55`),
  p('upvc', 'fittings', 'upvc-reducing-bush', 'UPVC Reducing Bush', CLAMP, `
    3/4" × 1/2"   | 200X8=1600 | 1600X3=4800 | 4
    1" × 3/4"     | 100X8=800  | 800X3=2400  | 7.5
    1" × 1/2"     | 70X8=560   | 560X3=1680  | 7.2
    1-1/4" × 1"   | 50X8=400   | 400X3=1200  | 15
    1-1/2" × 1"   | 30X8=240   | 240X3=720   | 23
    2" × 1"       | 20X8=160   | 160X3=480   | 35`),
  p('upvc', 'fittings', 'upvc-step-over-band', 'UPVC Step Over Bend', VALVE_BOX, `
    1/2"   | 20 | 28
    3/4"   | 20 | 33
    1"     | 15 | 50
    1-1/4" | 10 | 105`),
  p('upvc', 'fittings', 'upvc-band', 'UPVC Bend', VALVE_BOX, `
    1/2" | 25 | 20
    3/4" | 25 | 26
    1"   | 10 | 42`),
  p('upvc', 'fittings', 'upvc-thread-elbow', 'UPVC Thread Elbow', CLAMP, `
    1/2" | 70X8=560 | 560X3=1680 | 12.4`),
  p('upvc', 'valves', 'upvc-ball-valve-short', 'UPVC Ball Valve (Short)', VALVE_BOX, `
    1/2"   | 25X18=450 | 46
    3/4"   | 20X18=360 | 62
    1"     | 15X18=270 | 80
    1-1/4" | 10X18=180 | 118
    1-1/2" | 5X18=90   | 157
    2"     | 4X18=72   | 262`),
  p('upvc', 'valves', 'upvc-ball-valve-long', 'UPVC Ball Valve (Long)', VALVE_BOX, `
    1/2"   | 25X18=450 | 48
    3/4"   | 20X18=360 | 64
    1"     | 15X18=270 | 84
    1-1/4" | 10X18=180 | 123
    1-1/2" | 5X18=90   | 165
    2"     | 4X18=72   | 270`),
  p('upvc', 'valves', 'upvc-concealed-valve', 'UPVC Concealed Valve', VALVE_BOX, `
    1/2" | 1 Pcs. | 825
    3/4" | 1 Pcs. | 830
    1"   | 1 Pcs. | 925`),
  p('upvc', 'brass', 'upvc-brass-elbow', 'UPVC Brass Elbow', FITTING, `
    1/2"        | 50X10=500 | 500X3=1500 | 23
    3/4"        | 40X9=360  | 360X3=1080 | 31
    1"          | 20X10=200 | 200X3=600  | 51
    3/4" × 1/2" | 40X10=400 | 400X3=1200 | 25
    1" × 3/4"   | 30X9=270  | 270X3=810  | 40.5
    1" × 1/2"   | 30X9=270  | 270X3=810  | 28`),
  p('upvc', 'brass', 'upvc-brass-tee', 'UPVC Brass Tee', FITTING, `
    1/2"        | 40X9=360 | 360X3=1080 | 24.5
    3/4"        | 30X8=240 | 240X3=720  | 33
    1"          | 15X9=135 | 135X3=405  | 57
    3/4" × 1/2" | 30X9=270 | 270X3=810  | 27.5
    1" × 3/4"   | 20X8=160 | 160X3=480  | 44
    1" × 1/2"   | 20X8=160 | 160X3=480  | 32`),
  p('upvc', 'brass', 'upvc-brass-fta', 'UPVC Brass FTA', FITTING, `
    1/2"        | 70X10=700 | 700X3=2100 | 18.7
    3/4"        | 50X9=450  | 450X3=1350 | 26.4
    1"          | 30X10=300 | 300X3=900  | 43
    3/4" × 1/2" | 75X8=600  | 600X3=1800 | 19
    1" × 1/2"   | 50X8=400  | 400X3=1200 | 21
    1" × 3/4"   | 40X8=320  | 320X3=960  | 30`, { aka: 'Female threaded adaptor, brass insert' }),
  p('upvc', 'brass', 'upvc-brass-mta', 'UPVC Brass MTA', FITTING, `
    1/2"        | 70X10-700 | 700X3=2100 | 23.3
    3/4"        | 50X9=450  | 450X3=1350 | 37.5
    1"          | 30X10=300 | 300X3=900  | 56
    3/4" × 1/2" | 70X8=560  | 560X3=1680 | 25
    1" × 1/2"   | 50X8=400  | 400X3=1200 | 28.5
    1" × 3/4"   | 40X8=320  | 320X3=960  | 41`, { aka: 'Male threaded adaptor, brass insert' }),
  p('upvc', 'accessories', 'upvc-solvent', 'UPVC Solvent Cement', SOLVENT, `
    50 ml  | 24 | 24X16=384 | 60
    118 ml | 24 | 24X8=192  | 92
    250 ml | 15 | 15X8=120  | 170`),
  p('upvc', 'accessories', 'upvc-nail-clamp', 'UPVC Nail Clamp', CLAMP, `
    1/2"   | 100 | 100X35=3500 | 4
    3/4"   | 50  | 50X40=2000  | 5
    1"     | 50  | 50X35=1750  | 7
    1-1/4" | 25  | 25X40=1000  | 10
    1-1/2" | 20  | 20X40=800   | 14
    2"     | 20  | 20X40=800   | 18`),
  p('upvc', 'accessories', 'upvc-metal-clamp', 'UPVC Metal Clamp', CLAMP, `
    1/2"   | 100 | 100X35=3500 | 6
    3/4"   | 50  | 50X40=2000  | 8
    1"     | 50  | 50X35=1750  | 10
    1-1/4" | 25  | 25X40=1000  | 11
    1-1/2" | 20  | 20X40=800   | 15
    2"     | 20  | 20X40=800   | 20`),
  p('upvc', 'accessories', 'pp-long-plug', 'PP Long Plug (1/2")', PLUG, `
    Black solid | 100 | 100X50=5000 | 1
    White solid | 100 | 100X50=5000 | 1.5`),
];

/* ======================================================================
   CPVC
   ====================================================================== */
const cpvc = [
  p('cpvc', 'pipes', 'cpvc-pipe-sdr-11', 'CPVC Pipe SDR-11', pipeCols(5), `
    1/2"   | 15 mm | 0.35  | 75 | 0.570 | 75
    3/4"   | 20 mm | 0.620 | 60 | 1.03  | 50
    1"     | 25 mm | 1.010 | 40 | 1.630 | 30
    1-1/4" | 32 mm | 1.5   | 15 | 2.450 | 15
    1-1/2" | 40 mm | 2.1   | 15 | 3.500 | 15
    2"     | 50 mm | 3.4   | 10 | 5.660 | 10`),
  p('cpvc', 'pipes', 'cpvc-pipe-sdr-13-5', 'CPVC Pipe SDR-13.5', pipeCols(6), `
    1/2"   | 15 mm | 0.3   | 75 | 0.500 | 75
    3/4"   | 20 mm | 0.540 | 60 | 0.900 | 50
    1"     | 25 mm | 0.850 | 40 | 1.400 | 30
    1-1/4" | 32 mm | 1.280 | 15 | 2.13  | 15
    1-1/2" | 40 mm | 1.750 | 15 | 2.91  | 15
    2"     | 50 mm | 2.900 | 10 | 4.830 | 10`),
  p('cpvc', 'fittings', 'cpvc-plain-elbow', 'CPVC Plain Elbow', FITTING, `
    3/4"   | 100X7=700 | 700X3=2100 | 11.7
    1"     | 50X6=300  | 300X3=900  | 24
    1-1/4" | 15X10=150 | 150X3=450  | 40
    1-1/2" | 10X10=100 | 100X3=300  | 65`),
  p('cpvc', 'fittings', 'cpvc-plain-tee', 'CPVC Plain Tee', FITTING, `
    3/4"   | 75X7=525 | 525X3=1575 | 15
    1"     | 30X7=210 | 210X3=630  | 31
    1-1/4" | 15X9=135 | 135X3=405  | 53
    1-1/2" | 10X9=90  | 90X3=270   | 80`),
  p('cpvc', 'fittings', 'cpvc-fta', 'CPVC FTA', FITTING, `
    3/4" | 75X10=750 | 750X3=2250 | 11.3
    1"   | 50X9=450  | 450X3=1350 | 22`, { aka: 'Female threaded adaptor' }),
  p('cpvc', 'fittings', 'cpvc-mta', 'CPVC MTA', FITTING, `
    3/4" | 100X8=800 | 800X3=2400 | 11
    1"   | 75X8=600  | 600X3=1800 | 16`, { aka: 'Male threaded adaptor' }),
  p('cpvc', 'fittings', 'cpvc-coupler', 'CPVC Coupler', FITTING, `
    3/4"   | 100X12=1200 | 1200X3=3600 | 8
    1"     | 50X12=600   | 600X3=1800  | 13
    1-1/4" | 35X9=315    | 315X3=945   | 25
    1-1/2" | 25X8=200    | 200X3=600   | 40`),
  p('cpvc', 'fittings', 'cpvc-union', 'CPVC Union', FITTING, `
    3/4"   | 50X8=400  | 400X3=1200 | 45
    1"     | 25X8=200  | 200X3=600  | 65
    1-1/4" | 15X9=135  | 135X3=405  | 105
    1-1/2" | 10X10=100 | 100X3=300  | 140`),
  p('cpvc', 'fittings', 'cpvc-tank-nipple', 'CPVC Tank Nipple', FITTING, `
    3/4"   | 50X9=450 | 450X3=1350 | 38
    1"     | 40X9=360 | 360X3=1080 | 62
    1-1/4" | 25X9=225 | 225X3=675  | 89
    1-1/2" | 20X8=160 | 160X3=480  | 107`),
  p('cpvc', 'fittings', 'cpvc-end-cap', 'CPVC End Cap', FITTING, `
    3/4"   | 200X8=1600 | 1600X3=4800 | 7
    1"     | 150X8=1200 | 1200X3=3600 | 11
    1-1/4" | 70X9=630   | 630X3=1890  | 19
    1-1/2" | 50X10=500  | 500X3=1500  | 28`),
  p('cpvc', 'fittings', 'cpvc-reducer-coupler', 'CPVC Reducer Coupler', FITTING, `
    1" × 3/4"       | 75X7=525 | 525X3=1575 | 16.75
    1-1/4" × 3/4"   | 60X9=540 | 540X3=1620 | 21.7
    1-1/4" × 1"     | 50X9=450 | 450X3=1350 | 36.75
    1-1/2" × 3/4"   | 25X9=225 | 225X3=675  | 48.6
    1-1/2" × 1"     | 25X9=225 | 225X3=675  | 64.8`),
  p('cpvc', 'fittings', 'cpvc-reducer-tee', 'CPVC Reducer Tee', FITTING, `
    1" × 3/4"       | 40X6=240  | 240x3=720 | 33
    1-1/4" × 3/4"   | 10x10=150 | 150x3=450 | 70
    1-1/4" × 1"     | 20x8=160  | 160x3=480 | 65
    1-1/2" × 3/4"   | 10x9=90   | 90x3=270  | 98
    1-1/2" × 1"     | 10x9=90   | 90x3=270  | 107`),
  p('cpvc', 'fittings', 'cpvc-reducing-elbow', 'CPVC Reducing Elbow', FITTING, `
    1" × 3/4" | 50X8=400 | 400X3=1200 | 28`),
  p('cpvc', 'fittings', 'cpvc-45-elbow', 'CPVC 45° Elbow', FITTING, `
    3/4"   | 100X9=900 | 900X3=2700 | 19
    1"     | 60X9=540  | 540X3=1620 | 27
    1-1/4" | 25X9=225  | 225X3=675  | 50`),
  p('cpvc', 'fittings', 'cpvc-step-over-band', 'CPVC Step Over Bend', CLAMP, `
    3/4"   | 20 | 20X10=200 | 38
    1"     | 15 | 15X10=150 | 58
    1-1/4" | 10 | 10X10=100 | 104`),
  p('cpvc', 'fittings', 'cpvc-90-band', 'CPVC 90° Bend', CLAMP, `
    3/4" | 20 | 20X10=200 | 33
    1"   | 15 | 15X10=150 | 52`),
  p('cpvc', 'fittings', 'cpvc-transition-bush', 'CPVC Transition Bush', CLAMP, `
    1" × 3/4" | 200X8=600 | 600X3=1800 | 20`),
  p('cpvc', 'valves', 'cpvc-ball-valve', 'CPVC Ball Valve', MASTER_ONLY, `
    3/4"   | 20X18=360 | 135
    1"     | 12X18=216 | 197
    1-1/4" | 10X18=180 | 395
    1-1/2" | 6X18=108  | 600`),
  p('cpvc', 'valves', 'cpvc-concealed-valve', 'CPVC Concealed Valve', MASTER_ONLY, `
    3/4" | 1 Pcs | 925
    1"   | 1 Pcs | 950`),
  p('cpvc', 'brass', 'cpvc-brass-elbow', 'CPVC Brass Elbow', FITTING, `
    1"          | 25X9=225  | 225X3=675  | 84
    3/4" × 1/2" | 50X12=600 | 600X3=1800 | 34
    1" × 1/2"   | 40X12=480 | 480X3=1440 | 44`),
  p('cpvc', 'brass', 'cpvc-brass-tee', 'CPVC Brass Tee', FITTING, `
    1"          | 20X8=160 | 160X3=480  | 89
    3/4" × 1/2" | 50X8=400 | 400X3=1200 | 38
    1" × 1/2"   | 30X8=240 | 240X3=720  | 48`),
  p('cpvc', 'brass', 'cpvc-brass-fta', 'CPVC Brass FTA', FITTING, `
    3/4"        | 30*10=300 | 300X3=900  | 50
    1"          | 25X10=250 | 250X3=750  | 76
    3/4" × 1/2" | 50X16=800 | 800X3=2400 | 33
    1" × 1/2"   | 50X14=700 | 700X3=2100 | 38
    1" × 3/4"   | 40X14=560 | 560X3=1680 | 63`, { aka: 'Female threaded adaptor, brass insert' }),
  p('cpvc', 'brass', 'cpvc-brass-mta', 'CPVC Brass MTA', FITTING, `
    3/4"        | 30X10=300 | 300X3=900  | 61
    1"          | 25X10=250 | 250X3=750  | 95
    3/4" × 1/2" | 50X14=900 | 900X3=2100 | 40
    1" × 1/2"   | 50X12=600 | 600X3=1800 | 46
    1" × 3/4"   | 40X12=480 | 480X3=1440 | 75`, { aka: 'Male threaded adaptor, brass insert' }),
  p('cpvc', 'accessories', 'cpvc-solvent', 'CPVC Solvent Cement', SOLVENT_MASTER, `
    50 ml  | 50X9=400 | 77
    118 ml | 25X8=200 | 132
    250 ml | 16X8=128 | 246`),
];

/* ======================================================================
   AGRI / GARDEN PIPES (all 30 m coils)
   ====================================================================== */
const garden = [
  p('agri', 'pipes', 'garden-transparent-zibra-petrol', 'Transparent / Zibra / Petrol Garden Pipe', GARDEN, `
    1/2"   | 30 | 3.50 TO 3.80   | 85
    3/4"   | 30 | 5.00 TO 5.40   | 85
    1"     | 30 | 7.30 TO 7.70   | 85
    1-1/4" | 30 | 11.50 TO 11.70 | 85`, { colours: [['Pink', '#ff4f9a'], ['Orange', '#ff7a1a'], ['Green', '#3fbf3a'], ['Amber', '#d7a640']].map(([name, hex]) => ({ name, hex })) }),
  p('agri', 'pipes', 'garden-halwa-dual', 'Halwa / Dual Garden Pipe', GARDEN, `
    1/2"   | 30 | 3.50 TO 3.80   | 85
    3/4"   | 30 | 5.00 TO 5.40   | 85
    1"     | 30 | 7.30 TO 7.70   | 85
    1-1/4" | 30 | 11.50 TO 11.70 | 85`, { colours: [['Orange', '#ff7a1a'], ['Green', '#5ad02b'], ['Pink', '#ff3d8b'], ['Yellow', '#f5d31d']].map(([name, hex]) => ({ name, hex })) }),
  p('agri', 'pipes', 'garden-blue-metallic', 'Blue Metallic Garden Pipe', GARDEN, `
    1/2"   | 30 | 3.50 TO 4.00   | 90
    3/4"   | 30 | 7.00 TO 7.40   | 90
    1"     | 30 | 9.00 TO 9.40   | 90
    1-1/4" | 30 | 12.00 TO 12.50 | 90`, { colours: [['Metallic blue', '#2fb3d6']].map(([name, hex]) => ({ name, hex })) }),
  p('agri', 'pipes', 'garden-colour-virgin', 'Colour Virgin / Transparent Garden Pipe', GARDEN, `
    1/2"   | 30 | 3.50 TO 3.80   | 85
    3/4"   | 30 | 5.00 TO 5.40   | 85
    1"     | 30 | 7.30 TO 7.70   | 85
    1-1/4" | 30 | 11.50 TO 11.70 | 85`, { colours: [['Yellow', '#f2e21b'], ['Pink', '#ff2e7e'], ['Green', '#27b24a']].map(([name, hex]) => ({ name, hex })) }),
  p('agri', 'pipes', 'garden-contractor', 'Contractor Garden Pipe', GARDEN, `
    1/2"   | 30 | 3.50 TO 4.00   | 112
    3/4"   | 30 | 7.00 TO 7.40   | 112
    1"     | 30 | 9.00 TO 9.40   | 112
    1-1/4" | 30 | 12.00 TO 12.50 | 112`, { colours: [['Green', '#7ed957']].map(([name, hex]) => ({ name, hex })) }),
  p('agri', 'pipes', 'garden-level-pipe', 'Level Pipe', GARDEN, `
    1/4"  | 30 | 0.80 TO 1.00 | 120
    5/16" | 30 | 1.20 TO 1.50 | 120
    3/8"  | 30 | 1.80 TO 2.00 | 120
    5/8"  | 30 | 3.80 TO 4.30 | 120`, { colours: [['Clear', '#c9d4f2']].map(([name, hex]) => ({ name, hex })) }),
];

/**
 * Printed catalogue page number (1-6) for each product, for QA against the PDF.
 * PDF page = catalogue page + 1 (PDF page 1 is the cover).
 */
const PAGES = {
  1: ['upvc-pipe-sch-40', 'upvc-pipe-sch-80', 'upvc-plain-elbow', 'upvc-plain-tee', 'upvc-plain-fta', 'upvc-plain-mta',
      'upvc-coupler', 'upvc-union', 'upvc-tank-nipple-socket', 'upvc-pipe-tank-nipple'],
  2: ['upvc-tank-nipple-thread', 'upvc-end-cap', 'upvc-reducing-elbow', 'upvc-reducing-tee', 'upvc-reducer', 'upvc-45-elbow',
      'upvc-ball-valve-short', 'upvc-ball-valve-long', 'upvc-four-way-tee', 'upvc-reducing-bush', 'upvc-step-over-band', 'upvc-band'],
  3: ['upvc-solvent', 'pp-long-plug', 'upvc-nail-clamp', 'upvc-thread-elbow', 'upvc-metal-clamp', 'upvc-concealed-valve',
      'upvc-brass-elbow', 'upvc-brass-tee', 'upvc-brass-fta', 'upvc-brass-mta'],
  4: ['cpvc-pipe-sdr-11', 'cpvc-pipe-sdr-13-5', 'cpvc-plain-elbow', 'cpvc-plain-tee', 'cpvc-fta', 'cpvc-mta', 'cpvc-coupler',
      'cpvc-union', 'cpvc-tank-nipple', 'cpvc-end-cap', 'cpvc-reducer-coupler', 'cpvc-reducer-tee'],
  5: ['cpvc-reducing-elbow', 'cpvc-45-elbow', 'cpvc-ball-valve', 'cpvc-solvent', 'cpvc-step-over-band', 'cpvc-90-band',
      'cpvc-concealed-valve', 'cpvc-transition-bush', 'cpvc-brass-elbow', 'cpvc-brass-tee', 'cpvc-brass-fta', 'cpvc-brass-mta'],
  6: ['garden-transparent-zibra-petrol', 'garden-halwa-dual', 'garden-blue-metallic', 'garden-colour-virgin',
      'garden-contractor', 'garden-level-pipe'],
};

export const products = [...upvc, ...cpvc, ...garden].map((prod) => {
  const page = Number(Object.keys(PAGES).find((pg) => PAGES[pg].includes(prod.slug)));
  if (!page) throw new Error(`No catalogue page for ${prod.slug}`);
  return { ...prod, page };
});

export const categories = CATEGORY_DEFS.map(([line, type, name, description, short]) => {
  const id = categoryId(line, type);
  const first = products.find((prod) => prod.category === id);
  return { id, name, short, line, type, slug: id, description, image: first.image };
});

/** Terms & conditions as printed in the catalogue (typos fixed). */
export const TERMS = [
  'GST extra.',
  'Subject to Rajkot jurisdiction.',
  'Payment in advance / immediate only.',
  'Goods are sent by transport at the buyer’s risk.',
  'Packing & forwarding charges extra. E.&O.E.',
];

/* ---------- Helpers ---------- */
export const getLine = (id) => lines.find((l) => l.id === id);
export const getCategory = (id) => categories.find((c) => c.id === id);
export const getProduct = (slug) => products.find((prod) => prod.slug === slug);
export const byLine = (id) => products.filter((prod) => prod.line === id);
export const byCategory = (id) => products.filter((prod) => prod.category === id);

/** Size label of a row: the value of the product's first column. */
export const rowLabel = (prod, row) => row[prod.columns[0].key];

/** First and last size of a product, e.g. '1/2" – 2"'. */
export const sizeRange = (prod) => {
  const sizes = prod.rows.map((row) => rowLabel(prod, row));
  return sizes.length > 1 ? `${sizes[0]} – ${sizes[sizes.length - 1]}` : sizes[0];
};
