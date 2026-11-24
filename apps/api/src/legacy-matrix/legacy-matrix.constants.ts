export interface LegacyLevelConfig {
  level: number;
  positions: number;
  amountPaise: bigint; // In paise
  amountINR: number;
  destination: 'EV_CLUB_WALLET' | 'EARNINGS_WALLET';
}

export const LEGACY_MATRIX_RATES: LegacyLevelConfig[] = [
  { level: 1, positions: 3, amountPaise: 20000n, amountINR: 200, destination: 'EV_CLUB_WALLET' },
  { level: 2, positions: 9, amountPaise: 20000n, amountINR: 200, destination: 'EARNINGS_WALLET' },
  { level: 3, positions: 27, amountPaise: 20000n, amountINR: 200, destination: 'EV_CLUB_WALLET' },
  { level: 4, positions: 81, amountPaise: 20000n, amountINR: 200, destination: 'EARNINGS_WALLET' },
  { level: 5, positions: 243, amountPaise: 30000n, amountINR: 300, destination: 'EV_CLUB_WALLET' },
  { level: 6, positions: 729, amountPaise: 30000n, amountINR: 300, destination: 'EARNINGS_WALLET' },
  { level: 7, positions: 2187, amountPaise: 30000n, amountINR: 300, destination: 'EV_CLUB_WALLET' },
  { level: 8, positions: 6561, amountPaise: 30000n, amountINR: 300, destination: 'EARNINGS_WALLET' },
];

export const LEGACY_MATRIX_CONFIG = {
  MAX_CHILDREN_PER_NODE: 3,
  MAX_EARNING_LEVELS: 8,
  TOTAL_POSITIONS_8_LEVELS: 9840,
  MAX_NETWORK_CAPACITY: 9840,
  MANDATORY_ACTIVE_DIRECTS: 3,
  ADVISORY_LOCK_ID: 987654330,
  RATES_PAISE: {
    1: 20000n,
    2: 20000n,
    3: 20000n,
    4: 20000n,
    5: 30000n,
    6: 30000n,
    7: 30000n,
    8: 30000n,
  } as Record<number, bigint>,
} as const;

export function calculateLayerCapacity(layer: number): number {
  return Math.pow(3, layer);
}

export function getMatrixFillSlot(sequence: number): {
  parentSequence: number;
  positionIndex: number;
  depth: number;
} | null {
  if (sequence <= 1) return null;

  let currentDepth = 1;
  let layerStartSequence = 2;
  let layerCapacity = 3; // 3^1
  let parentLayerStartSequence = 1;

  while (sequence >= layerStartSequence + layerCapacity) {
    parentLayerStartSequence = layerStartSequence;
    layerStartSequence += layerCapacity;
    currentDepth++;
    layerCapacity = Math.pow(3, currentDepth);
  }

  const offsetInLayer = sequence - layerStartSequence;
  const numParentsInLayer = Math.pow(3, currentDepth - 1);
  const positionIndex = Math.floor(offsetInLayer / numParentsInLayer) + 1;
  const parentOffset = offsetInLayer % numParentsInLayer;
  const parentSequence = parentLayerStartSequence + parentOffset;

  return {
    parentSequence,
    positionIndex,
    depth: currentDepth,
  };
}
