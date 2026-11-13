export interface VehicleColor {
  name: string;
  hex: string;
  accentHex?: string;
  description: string;
}

export interface VehicleSpec {
  label: string;
  value: string;
  sub?: string;
}

export interface VehicleVariant {
  name: string;
  batteryKwh: number;
  rangeKm: number;
  topSpeedKmh: number;
  priceINR: number;
  description: string;
}

export interface Vehicle {
  id: string;
  slug: string;
  modelCode: string;
  manufacturer: string;
  name: string;
  tagline: string;
  category: 'scooters' | 'bikes' | 'cycles' | 'jeeps';
  categoryLabel: string;
  isConcept: boolean;
  isBookable: boolean;
  statusBadge: string;
  exShowroomPriceINR: number | null;
  estimatedOnRoadINR: number | null;
  bookingAmountINR: number | null;
  voucherRedeemLimitINR: number | null;
  batteryCapacityKwh: number;
  rangeKm: number;
  topSpeedKmh: number;
  acceleration0to40: string;
  chargingTimeHours: number;
  motorPowerPeak: string;
  warranty: string;
  imageUrl: string;
  galleryImages: string[];
  colors: VehicleColor[];
  specs: VehicleSpec[];
  variants?: VehicleVariant[];
  highlights: string[];
  powertrain: string;
}

// -----------------------------------------------------------------------------
// ELECTRIC SCOOTERS (Flagship Ola / Ather UX Benchmark)
// -----------------------------------------------------------------------------
export const ELECTRIC_SCOOTERS: Vehicle[] = [
  {
    id: 'scooter-s1-pro',
    slug: 'scooter-s1-pro',
    modelCode: 'ASKR-S1-PRO',
    manufacturer: 'ASKR EV Mobility',
    name: 'ASKR S1 Pro',
    tagline: 'Hyper-Performance Connected Electric Scooter',
    category: 'scooters',
    categoryLabel: 'Electric Scooter',
    isConcept: false,
    isBookable: false, // Illustrative commercial model reference
    statusBadge: 'Showroom Showcase',
    exShowroomPriceINR: 129999,
    estimatedOnRoadINR: 147500,
    bookingAmountINR: 4999,
    voucherRedeemLimitINR: null,
    batteryCapacityKwh: 4.0,
    rangeKm: 195,
    topSpeedKmh: 120,
    acceleration0to40: '2.6 sec',
    chargingTimeHours: 6.5,
    motorPowerPeak: '11 kW Peak (Mid-Drive IPM)',
    warranty: '8-Year / 80,000 km Battery Warranty',
    imageUrl: '/images/vehicles/scooter-s1-pro.jpg',
    galleryImages: [
      '/images/vehicles/scooter-s1-pro.jpg',
      '/images/vehicles/scooter-hero.jpg',
    ],
    powertrain: 'Interior Permanent Magnet (IPM) Motor • Mid-Drive Architecture',
    colors: [
      { name: 'Porcelain White', hex: '#F8FAFC', description: 'Gloss automotive pearl finish' },
      { name: 'Stellar Blue', hex: '#165DAD', description: 'Deep metallic sapphire finish' },
      { name: 'Midnight Obsidian', hex: '#111827', description: 'High-contrast gloss black' },
    ],
    specs: [
      { label: 'Certified IDC Range', value: '195 km', sub: 'Eco Mode Commute' },
      { label: 'True Urban Range', value: '143 km', sub: 'Normal City Traffic' },
      { label: 'Top Speed', value: '120 km/h', sub: 'Hyper Acceleration Mode' },
      { label: '0-40 km/h', value: '2.6 sec', sub: 'Instant Electric Launch' },
      { label: 'Battery Capacity', value: '4.0 kWh', sub: 'IP67 Sealed Aluminium Pack' },
      { label: 'Home Charging', value: '6.5 hrs', sub: '0-100% via 750W Portable Charger' },
      { label: 'Underseat Storage', value: '34 Litres', sub: 'Accommodates 2 Open Helmets' },
      { label: 'Smart Cluster', value: '7" Touchscreen', sub: 'MoveOS with Turn-by-Turn GPS' },
    ],
    variants: [
      { name: 'S1 Pro 4kWh', batteryKwh: 4.0, rangeKm: 195, topSpeedKmh: 120, priceINR: 129999, description: 'Hyper mode, cruise control, 11kW peak power' },
      { name: 'S1 Air 3kWh', batteryKwh: 3.0, rangeKm: 151, topSpeedKmh: 90, priceINR: 104999, description: 'Telescopic front forks, hub motor, 6kW peak power' },
    ],
    highlights: [
      'Proximity keyless unlock via Bluetooth phone integration and passcode',
      'Electronic cruise control and hill-hold assist for effortless urban riding',
      'Regenerative deceleration recovering energy during city stop-and-go',
      'Party mode with dual built-in surround sound speakers and concert lighting',
    ],
  },
  {
    id: 'scooter-s1-air',
    slug: 'scooter-s1-air',
    modelCode: 'ASKR-S1-AIR',
    manufacturer: 'ASKR EV Mobility',
    name: 'ASKR S1 Air',
    tagline: 'Ultra-Efficient Daily Urban Commuter',
    category: 'scooters',
    categoryLabel: 'Electric Scooter',
    isConcept: false,
    isBookable: false,
    statusBadge: 'Showroom Showcase',
    exShowroomPriceINR: 104999,
    estimatedOnRoadINR: 118200,
    bookingAmountINR: 2999,
    voucherRedeemLimitINR: null,
    batteryCapacityKwh: 3.0,
    rangeKm: 151,
    topSpeedKmh: 90,
    acceleration0to40: '3.3 sec',
    chargingTimeHours: 5.0,
    motorPowerPeak: '6.0 kW Peak (Hub Motor)',
    warranty: '8-Year / 80,000 km Battery Warranty',
    imageUrl: '/images/vehicles/scooter-s1-air.jpg',
    galleryImages: [
      '/images/vehicles/scooter-s1-air.jpg',
      '/images/vehicles/scooter-hero.jpg',
    ],
    powertrain: 'Efficient Hub Motor • 6.0 kW Peak Power',
    colors: [
      { name: 'Glacier Silver', hex: '#E2E8F0', description: 'Brushed metallic silver' },
      { name: 'Coral Red', hex: '#EF4444', description: 'Vibrant sport red' },
      { name: 'Jet Black', hex: '#1E293B', description: 'Matte dark carbon finish' },
    ],
    specs: [
      { label: 'Certified IDC Range', value: '151 km', sub: 'Eco Commuter Cycle' },
      { label: 'Top Speed', value: '90 km/h', sub: 'Sports Mode' },
      { label: '0-40 km/h', value: '3.3 sec', sub: 'City Responsive Torque' },
      { label: 'Battery Capacity', value: '3.0 kWh', sub: 'Integrated Lightweight Module' },
      { label: 'Charging Time', value: '5.0 hrs', sub: 'Standard Home Socket' },
      { label: 'Suspension', value: 'Dual Telescopic', sub: 'Front Forks + Rear Twin Shocks' },
    ],
    highlights: [
      'Twin telescopic front suspension engineered for rugged city roads',
      'Flat floorboard design with generous legroom and cargo capacity',
      'Digital 7-inch display with integrated navigation and cloud profiles',
      'Ultra-low running cost: less than ₹0.25 per kilometer in daily operation',
    ],
  },
];

// -----------------------------------------------------------------------------
// ELECTRIC MOTORCYCLES (Live Verified Database Inventory & Fleet)
// -----------------------------------------------------------------------------
export const ELECTRIC_MOTORCYCLES: Vehicle[] = [
  {
    id: 'e08078e1-47f8-4073-81f5-5b670f59198e',
    slug: 'thunder-pro',
    modelCode: 'ASKR-THUNDER-PRO',
    manufacturer: 'ASKR EV Mobility',
    name: 'ASKR Thunder Pro',
    tagline: 'High-Torque Performance Urban Streetfighter',
    category: 'bikes',
    categoryLabel: 'Electric Motorcycle',
    isConcept: false,
    isBookable: true, // Live DB product with booking enabled!
    statusBadge: 'Bookings Open',
    exShowroomPriceINR: 125000,
    estimatedOnRoadINR: 139500,
    bookingAmountINR: 5000,
    voucherRedeemLimitINR: 15000,
    batteryCapacityKwh: 3.8,
    rangeKm: 135,
    topSpeedKmh: 95,
    acceleration0to40: '3.2 sec',
    chargingTimeHours: 3.5,
    motorPowerPeak: '6.0 kW Peak (PMSM Mid-Drive)',
    warranty: '5-Year / 60,000 km Motor & Battery Warranty',
    imageUrl: '/images/vehicles/thunder-pro.jpg',
    galleryImages: [
      '/images/vehicles/thunder-pro.jpg',
      '/images/vehicles/motorcycle-hero.jpg',
    ],
    powertrain: 'Permanent Magnet Synchronous Motor (PMSM) • 78 Nm Instant Torque',
    colors: [
      { name: 'Sapphire Blue', hex: '#165DAD', description: 'Deep corporate metallic blue' },
      { name: 'Carbon Black', hex: '#111827', description: 'Matte woven carbon body panels' },
    ],
    specs: [
      { label: 'Certified Range', value: '135 km', sub: 'IDC City Commute' },
      { label: 'Top Speed', value: '95 km/h', sub: 'Sport Dynamic Mode' },
      { label: 'Battery Capacity', value: '3.8 kWh', sub: 'IP67 Water-Resistant Pack' },
      { label: 'Fast Charge', value: '3.5 hrs', sub: '0-80% via Fast Wallbox' },
      { label: 'Peak Torque', value: '78 Nm', sub: 'Instant Wheel Torque' },
      { label: 'Braking System', value: 'Dual CBS Disc', sub: 'Combined Hydraulic Regenerative' },
    ],
    highlights: [
      'Permanent Magnet Synchronous Motor (PMSM) with liquid-cooled controller',
      'Advanced Cloud Telemetry with real-time GPS tracking and geofencing',
      'High-strength tubular steel trellis frame for agile highway dynamics',
      'Dual CBS hydraulic disc brakes with integrated regenerative deceleration',
    ],
  },
  {
    id: '2b290c86-749d-480e-8f82-6f7122936e97',
    slug: 'city-cruise',
    modelCode: 'ASKR-CITY-CRUISE',
    manufacturer: 'ASKR EV Mobility',
    name: 'ASKR City Cruise',
    tagline: 'Ultra-Efficient Daily City Commuter Motorcycle',
    category: 'bikes',
    categoryLabel: 'Electric Motorcycle',
    isConcept: false,
    isBookable: true, // Live DB product with booking enabled!
    statusBadge: 'Bookings Open',
    exShowroomPriceINR: 89000,
    estimatedOnRoadINR: 99800,
    bookingAmountINR: 3000,
    voucherRedeemLimitINR: 10000,
    batteryCapacityKwh: 2.5,
    rangeKm: 90,
    topSpeedKmh: 70,
    acceleration0to40: '4.1 sec',
    chargingTimeHours: 2.8,
    motorPowerPeak: '3.5 kW Peak (BLDC)',
    warranty: '3-Year / 40,000 km Warranty',
    imageUrl: '/images/vehicles/city-cruise.jpg',
    galleryImages: [
      '/images/vehicles/city-cruise.jpg',
      '/images/vehicles/motorcycle-hero.jpg',
    ],
    powertrain: 'High-Efficiency BLDC Drive • 45 Nm Peak Torque',
    colors: [
      { name: 'Titanium Silver', hex: '#94A3B8', description: 'Brushed alloy silver' },
      { name: 'Obsidian Black', hex: '#111827', description: 'Deep high-gloss finish' },
    ],
    specs: [
      { label: 'Certified Range', value: '90 km', sub: 'Daily Urban Flow' },
      { label: 'Top Speed', value: '70 km/h', sub: 'Optimized Speed Profile' },
      { label: 'Battery Capacity', value: '2.5 kWh', sub: 'Portable Fast-Swap Module' },
      { label: 'Charging Time', value: '2.8 hrs', sub: 'Home 15A Socket' },
      { label: 'Kerb Weight', value: '108 kg', sub: 'Lightweight Agile Frame' },
      { label: 'Suspension', value: 'Telescopic', sub: 'Hydraulic Dampened' },
    ],
    highlights: [
      'Portable quick-swap battery module enabling convenient apartment charging',
      'Ultra-lightweight aerospace alloy frame for effortless city filtering',
      'Keyless push-to-start with anti-theft acoustic alarm and motor lock',
      'Dual telescopic front suspension engineered for challenging city tarmac',
    ],
  },
  {
    id: '22c9999e-5f97-449f-bf26-e2169dd74d7f',
    slug: 'apex-sport',
    modelCode: 'ASKR-APEX-SPORT',
    manufacturer: 'ASKR EV Mobility',
    name: 'ASKR Apex Sport',
    tagline: 'Track-Inspired Speed & Telemetry Superbike',
    category: 'bikes',
    categoryLabel: 'Electric Motorcycle',
    isConcept: false,
    isBookable: true, // Live DB product with booking enabled!
    statusBadge: 'Bookings Open',
    exShowroomPriceINR: 165000,
    estimatedOnRoadINR: 184000,
    bookingAmountINR: 10000,
    voucherRedeemLimitINR: 30000,
    batteryCapacityKwh: 5.2,
    rangeKm: 175,
    topSpeedKmh: 120,
    acceleration0to40: '2.4 sec',
    chargingTimeHours: 4.0,
    motorPowerPeak: '10.5 kW Peak (Liquid-Cooled PMSM)',
    warranty: '5-Year / 75,000 km Warranty',
    imageUrl: '/images/vehicles/apex-sport.jpg',
    galleryImages: [
      '/images/vehicles/apex-sport.jpg',
      '/images/vehicles/motorcycle-hero.jpg',
    ],
    powertrain: 'Liquid-Cooled Mid-Mounted PMSM • 105 Nm Wheel Torque',
    colors: [
      { name: 'Racing Green', hex: '#15803D', description: 'Heritage metallic green' },
      { name: 'Carbon Graphite', hex: '#1E293B', description: 'Matte woven carbon panels' },
    ],
    specs: [
      { label: 'Certified Range', value: '175 km', sub: 'Extended Touring Range' },
      { label: 'Top Speed', value: '120 km/h', sub: 'Track Mode Dynamic' },
      { label: 'Battery Capacity', value: '5.2 kWh', sub: 'Active Thermal Management' },
      { label: 'Fast Charge', value: '4.0 hrs', sub: 'CCS2 Compatible' },
      { label: '0-60 km/h', value: '3.1 sec', sub: 'Instant Track Launch' },
      { label: 'Instrumentation', value: '7" TFT Dash', sub: 'Cornering ABS & IMU Telemetry' },
    ],
    highlights: [
      'High-performance liquid-cooled PMSM motor delivering 10.5 kW peak power',
      'Advanced 6-axis IMU with Cornering CBS and multi-level Traction Control',
      'Inverted front forks with preload adjustable nitrogen rear monoshock',
      'Aerodynamic fairing reducing drag coefficient by 18% at high cruising speeds',
    ],
  },
];

// -----------------------------------------------------------------------------
// ELECTRIC CYCLES (Hero Lectro / EMotorad Benchmark)
// -----------------------------------------------------------------------------
export const ELECTRIC_CYCLES: Vehicle[] = [
  {
    id: 'cycle-aerotrek-c1',
    slug: 'aerotrek-c1',
    modelCode: 'ASKR-AEROTREK-C1',
    manufacturer: 'ASKR EV Mobility',
    name: 'ASKR AeroTrek C1',
    tagline: 'Ultralight Hydroformed Carbon Commuter E-Bike',
    category: 'cycles',
    categoryLabel: 'Electric Cycle',
    isConcept: true,
    isBookable: false,
    statusBadge: 'Pre-Production Showcase',
    exShowroomPriceINR: 42000,
    estimatedOnRoadINR: 44500,
    bookingAmountINR: null,
    voucherRedeemLimitINR: null,
    batteryCapacityKwh: 0.75,
    rangeKm: 85,
    topSpeedKmh: 35,
    acceleration0to40: '4.5s (0-25 km/h)',
    chargingTimeHours: 2.0,
    motorPowerPeak: '250W Nominal / 600W Peak',
    warranty: '2-Year Frame & Electricals Warranty',
    imageUrl: '/images/vehicles/aerotrek-c1.jpg',
    galleryImages: [
      '/images/vehicles/aerotrek-c1.jpg',
      '/images/vehicles/cycle-hero.jpg',
    ],
    powertrain: 'Integrated Mid-Drive Smart Torque Sensor Motor',
    colors: [
      { name: 'Stealth Carbon', hex: '#111827', description: 'Matte carbon finish' },
      { name: 'Brushed Alloy', hex: '#E2E8F0', description: 'Aerospace alloy silver' },
    ],
    specs: [
      { label: 'Assisted Range', value: '85 km', sub: 'Pedal Assist Level 1' },
      { label: 'Assisted Speed', value: '35 km/h', sub: 'Compliant Urban Flow' },
      { label: 'Battery Capacity', value: '750 Wh', sub: 'Integrated Concealed Downtube' },
      { label: 'Weight', value: '14.8 kg', sub: 'Ultralight Aero Monocoque' },
      { label: 'Drivetrain', value: 'Gates CDX Belt', sub: 'Quiet Oil-Free Carbon Belt' },
      { label: 'Brakes', value: 'Hydraulic Disc', sub: '160mm Dual Rotors' },
    ],
    highlights: [
      'Aero-profile hydroformed alloy frame with internal concealed cable routing',
      'Maintenance-free Gates Carbon Drive belt replacing oily chains',
      'Integrated stem OLED display showing real-time speed, battery, and cadence',
      'Dual hydraulic disc brakes ensuring instantaneous stopping in wet weather',
    ],
  },
  {
    id: 'cycle-aerotrek-trail',
    slug: 'aerotrek-trail',
    modelCode: 'ASKR-AEROTREK-TRAIL',
    manufacturer: 'ASKR EV Mobility',
    name: 'ASKR AeroTrek Trail',
    tagline: 'Hardtail All-Terrain Expedition Electric Mountain Bike',
    category: 'cycles',
    categoryLabel: 'Electric Cycle',
    isConcept: true,
    isBookable: false,
    statusBadge: 'Pre-Production Showcase',
    exShowroomPriceINR: 49000,
    estimatedOnRoadINR: 52000,
    bookingAmountINR: null,
    voucherRedeemLimitINR: null,
    batteryCapacityKwh: 0.9,
    rangeKm: 95,
    topSpeedKmh: 35,
    acceleration0to40: '4.2s (0-25 km/h)',
    chargingTimeHours: 2.5,
    motorPowerPeak: '350W Nominal / 750W Peak',
    warranty: '2-Year Warranty',
    imageUrl: '/images/vehicles/aerotrek-trail.jpg',
    galleryImages: [
      '/images/vehicles/aerotrek-trail.jpg',
      '/images/vehicles/cycle-hero.jpg',
    ],
    powertrain: 'High-Torque Hub Assist • 65 Nm Peak',
    colors: [
      { name: 'Matte Olive', hex: '#365314', description: 'Trail camouflage finish' },
      { name: 'Slate Grey', hex: '#475569', description: 'Anodized graphite' },
    ],
    specs: [
      { label: 'Assisted Range', value: '95 km', sub: 'Trail Assist Mode' },
      { label: 'Front Suspension', value: '120mm Air Fork', sub: 'Hydraulic Lockout' },
      { label: 'Battery Capacity', value: '900 Wh', sub: 'High-Capacity Lithium Module' },
      { label: 'Tires', value: '29" x 2.4"', sub: 'Puncture-Resistant Tubeless' },
    ],
    highlights: [
      '120mm travel front suspension fork with remote lockout for mountain trails',
      'Wide 29-inch knobby tires providing exceptional traction on dirt and gravel',
      'High-capacity removable battery pack for remote expedition recharging',
    ],
  },
];

// -----------------------------------------------------------------------------
// ELECTRIC JEEPS / 4x4 SUVS (Mahindra Thar.e / Tata EV Benchmark)
// -----------------------------------------------------------------------------
export const ELECTRIC_JEEPS: Vehicle[] = [
  {
    id: 'jeep-terramax-4x4',
    slug: 'terramax-4x4',
    modelCode: 'ASKR-TERRAMAX-4X4',
    manufacturer: 'ASKR EV Mobility',
    name: 'ASKR TerraMax 4x4',
    tagline: 'Dual-Motor All-Terrain Electric Overland Adventure SUV',
    category: 'jeeps',
    categoryLabel: 'Electric Jeep',
    isConcept: true,
    isBookable: false,
    statusBadge: 'Pre-Production Concept',
    exShowroomPriceINR: 1850000,
    estimatedOnRoadINR: 1980000,
    bookingAmountINR: null,
    voucherRedeemLimitINR: null,
    batteryCapacityKwh: 48.0,
    rangeKm: 380,
    topSpeedKmh: 145,
    acceleration0to40: '2.9 sec (0-60 km/h: 5.6s)',
    chargingTimeHours: 6.5,
    motorPowerPeak: '180 kW Dual-Motor All-Wheel Drive',
    warranty: '8-Year / 160,000 km High-Voltage Battery Warranty',
    imageUrl: '/images/vehicles/terramax-4x4.jpg',
    galleryImages: [
      '/images/vehicles/terramax-4x4.jpg',
      '/images/vehicles/jeep-hero.jpg',
    ],
    powertrain: 'Dual-Motor Electronic All-Wheel Drive with Torque Vectoring',
    colors: [
      { name: 'Metallic Charcoal', hex: '#334155', description: 'Armored metallic graphite' },
      { name: 'Arctic White', hex: '#F8FAFC', description: 'Clean white adventure pack' },
      { name: 'Obsidian Black', hex: '#111827', description: 'Tactical blacked-out finish' },
    ],
    specs: [
      { label: 'Certified Range', value: '380 km', sub: 'WLTP Real-World Cycle' },
      { label: 'Drivetrain', value: 'Dual AWD', sub: 'Electronic Locking Differentials' },
      { label: 'Battery Capacity', value: '48.0 kWh', sub: 'Reinforced Underbody Steel Shield' },
      { label: 'Ground Clearance', value: '240 mm', sub: 'Class-Leading Water Wading 650mm' },
      { label: 'DC Fast Charge', value: '38 mins', sub: '10-80% via 60 kW DC Charger' },
      { label: 'Vehicle-to-Load', value: '3.3 kW V2L', sub: 'Powers Camp Gear & Power Tools' },
    ],
    highlights: [
      'Dual-motor electric all-wheel drive with instant computerized torque split',
      'Structural underbody skid shield protecting the high-voltage battery architecture',
      'Overland modular roof rack with integrated quad high-output LED illuminators',
      'V2L bidirectional power exporting 3.3 kW AC electricity for outdoor expeditions',
    ],
  },
  {
    id: 'jeep-terramax-urban',
    slug: 'terramax-urban',
    modelCode: 'ASKR-TERRAMAX-URBAN',
    manufacturer: 'ASKR EV Mobility',
    name: 'ASKR TerraMax Urban',
    tagline: 'Compact 5-Door Electric Lifestyle Utility Crossover',
    category: 'jeeps',
    categoryLabel: 'Electric Jeep',
    isConcept: true,
    isBookable: false,
    statusBadge: 'Pre-Production Concept',
    exShowroomPriceINR: 1450000,
    estimatedOnRoadINR: 1560000,
    bookingAmountINR: null,
    voucherRedeemLimitINR: null,
    batteryCapacityKwh: 36.0,
    rangeKm: 310,
    topSpeedKmh: 130,
    acceleration0to40: '3.4 sec',
    chargingTimeHours: 5.5,
    motorPowerPeak: '120 kW Single Motor RWD',
    warranty: '8-Year Battery Warranty',
    imageUrl: '/images/vehicles/terramax-urban.jpg',
    galleryImages: [
      '/images/vehicles/terramax-urban.jpg',
      '/images/vehicles/jeep-hero.jpg',
    ],
    powertrain: 'Permanent Magnet Synchronous Rear-Wheel Drive',
    colors: [
      { name: 'Ceramic White', hex: '#F8FAFC', description: 'Clean modern ceramic' },
      { name: 'Deep Graphite', hex: '#1E293B', description: 'Stealth charcoal finish' },
    ],
    specs: [
      { label: 'Certified Range', value: '310 km', sub: 'Urban Daily Riding' },
      { label: 'Top Speed', value: '130 km/h', sub: 'Highway Dynamic Mode' },
      { label: 'Battery Capacity', value: '36.0 kWh', sub: 'LFP Thermal Stable Cells' },
      { label: 'Seating', value: '5 Adults', sub: 'Spacious Cabin & Boot' },
    ],
    highlights: [
      'Compact footprint perfect for city parking while retaining high SUV stance',
      'LFP battery chemistry with exceptional cycle life and thermal stability',
      'Connected digital cockpit with wireless Apple CarPlay and Android Auto',
    ],
  },
];

// Complete fleet
export const ALL_CATALOG_VEHICLES: Vehicle[] = [
  ...ELECTRIC_SCOOTERS,
  ...ELECTRIC_MOTORCYCLES,
  ...ELECTRIC_CYCLES,
  ...ELECTRIC_JEEPS,
];

export function getVehicleBySlugOrCode(slugOrCode: string): Vehicle | undefined {
  const norm = slugOrCode.toUpperCase();
  return ALL_CATALOG_VEHICLES.find(
    (v) =>
      v.slug.toUpperCase() === norm ||
      v.modelCode.toUpperCase() === norm ||
      v.id.toLowerCase() === slugOrCode.toLowerCase()
  );
}
