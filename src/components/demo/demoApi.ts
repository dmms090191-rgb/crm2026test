import { supabase } from '../../lib/supabase';
import type { DemoSession, DemoDeviceType } from './demoTypes';

export async function createDemoSession(
  superAdminId: string,
  targetUserId: string,
  targetRole: 'admin' | 'vendor' | 'client',
  companyId: string | null,
  saDisplayName: string,
  deviceType: DemoDeviceType = 'desktop',
): Promise<DemoSession | null> {
  const { data } = await supabase
    .from('demo_sessions')
    .insert({
      super_admin_id: superAdminId,
      target_user_id: targetUserId,
      target_role: targetRole,
      company_id: companyId,
      status: 'pending',
      sa_display_name: saDisplayName,
      device_type: deviceType,
    })
    .select()
    .maybeSingle();
  return data;
}

export async function updateDemoSessionStatus(
  sessionId: string,
  status: 'active' | 'ended' | 'rejected',
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === 'active') updates.started_at = new Date().toISOString();
  if (status === 'ended' || status === 'rejected') updates.ended_at = new Date().toISOString();
  await supabase.from('demo_sessions').update(updates).eq('id', sessionId);
}

export async function updateDemoSessionView(
  sessionId: string,
  view: string,
): Promise<void> {
  await supabase.from('demo_sessions').update({ current_view: view }).eq('id', sessionId);
}

export async function getActiveDemoForUser(userId: string): Promise<DemoSession | null> {
  const { data } = await supabase
    .from('demo_sessions')
    .select('*')
    .eq('target_user_id', userId)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getActiveDemoForSA(saId: string): Promise<DemoSession | null> {
  const { data } = await supabase
    .from('demo_sessions')
    .select('*')
    .eq('super_admin_id', saId)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
