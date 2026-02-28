export interface SeasonRecord {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
  decay_threshold: number;
  decay_rate: number;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  decayThreshold: number;
  decayRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSeasonBody {
  name: string;
  startAt: string;
  endAt: string;
  decayThreshold?: number;
  decayRate?: number;
  isActive?: boolean;
}

export interface UpdateSeasonBody {
  name?: string;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
  decayThreshold?: number;
  decayRate?: number;
}
