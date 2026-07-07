/**
 * Theme Manager (Fase 3) — admin UI to edit visual identity.
 *
 * Scope: colors (light + dark tokens), typography, layout radius,
 * identity (system name, browser title, logo, favicon), theme CRUD,
 * activation, duplication, live preview on the app.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  Trash2,
  Upload,
  Loader2,
  Plus,
  Star,
  Palette,
  Type,
  LayoutGrid,
  ImageIcon,
} from 'lucide-react';
import type { ThemeSettings } from '@/lib/theme/types';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Token catalog — declares which vars are editable in the UI          */
/* ------------------------------------------------------------------ */

interface TokenSpec {
  key: string;
  label: string;
  group: 'brand' | 'surface' | 'text' | 'state' | 'controls';
}

const TOKEN_SPECS: TokenSpec[] = [
  { key: 'primary', label: 'Primária', group: 'brand' },
  { key: 'primary-foreground', label: 'Texto sobre primária', group: 'brand' },
  { key: 'accent', label: 'Destaque', group: 'brand' },
  { key: 'ring', label: 'Foco (ring)', group: 'brand' },

  { key: 'background', label: 'Fundo do app', group: 'surface' },
  { key: 'card', label: 'Cards', group: 'surface' },
  { key: 'popover', label: 'Popovers', group: 'surface' },
  { key: 'secondary', label: 'Secundária', group: 'surface' },
  { key: 'muted', label: 'Muted', group: 'surface' },
  { key: 'border', label: 'Bordas', group: 'surface' },
  { key: 'input', label: 'Campos', group: 'surface' },

  { key: 'foreground', label: 'Texto principal', group: 'text' },
  { key: 'card-foreground', label: 'Texto em card', group: 'text' },
  { key: 'muted-foreground', label: 'Texto muted', group: 'text' },

  { key: 'destructive', label: 'Erro / destrutivo', group: 'state' },
  { key: 'success', label: 'Sucesso', group: 'state' },
  { key: 'warning', label: 'Aviso', group: 'state' },
];

const GROUP_LABELS: Record<TokenSpec['group'], string> = {
  brand: 'Marca',
  surface: 'Superfícies',
  text: 'Texto',
  state: 'Estados',
  controls: 'Controles',
};

/* ------------------------------------------------------------------ */
/* HSL <-> Hex helpers (tokens are stored as "H S% L%" strings)        */
/* ------------------------------------------------------------------ */

function hslStringToHex(hsl: string): string {
  if (!hsl) return '#000000';
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return '#000000';
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHslString(hex: string): string {
  const m = hex.replace('#', '');
  const bigint = parseInt(
    m.length === 3
      ? m.split('').map((c) => c + c).join('')
      : m,
    16,
  );
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/* ------------------------------------------------------------------ */
/* Live preview: apply a theme's tokens as inline vars on the fly     */
/* ------------------------------------------------------------------ */

const PREVIEW_STYLE_ID = 'finango-theme-preview';

function applyPreview(theme: ThemeSettings, mode: 'light' | 'dark') {
  let el = document.getElementById(PREVIEW_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = PREVIEW_STYLE_ID;
    document.head.appendChild(el);
  }
  const tokens = mode === 'dark' ? theme.tokens_dark : theme.tokens_light;
  const lines = Object.entries(tokens ?? {}).map(([k, v]) => `  --${k}: ${v};`);
  el.textContent =
    mode === 'dark'
      ? `.dark {\n${lines.join('\n')}\n}`
      : `:root {\n${lines.join('\n')}\n}`;
}

function clearPreview() {
  const el = document.getElementById(PREVIEW_STYLE_ID);
  if (el) el.remove();
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ThemeManager() {
  const [themes, setThemes] = useState<ThemeSettings[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ThemeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('dark');

  const selected = useMemo(
    () => themes.find((t) => t.id === selectedId) ?? null,
    [themes, selectedId],
  );

  /* Load themes */
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('theme_settings')
        .select('*')
        .order('is_preset', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        toast.error('Erro ao carregar temas');
      } else if (data) {
        const list = data as unknown as ThemeSettings[];
        setThemes(list);
        const active = list.find((t) => t.is_active) ?? list[0];
        if (active) setSelectedId(active.id);
      }
      setLoading(false);
    };
    load();
  }, []);

  /* When user picks a theme, load it into draft */
  useEffect(() => {
    if (selected) setDraft(JSON.parse(JSON.stringify(selected)));
  }, [selected]);

  /* Live preview whenever draft changes */
  useEffect(() => {
    if (!draft) return;
    applyPreview(draft, mode);
    return () => {
      // Only clear on unmount; keep preview during interactions.
    };
  }, [draft, mode]);

  useEffect(() => {
    return () => clearPreview();
  }, []);

  /* --------- Actions --------- */

  const handleTokenChange = (
    modeKey: 'light' | 'dark',
    tokenKey: string,
    value: string,
  ) => {
    if (!draft) return;
    setDraft({
      ...draft,
      [modeKey === 'light' ? 'tokens_light' : 'tokens_dark']: {
        ...(modeKey === 'light' ? draft.tokens_light : draft.tokens_dark),
        [tokenKey]: value,
      },
    });
  };

  const handleIdentityChange = (key: string, value: string | null) => {
    if (!draft) return;
    setDraft({ ...draft, identity: { ...draft.identity, [key]: value } });
  };

  const handleTypographyChange = (key: string, value: string) => {
    if (!draft) return;
    setDraft({ ...draft, typography: { ...draft.typography, [key]: value } });
  };

  const handleLayoutChange = (key: string, value: string) => {
    if (!draft) return;
    setDraft({ ...draft, layout: { ...draft.layout, [key]: value } });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase
      .from('theme_settings')
      .update({
        name: draft.name,
        description: draft.description,
        mode: draft.mode,
        tokens_light: draft.tokens_light,
        tokens_dark: draft.tokens_dark,
        typography: draft.typography,
        layout: draft.layout,
        identity: draft.identity as never,
      })
      .eq('id', draft.id);
    setSaving(false);
    if (error) return toast.error('Erro ao salvar: ' + error.message);
    toast.success('Tema salvo');
    setThemes((prev) => prev.map((t) => (t.id === draft.id ? draft : t)));
  };

  const handleActivate = async () => {
    if (!draft) return;
    const { error } = await supabase
      .from('theme_settings')
      .update({ is_active: true })
      .eq('id', draft.id);
    if (error) return toast.error('Erro ao ativar: ' + error.message);
    toast.success('Tema ativado');
    setThemes((prev) =>
      prev.map((t) => ({ ...t, is_active: t.id === draft.id })),
    );
  };

  const handleDuplicate = async () => {
    if (!draft) return;
    const copyName = `${draft.name} (cópia)`;
    const { data, error } = await supabase
      .from('theme_settings')
      .insert({
        name: copyName,
        description: draft.description,
        mode: draft.mode,
        is_active: false,
        is_default: false,
        is_preset: false,
        tokens_light: draft.tokens_light,
        tokens_dark: draft.tokens_dark,
        typography: draft.typography,
        layout: draft.layout,
        identity: draft.identity as never,
      })
      .select('*')
      .single();
    if (error) return toast.error('Erro ao duplicar: ' + error.message);
    toast.success('Tema duplicado');
    const t = data as unknown as ThemeSettings;
    setThemes((prev) => [...prev, t]);
    setSelectedId(t.id);
  };

  const handleDelete = async () => {
    if (!draft || draft.is_preset) return;
    if (!confirm(`Excluir o tema "${draft.name}"?`)) return;
    const { error } = await supabase
      .from('theme_settings')
      .delete()
      .eq('id', draft.id);
    if (error) return toast.error('Erro ao excluir: ' + error.message);
    toast.success('Tema excluído');
    setThemes((prev) => prev.filter((t) => t.id !== draft.id));
    setSelectedId(themes[0]?.id ?? null);
  };

  const handleUpload = async (
    file: File,
    field: 'logo_url' | 'logo_reduced_url' | 'favicon_url',
  ) => {
    if (!draft) return;
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${draft.id}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('theme-assets')
      .upload(path, file, { upsert: true, cacheControl: '3600' });
    if (error) return toast.error('Erro no upload: ' + error.message);
    const { data } = supabase.storage.from('theme-assets').getPublicUrl(path);
    handleIdentityChange(field, data.publicUrl);
    toast.success('Arquivo enviado — clique em Salvar para aplicar');
  };

  /* --------- Render --------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* --------------- Theme list --------------- */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Temas</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDuplicate}
              disabled={!draft}
              title="Duplicar tema selecionado"
            >
              <Plus size={14} />
            </Button>
          </div>

          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={cn(
                'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2',
                selectedId === t.id
                  ? 'bg-primary/15 text-foreground border border-primary/40'
                  : 'hover:bg-muted text-muted-foreground',
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-border"
                  style={{
                    background: `hsl(${
                      t.tokens_dark?.primary ?? t.tokens_light?.primary ?? '0 0% 50%'
                    })`,
                  }}
                />
                <span className="truncate">{t.name}</span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {t.is_preset && (
                  <Star size={11} className="text-muted-foreground" />
                )}
                {t.is_active && (
                  <Check size={12} className="text-primary" />
                )}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* --------------- Editor --------------- */}
      {draft ? (
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  disabled={draft.is_preset}
                  className="text-lg font-semibold h-9"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {draft.is_preset ? 'Preset (nome bloqueado)' : 'Tema personalizado'}
                  {draft.is_active && ' · Ativo'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!draft.is_active && (
                  <Button size="sm" variant="secondary" onClick={handleActivate}>
                    <Check size={14} className="mr-1" /> Ativar
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={handleDuplicate}>
                  <Copy size={14} className="mr-1" /> Duplicar
                </Button>
                {!draft.is_preset && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={14} className="mr-1" /> Excluir
                  </Button>
                )}
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </div>

            <Tabs defaultValue="colors" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="colors" className="gap-1">
                  <Palette size={13} /> Cores
                </TabsTrigger>
                <TabsTrigger value="typography" className="gap-1">
                  <Type size={13} /> Tipografia
                </TabsTrigger>
                <TabsTrigger value="layout" className="gap-1">
                  <LayoutGrid size={13} /> Layout
                </TabsTrigger>
                <TabsTrigger value="identity" className="gap-1">
                  <ImageIcon size={13} /> Identidade
                </TabsTrigger>
              </TabsList>

              {/* ---------- Colors ---------- */}
              <TabsContent value="colors" className="space-y-4 pt-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Modo:</span>
                  <div className="inline-flex rounded-lg bg-muted p-0.5">
                    <button
                      onClick={() => setMode('light')}
                      className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                        mode === 'light'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground',
                      )}
                    >
                      Claro
                    </button>
                    <button
                      onClick={() => setMode('dark')}
                      className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                        mode === 'dark'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground',
                      )}
                    >
                      Escuro
                    </button>
                  </div>
                  <span className="ml-auto text-muted-foreground">
                    Prévia ao vivo ativa
                  </span>
                </div>

                {(['brand', 'surface', 'text', 'state'] as const).map((group) => (
                  <div key={group} className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      {GROUP_LABELS[group]}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TOKEN_SPECS.filter((t) => t.group === group).map(
                        (spec) => (
                          <ColorRow
                            key={spec.key}
                            label={spec.label}
                            value={
                              (mode === 'light'
                                ? draft.tokens_light
                                : draft.tokens_dark)?.[spec.key] ?? ''
                            }
                            onChange={(v) =>
                              handleTokenChange(mode, spec.key, v)
                            }
                          />
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* ---------- Typography ---------- */}
              <TabsContent value="typography" className="space-y-3 pt-4">
                <FieldRow
                  label="Fonte principal (font-sans)"
                  value={draft.typography['font-sans'] ?? ''}
                  onChange={(v) => handleTypographyChange('font-sans', v)}
                  placeholder="DM Sans, system-ui, sans-serif"
                />
                <FieldRow
                  label="Fonte monoespaçada (font-mono)"
                  value={draft.typography['font-mono'] ?? ''}
                  onChange={(v) => handleTypographyChange('font-mono', v)}
                  placeholder="JetBrains Mono, monospace"
                />
              </TabsContent>

              {/* ---------- Layout ---------- */}
              <TabsContent value="layout" className="space-y-3 pt-4">
                <FieldRow
                  label="Raio das bordas (--radius)"
                  value={draft.layout['radius'] ?? ''}
                  onChange={(v) => handleLayoutChange('radius', v)}
                  placeholder="1rem"
                />
              </TabsContent>

              {/* ---------- Identity ---------- */}
              <TabsContent value="identity" className="space-y-3 pt-4">
                <FieldRow
                  label="Nome do sistema"
                  value={draft.identity.system_name ?? ''}
                  onChange={(v) => handleIdentityChange('system_name', v)}
                  placeholder="FINANGO"
                />
                <FieldRow
                  label="Título do navegador"
                  value={draft.identity.browser_title ?? ''}
                  onChange={(v) => handleIdentityChange('browser_title', v)}
                  placeholder="FINANGO - Gestão Financeira"
                />

                <UploadRow
                  label="Logo principal"
                  currentUrl={draft.identity.logo_url}
                  onUpload={(f) => handleUpload(f, 'logo_url')}
                  onClear={() => handleIdentityChange('logo_url', null)}
                />
                <UploadRow
                  label="Logo reduzida"
                  currentUrl={draft.identity.logo_reduced_url}
                  onUpload={(f) => handleUpload(f, 'logo_reduced_url')}
                  onClear={() =>
                    handleIdentityChange('logo_reduced_url', null)
                  }
                />
                <UploadRow
                  label="Favicon"
                  currentUrl={draft.identity.favicon_url}
                  onUpload={(f) => handleUpload(f, 'favicon_url')}
                  onClear={() => handleIdentityChange('favicon_url', null)}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Selecione um tema à esquerda para editar.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = hslStringToHex(value);
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(hexToHslString(e.target.value))}
        className="w-9 h-9 rounded-md border border-border cursor-pointer bg-transparent"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[11px] text-muted-foreground font-mono focus:outline-none focus:text-foreground truncate"
          placeholder="0 0% 50%"
        />
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function UploadRow({
  label,
  currentUrl,
  onUpload,
  onClear,
}: {
  label: string;
  currentUrl: string | null | undefined;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={label}
            className="w-full h-full object-contain"
          />
        ) : (
          <ImageIcon size={18} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {currentUrl ? currentUrl : 'Nenhum arquivo enviado'}
        </p>
      </div>
      <label className="cursor-pointer">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            await onUpload(f);
            setBusy(false);
            e.target.value = '';
          }}
        />
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-secondary hover:bg-secondary/70">
          {busy ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Upload size={12} />
          )}
          Enviar
        </span>
      </label>
      {currentUrl && (
        <Button size="sm" variant="ghost" onClick={onClear}>
          <Trash2 size={13} />
        </Button>
      )}
    </div>
  );
}
