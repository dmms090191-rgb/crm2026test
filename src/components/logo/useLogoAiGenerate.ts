import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  PRESETS, UNIT_COST_PER_IMAGE, TRANSPARENT_COST_PER_IMAGE,
  type Preset, type NumProposals,
} from './logoAiConstants';
import { hexToRgb, rasterizeSvgUrl } from './logoAiHelpers';
import type { ResultGroup } from './LogoAiResultsGrid';

interface UseLogoAiGenerateOptions {
  companyId: string | null;
  selectedPresets: Preset[];
  numProposals: NumProposals;
  brandName: string;
  colorPalette: string;
  customPrimary: string;
  customSecondary: string;
  prompt: string;
  transparentBg: boolean;
  onLogosChanged: () => void;
}

export default function useLogoAiGenerate(opts: UseLogoAiGenerateOptions) {
  const {
    companyId, selectedPresets, numProposals, brandName,
    colorPalette, customPrimary, customSecondary, prompt,
    transparentBg, onLogosChanged,
  } = opts;

  const [loading, setLoading] = useState(false);
  const [postProcessing, setPostProcessing] = useState(false);
  const [postProcessStatus, setPostProcessStatus] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingPack, setSavingPack] = useState<number | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [resultGroups, setResultGroups] = useState<ResultGroup[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  const numTypes = Math.max(selectedPresets.length, 1);
  const totalImages = numTypes * numProposals;
  const genCost = totalImages * UNIT_COST_PER_IMAGE;
  const transpCost = transparentBg ? totalImages * TRANSPARENT_COST_PER_IMAGE : 0;
  const estimatedCost = genCost + transpCost;
  const needsBrand = selectedPresets.some(id => PRESETS.find(p => p.id === id)?.needsBrand ?? false);
  const canGenerate = selectedPresets.length > 0 && (!needsBrand || brandName.trim().length > 0);

  const removeBackground = useCallback(async (pngBase64: string, cId: string, token: string): Promise<string> => {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-logo`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove-background', image_base64: pngBase64, company_id: cId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Erreur removeBackground');
    return data.image_url;
  }, []);

  const handleGenerate = async () => {
    if (!canGenerate || selectedPresets.length === 0) return;
    setLoading(true); setError(null); setResultGroups([]); setSavedSet(new Set()); setCurrentGroupId(null);
    setPostProcessing(false); setPostProcessStatus(null); setProgressLabel(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Vous devez etre connecte.'); return; }
      const payload: Record<string, unknown> = {
        engine: 'v4_1', presets: selectedPresets, n: numProposals,
        brand_name: brandName.trim(), company_id: companyId ?? '',
      };
      if (colorPalette === 'single') payload.colors = [Array.from(hexToRgb(customPrimary)), Array.from(hexToRgb(customPrimary))];
      else if (colorPalette === 'custom') payload.colors = [Array.from(hexToRgb(customPrimary)), Array.from(hexToRgb(customSecondary))];
      if (prompt.trim()) payload.prompt = prompt.trim();
      if (selectedPresets.length > 1) setProgressLabel(`Generation type 1/${selectedPresets.length}...`);
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Erreur lors de la generation.'); return; }
      setCurrentGroupId(data.generation_group_id ?? null);
      let groups: ResultGroup[];
      if (data.groups && Array.isArray(data.groups)) groups = data.groups as ResultGroup[];
      else {
        const urls: string[] = data.image_urls ?? (data.image_url ? [data.image_url] : []);
        groups = [{ preset: selectedPresets[0], urls }];
      }
      if (transparentBg) {
        setLoading(false); setPostProcessing(true); setProgressLabel(null);
        const allUrls = groups.flatMap(g => g.urls);
        const transparentUrls: string[] = [];
        for (let i = 0; i < allUrls.length; i++) {
          setPostProcessStatus(`Conversion transparente ${i + 1}/${allUrls.length}...`);
          try {
            const pngDataUrl = await rasterizeSvgUrl(allUrls[i]);
            transparentUrls.push(await removeBackground(pngDataUrl, companyId ?? '', session.access_token));
          } catch (e) { transparentUrls.push(allUrls[i]); console.error(`[LogoAiTab] removeBackground ${i}:`, e); }
        }
        let urlIdx = 0;
        groups = groups.map(g => { const n = transparentUrls.slice(urlIdx, urlIdx + g.urls.length); urlIdx += g.urls.length; return { ...g, urls: n }; });
        setPostProcessing(false); setPostProcessStatus(null);
      }
      setResultGroups(groups);
    } catch { setError('Une erreur est survenue lors de la generation.'); }
    finally { setLoading(false); setPostProcessing(false); setPostProcessStatus(null); setProgressLabel(null); }
  };

  const handleSave = async (url: string, key: string) => {
    if (!companyId) { setError('Aucune societe associee.'); return; }
    setSavingKey(key); setError(null);
    try {
      const { data: existing } = await supabase.from('company_logos').select('position').eq('company_id', companyId).order('position', { ascending: false }).limit(1);
      const maxPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
      const presetId = key.split('-')[0] as Preset;
      const presetDef = PRESETS.find(p => p.id === presetId);
      const label = transparentBg ? `${presetDef?.label ?? 'Logo IA'} (transparent)` : presetDef?.label ?? 'Logo IA';
      const insertData: Record<string, unknown> = { company_id: companyId, url, file_name: `${label} - ${new Date().toLocaleDateString('fr-FR')}`, is_active: false, position: maxPos };
      if (currentGroupId) insertData.generation_group_id = currentGroupId;
      const { error: dbErr } = await supabase.from('company_logos').insert(insertData);
      if (dbErr) throw dbErr;
      setSavedSet(prev => new Set(prev).add(key));
      onLogosChanged();
    } catch (e: unknown) { setError(`Erreur sauvegarde : ${e instanceof Error ? e.message : String(e)}`); }
    finally { setSavingKey(null); }
  };

  const handleSavePack = async (packIndex: number) => {
    if (!companyId) { setError('Aucune societe associee.'); return; }
    setSavingPack(packIndex); setError(null);
    try {
      const { data: existing } = await supabase.from('company_logos').select('position').eq('company_id', companyId).order('position', { ascending: false }).limit(1);
      let pos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
      const packGroupId = currentGroupId
        ? `${currentGroupId}-p${packIndex}`
        : `pack-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const dateStr = new Date().toLocaleDateString('fr-FR');
      const newKeys: string[] = [];
      for (const group of resultGroups) {
        const url = group.urls[packIndex];
        if (!url) continue;
        const presetDef = PRESETS.find(p => p.id === group.preset);
        const label = transparentBg ? `${presetDef?.label ?? 'Logo IA'} (transparent)` : presetDef?.label ?? 'Logo IA';
        const { error: dbErr } = await supabase.from('company_logos').insert({
          company_id: companyId, url, file_name: `${label} - ${dateStr}`,
          is_active: false, position: pos, generation_group_id: packGroupId,
        });
        if (dbErr) throw dbErr;
        newKeys.push(`${group.preset}-${packIndex}`);
        pos++;
      }
      setSavedSet(prev => { const next = new Set(prev); newKeys.forEach(k => next.add(k)); return next; });
      onLogosChanged();
    } catch (e: unknown) { setError(`Erreur sauvegarde : ${e instanceof Error ? e.message : String(e)}`); }
    finally { setSavingPack(null); }
  };

  const clearResults = () => { setResultGroups([]); setSavedSet(new Set()); };

  return {
    loading, postProcessing, postProcessStatus, progressLabel,
    savingKey, savingPack, savedSet, error, resultGroups, currentGroupId,
    numTypes, totalImages, genCost, transpCost, estimatedCost,
    needsBrand, canGenerate,
    handleGenerate, handleSave, handleSavePack, clearResults,
  };
}
