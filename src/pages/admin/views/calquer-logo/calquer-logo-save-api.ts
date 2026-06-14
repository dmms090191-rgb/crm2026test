import { supabase } from '../../../../lib/supabase';
import type { SavedSession, SessionFullData, SessionEditorState } from './calquer-logo-save-types';

export async function listSessions(): Promise<SavedSession[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('logo_trace_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function loadSession(id: string): Promise<SessionFullData> {
  const { data, error } = await supabase
    .from('logo_trace_sessions')
    .select('id, title, original_image_data, transformed_image_data, svg_content, current_svg_content, editor_state')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as SessionFullData;
}

export async function createSession(
  title: string,
  originalImageData: string | null,
  svgContent: string | null,
  currentSvgContent: string | null,
  editorState: SessionEditorState,
  companyId?: string,
  transformedImageData?: string | null,
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecte');

  const { data, error } = await supabase
    .from('logo_trace_sessions')
    .insert({
      user_id: user.id,
      company_id: companyId || null,
      title,
      original_image_data: originalImageData,
      transformed_image_data: transformedImageData || null,
      svg_content: svgContent,
      current_svg_content: currentSvgContent,
      editor_state: editorState,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateSession(
  id: string,
  originalImageData: string | null,
  svgContent: string | null,
  currentSvgContent: string | null,
  editorState: SessionEditorState,
  transformedImageData?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('logo_trace_sessions')
    .update({
      original_image_data: originalImageData,
      transformed_image_data: transformedImageData ?? null,
      svg_content: svgContent,
      current_svg_content: currentSvgContent,
      editor_state: editorState,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function renameSession(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('logo_trace_sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('logo_trace_sessions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function imageUrlToDataUrl(url: string): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToObjectUrl(dataUrl: string): string {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: mime });
  return URL.createObjectURL(blob);
}
