export type InstanceStatus = 'connected' | 'disconnected' | 'error';

export interface Instance {
  id: string;
  created_at: string;
  location_id: string;
  instance_name: string;
  instance_token: string | null;
  status: InstanceStatus;
  qr_code: string | null;
  last_heartbeat: string | null;
  ghl_user_id: string | null;
}

export interface CallLog {
  id: string;
  created_at: string;
  location_id: string;
  instance_id: string;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  analysis_json: Record<string, unknown>;
  score: number;
}
