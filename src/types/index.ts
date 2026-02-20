// Tote types
export interface Tote {
  id: string;
  name: string;
  location: string;
  size: string | null;
  color: string | null;
  owner: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface CreateToteInput {
  name: string;
  location: string;
  size?: string;
  color?: string;
  owner?: string;
}

export interface UpdateToteInput {
  name?: string;
  location?: string;
  size?: string;
  color?: string;
  owner?: string;
}

// Item types
export interface Item {
  id: number;
  tote_id: string;
  name: string;
  description: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
  tote_name?: string;
  metadata?: ItemMetadata[];
  photos?: ItemPhoto[];
  movement_history?: MovementHistory[];
}

export interface CreateItemInput {
  name: string;
  description?: string;
  quantity?: number;
}

export interface UpdateItemInput {
  name?: string;
  description?: string;
  quantity?: number;
}

// Item Metadata types
export interface ItemMetadata {
  id: number;
  item_id: number;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMetadataInput {
  key: string;
  value: string;
}

export interface UpdateMetadataInput {
  key?: string;
  value?: string;
}

// Metadata Key (for autocomplete)
export interface MetadataKey {
  id: number;
  key_name: string;
  created_at: string;
}

// Item Photo types
export interface ItemPhoto {
  id: number;
  item_id: number;
  filename: string;
  original_path: string;
  thumbnail_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

// Movement History types
export interface MovementHistory {
  id: number;
  item_id: number;
  from_tote_id: string | null;
  to_tote_id: string;
  moved_at: string;
  from_tote_name?: string;
  to_tote_name?: string;
}

// Settings types
export interface Setting {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

export interface SettingsMap {
  server_hostname: string;
  max_upload_size: string;
  default_tote_fields: string;
  default_metadata_keys: string;
  theme: string;
}

// Dashboard types
export interface DashboardData {
  total_totes: number;
  total_items: number;
  recent_items: (Item & { tote_name: string })[];
}

// Search types
export interface SearchResult {
  items: (Item & { tote_name: string; tote_id: string })[];
  total: number;
}

export interface SearchFilters {
  query?: string;
  location?: string;
  owner?: string;
  metadata_key?: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// Health check types
export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
}
