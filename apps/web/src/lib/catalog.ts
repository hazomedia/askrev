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

export interface Vehicle {
  id: string;
  modelCode: string;
  name: string;
  tagline: string;
  category: 'bikes' | 'cycles' | 'jeeps';
  categoryLabel: string;
  isConcept: boolean;
  conceptBadge?: string;
  batteryCapacityKwh: number;
  rangeKm: number;
  topSpeedKmh: number;
  chargingTimeHours: number;
  exShowroomPriceINR: number | null;
  bookingAmountINR: number | null;
  voucherRedeemLimitINR: number | null;
  imageUrl: string;
  isAvailable: boolean;
  colors: VehicleColor[];
  specs: VehicleSpec[];
  highlights: string[];
  powertrain: string;
}

export const VERIFIED_ELECTRIC_BIKES: Vehicle[] = [
  {
    id: 'e08078e1-47f8-4073-81f5-5b670f59198e',
    modelCode: 'ASKR-THUNDER-PRO',
    name: 'ASKR Thunder Pro',
    tagline: 'High-Torque Performance Urban Commuter',
    category: 'bikes',
    categoryLabel: 'Electric Bike',
    isConcept: false,
    conceptBadge: 'Production Model',
    batteryCapacityKwh: 3.8,
    rangeKm: 135,
    topSpeedKmh: 95,
    chargingTimeHours: 3.5,
    exShowroomPriceINR: 125000,
    bookingAmountINR: 5000,
    voucherRedeemLimitINR: 15000,
    imageUrl: '/images/bikes/thunder-pro.svg',
    isAvailable: true,
    powertrain: 'Permanent Magnet Synchronous Motor (PMSM) • 6.0 kW Peak',
    colors: [
      { name: 'Sapphire Blue', hex: '#165DAD', accentHex: '#0F3B6C', description: 'Deep metallic blue with high-gloss automotive finish' },
      { name: 'Carbon Black', hex: '#0F172A', accentHex: '#334155', description: 'Matte stealth finish with obsidian undertones' },
      { name: 'Cyber Lime', hex: '#C9FF36', accentHex: '#A3E635', description: 'Electric lime telemetry highlights' },
    ],
    specs: [
      { label: 'Certified Range', value: '135 km', sub: 'IDC City Cycle' },
      { label: 'Top Speed', value: '95 km/h', sub: 'Sport Dynamic Mode' },
      { label: 'Battery Pack', value: '3.8 kWh', sub: 'IP67 Water-Resistant' },
      { label: 'Fast Charge', value: '3.5 hrs', sub: '0-80% Standard Wallbox' },
      { label: 'Peak Torque', value: '78 Nm', sub: 'Instant Electric Response' },
      { label: 'Braking System', value: 'Dual CBS', sub: 'Front & Rear Regenerative Disc' },
    ],
    highlights: [
      'Permanent Magnet Synchronous Motor (PMSM) with regenerative braking',
      'Advanced Cloud Telemetry with real-time GPS and diagnostics',
      'IP67 certified high-density lithium-ion battery architecture',
      'Full LED twin projector headlight and signature daytime running lights',
    ],
  },
  {
    id: '2b290c86-749d-480e-8f82-6f7122936e97',
    modelCode: 'ASKR-CITY-CRUISE',
    name: 'ASKR City Cruise',
    tagline: 'Ultra-Efficient Daily City Rider',
    category: 'bikes',
    categoryLabel: 'Electric Bike',
    isConcept: false,
    conceptBadge: 'Production Model',
    batteryCapacityKwh: 2.5,
    rangeKm: 90,
    topSpeedKmh: 70,
    chargingTimeHours: 2.8,
    exShowroomPriceINR: 89000,
    bookingAmountINR: 3000,
    voucherRedeemLimitINR: 10000,
    imageUrl: '/images/bikes/city-cruise.svg',
    isAvailable: true,
    powertrain: 'Efficient BLDC Hub Drive • 3.5 kW Peak',
    colors: [
      { name: 'Titanium Silver', hex: '#94A3B8', accentHex: '#64748B', description: 'Brushed alloy silver with anti-glare finish' },
      { name: 'Obsidian Black', hex: '#0F172A', accentHex: '#1E293B', description: 'Deep high-gloss carbon finish' },
      { name: 'Electric Blue', hex: '#165DAD', accentHex: '#2563EB', description: 'Signature ASKR EV corporate blue' },
    ],
    specs: [
      { label: 'Certified Range', value: '90 km', sub: 'Urban Daily Riding' },
      { label: 'Top Speed', value: '70 km/h', sub: 'Optimized Urban Flow' },
      { label: 'Battery Pack', value: '2.5 kWh', sub: 'Removable Portable Module' },
      { label: 'Fast Charge', value: '2.8 hrs', sub: 'Home 15A Socket' },
      { label: 'Payload', value: '150 kg', sub: 'Ergonomic Passenger Pillion' },
      { label: 'Suspension', value: 'Hydraulic', sub: 'Telescopic Front Forks' },
    ],
    highlights: [
      'Ultra-lightweight aerospace alloy frame for nimble city maneuvers',
      'Quick-swap portable battery module for apartment charging',
      'Keyless push-to-start and smart anti-theft immobilization',
      'Low maintenance belt drive system with quiet acoustic profile',
    ],
  },
  {
    id: '22c9999e-5f97-449f-bf26-e2169dd74d7f',
    modelCode: 'ASKR-APEX-SPORT',
    name: 'ASKR Apex Sport',
    tagline: 'Track-Inspired Speed & Smart Telemetry',
    category: 'bikes',
    categoryLabel: 'Electric Bike',
    isConcept: false,
    conceptBadge: 'Production Model',
    batteryCapacityKwh: 5.2,
    rangeKm: 175,
    topSpeedKmh: 120,
    chargingTimeHours: 4.0,
    exShowroomPriceINR: 165000,
    bookingAmountINR: 10000,
    voucherRedeemLimitINR: 30000,
    imageUrl: '/images/bikes/apex-sport.svg',
    isAvailable: true,
    powertrain: 'Liquid-Cooled Mid-Mounted PMSM • 10.5 kW Peak',
    colors: [
      { name: 'Racing Green', hex: '#15803D', accentHex: '#14532D', description: 'Deep heritage metallic green with gold calipers' },
      { name: 'Carbon Graphite', hex: '#1E293B', accentHex: '#0F172A', description: 'Matte woven carbon body panels' },
      { name: 'Electric Lime', hex: '#C9FF36', accentHex: '#4D7C0F', description: 'Performance telemetry livery' },
    ],
    specs: [
      { label: 'Certified Range', value: '175 km', sub: 'Extended Touring Range' },
      { label: 'Top Speed', value: '120 km/h', sub: 'Track Mode Enabled' },
      { label: 'Battery Pack', value: '5.2 kWh', sub: 'Integrated Thermal Management' },
      { label: 'Fast Charge', value: '4.0 hrs', sub: 'CCS Type 2 Compatible' },
      { label: 'Acceleration', value: '3.1 sec', sub: '0 to 60 km/h Instant' },
      { label: 'Displays', value: '7" TFT', sub: 'Turn-by-Turn Navigation & Telemetry' },
    ],
    highlights: [
      'High-performance liquid-cooled PMSM motor delivering 10.5 kW peak power',
      'Advanced 6-axis IMU with Cornering ABS and Traction Control',
      'Inverted front forks with preload adjustable rear monoshock',
      'Aero-ducted bodywork designed for high-speed stability and minimal drag',
    ],
  },
];

export const CONCEPT_ELECTRIC_CYCLES: Vehicle[] = [
  {
    id: 'concept-cycle-aerotrek-c1',
    modelCode: 'ASKR-AEROTREK-C1',
    name: 'ASKR AeroTrek C1',
    tagline: 'Hydroformed Carbon Aero Electric Cycle',
    category: 'cycles',
    categoryLabel: 'Electric Cycle',
    isConcept: true,
    conceptBadge: 'Concept Prototype',
    batteryCapacityKwh: 0.75,
    rangeKm: 85,
    topSpeedKmh: 35,
    chargingTimeHours: 1.8,
    exShowroomPriceINR: null, // Indicative concept, unannounced
    bookingAmountINR: null,
    voucherRedeemLimitINR: null,
    imageUrl: '/images/vehicles/electric-cycle.svg',
    isAvailable: false,
    powertrain: 'Mid-Drive Smart Torque Sensor Motor • 250W Nominal / 600W Peak',
    colors: [
      { name: 'Stealth Carbon', hex: '#0F172A', accentHex: '#1E293B', description: 'Matte unidirectional carbon finish' },
      { name: 'Electric Lime', hex: '#C9FF36', accentHex: '#A3E635', description: 'High-visibility aerodynamic accent strip' },
      { name: 'Glacier Silver', hex: '#E2E8F0', accentHex: '#94A3B8', description: 'Brushed aerospace alloy' },
    ],
    specs: [
      { label: 'Assisted Range', value: '85 km', sub: 'Pedal Assist Level 1' },
      { label: 'Assisted Speed', value: '35 km/h', sub: 'EU/India Class Compliance' },
      { label: 'Battery Pack', value: '750 Wh', sub: 'Integrated Downtube Concealed' },
      { label: 'Weight', value: '14.8 kg', sub: 'Ultralight Monocoque Frame' },
      { label: 'Drivetrain', value: 'Carbon Belt', sub: 'Gates CDX Quiet Drive' },
      { label: 'Display', value: 'Stem OLED', sub: 'Integrated Bluetooth Telemetry' },
    ],
    highlights: [
      'Aero-profile hydroformed carbon frame with zero visible exterior cables',
      'Gates Carbon Drive belt for zero maintenance, oil-free silent operation',
      'Integrated matrix headlight and rear automatic brake light in seatpost',
      'Smart cadence and bilateral torque sensors for natural power assist',
    ],
  },
];

export const CONCEPT_ELECTRIC_JEEPS: Vehicle[] = [
  {
    id: 'concept-jeep-terramax-4x4',
    modelCode: 'ASKR-TERRAMAX-4X4',
    name: 'ASKR TerraMax 4x4',
    tagline: 'High-Torque All-Terrain Electric Adventure Utility',
    category: 'jeeps',
    categoryLabel: 'Electric Jeep',
    isConcept: true,
    conceptBadge: 'Concept Prototype',
    batteryCapacityKwh: 48.0,
    rangeKm: 380,
    topSpeedKmh: 145,
    chargingTimeHours: 6.5,
    exShowroomPriceINR: null,
    bookingAmountINR: null,
    voucherRedeemLimitINR: null,
    imageUrl: '/images/vehicles/electric-jeep.svg',
    isAvailable: false,
    powertrain: 'Dual-Motor AWD Architecture • 180 kW Total Output',
    colors: [
      { name: 'Deep Graphite', hex: '#1E293B', accentHex: '#0F172A', description: 'Metallic armor graphite with rock-resistant clearcoat' },
      { name: 'Electric Lime Off-Road', hex: '#C9FF36', accentHex: '#4D7C0F', description: 'High-contrast trail recovery highlights' },
      { name: 'Onyx Black', hex: '#020617', accentHex: '#1E293B', description: 'Matte obsidian tactical package' },
    ],
    specs: [
      { label: 'Estimated Range', value: '380 km', sub: 'WLTP Adventure Cycle' },
      { label: 'Drivetrain', value: 'Dual AWD', sub: 'Independent Electronic Torque Vectoring' },
      { label: 'Battery Pack', value: '48 kWh', sub: 'Reinforced Underbody Skid Shield' },
      { label: 'Ground Clearance', value: '240 mm', sub: 'Class-Leading Obstacle Clearance' },
      { label: 'Towing Capacity', value: '2,200 kg', sub: 'Heavy Duty Trailer Assist' },
      { label: 'Fast Charge', value: '38 min', sub: '10-80% DC Fast Charger' },
    ],
    highlights: [
      'Dual-motor electric all-wheel drive with electronic locking differentials',
      'Heavy-duty underbody steel skid armor protecting the structural battery pack',
      'Overland modular roof rack with quad integrated LED search illuminators',
      'Vehicle-to-Load (V2L) 3.3 kW power output for camping and outdoor gear',
    ],
  },
];

export const ALL_CATALOG_VEHICLES: Vehicle[] = [
  ...VERIFIED_ELECTRIC_BIKES,
  ...CONCEPT_ELECTRIC_CYCLES,
  ...CONCEPT_ELECTRIC_JEEPS,
];

export function getVehicleByCode(code: string): Vehicle | undefined {
  const norm = code.toUpperCase();
  return ALL_CATALOG_VEHICLES.find(
    (v) => v.modelCode.toUpperCase() === norm || v.id.toLowerCase() === code.toLowerCase()
  );
}
