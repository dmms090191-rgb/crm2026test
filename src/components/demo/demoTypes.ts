export type DemoDeviceType = 'desktop' | 'smartphone';

export interface DemoSession {
  id: string;
  super_admin_id: string;
  target_user_id: string;
  target_role: 'admin' | 'vendor' | 'client';
  company_id: string | null;
  status: 'pending' | 'active' | 'ended' | 'rejected';
  current_view: string | null;
  sa_display_name: string;
  device_type: DemoDeviceType;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface CursorMoveEvent {
  type: 'cursor_move';
  xPercent: number;
  yPercent: number;
}

export interface CursorClickEvent {
  type: 'cursor_click';
  xPercent: number;
  yPercent: number;
}

export interface ViewChangeEvent {
  type: 'view_change';
  view: string;
  label?: string;
}

export interface DemoEndEvent {
  type: 'demo_end';
}

export type DemoBroadcastEvent =
  | CursorMoveEvent
  | CursorClickEvent
  | ViewChangeEvent
  | DemoEndEvent;
