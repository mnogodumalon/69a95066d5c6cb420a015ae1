import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Strassenverzeichnis, Schnellmeldung, Schadensmeldungen } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { StrassenverzeichnisDialog } from '@/components/dialogs/StrassenverzeichnisDialog';
import { SchnellmeldungDialog } from '@/components/dialogs/SchnellmeldungDialog';
import { SchadensmeldungenDialog } from '@/components/dialogs/SchadensmeldungenDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, Plus, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const STRASSENVERZEICHNIS_FIELDS = [
  { key: 'strassenname', label: 'Straßenname', type: 'string/text' },
  { key: 'stadtteil', label: 'Stadtteil/Bezirk', type: 'string/text' },
  { key: 'strassentyp', label: 'Straßentyp', type: 'lookup/select', options: [{ key: 'hauptstrasse', label: 'Hauptstraße' }, { key: 'nebenstrasse', label: 'Nebenstraße' }, { key: 'anliegerstrasse', label: 'Anliegerstraße' }, { key: 'fussgaengerzone', label: 'Fußgängerzone' }, { key: 'platz', label: 'Platz' }] },
  { key: 'notizen', label: 'Zusätzliche Notizen', type: 'string/textarea' },
];
const SCHNELLMELDUNG_FIELDS = [
  { key: 'email', label: 'E-Mail', type: 'string/email' },
  { key: 'telefon', label: 'Telefon', type: 'string/tel' },
  { key: 'foto', label: 'Foto (optional)', type: 'file' },
  { key: 'vorname', label: 'Vorname', type: 'string/text' },
  { key: 'nachname', label: 'Nachname', type: 'string/text' },
  { key: 'strasse_auswahl', label: 'Straße', type: 'applookup/select', targetEntity: 'straßenverzeichnis', targetAppId: 'STRASSENVERZEICHNIS', displayField: 'strassenname' },
  { key: 'position_beschreibung', label: 'Position (Hausnummer/Bereich)', type: 'string/text' },
  { key: 'gps_koordinaten', label: 'Standort', type: 'geo' },
  { key: 'art_des_schadens', label: 'Art des Schadens', type: 'lookup/select', options: [{ key: 'schlagloch', label: 'Schlagloch' }, { key: 'riss', label: 'Riss/Spalte' }, { key: 'absenkung', label: 'Absenkung' }, { key: 'aufbruch', label: 'Aufbruch' }, { key: 'verschleiss', label: 'Verschleiß' }, { key: 'bordstein', label: 'Bordstein beschädigt' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'schadensbeschreibung', label: 'Kurze Beschreibung', type: 'string/textarea' },
];
const SCHADENSMELDUNGEN_FIELDS = [
  { key: 'strasse', label: 'Straße', type: 'applookup/select', targetEntity: 'straßenverzeichnis', targetAppId: 'STRASSENVERZEICHNIS', displayField: 'strassenname' },
  { key: 'schadenstyp', label: 'Schadenstyp', type: 'lookup/select', options: [{ key: 'schlagloch', label: 'Schlagloch' }, { key: 'riss', label: 'Riss/Spalte' }, { key: 'absenkung', label: 'Absenkung' }, { key: 'aufbruch', label: 'Aufbruch' }, { key: 'verschleiss', label: 'Verschleiß der Fahrbahndecke' }, { key: 'bordstein', label: 'Beschädigte Bordsteinkante' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'schweregrad', label: 'Schweregrad', type: 'lookup/radio', options: [{ key: 'gering', label: 'Gering' }, { key: 'mittel', label: 'Mittel' }, { key: 'hoch', label: 'Hoch' }, { key: 'kritisch', label: 'Kritisch' }] },
  { key: 'hausnummer_bereich', label: 'Hausnummer/Bereich', type: 'string/text' },
  { key: 'gps_position', label: 'GPS-Position', type: 'geo' },
  { key: 'beschreibung', label: 'Beschreibung des Schadens', type: 'string/textarea' },
  { key: 'fotos', label: 'Fotos', type: 'file' },
  { key: 'meldedatum', label: 'Meldedatum', type: 'date/date' },
  { key: 'status', label: 'Status', type: 'lookup/select', options: [{ key: 'gemeldet', label: 'Gemeldet' }, { key: 'in_bearbeitung', label: 'In Bearbeitung' }, { key: 'behoben', label: 'Behoben' }, { key: 'abgelehnt', label: 'Abgelehnt' }] },
  { key: 'melder_vorname', label: 'Vorname', type: 'string/text' },
  { key: 'melder_nachname', label: 'Nachname', type: 'string/text' },
  { key: 'melder_email', label: 'E-Mail', type: 'string/email' },
  { key: 'melder_telefon', label: 'Telefon', type: 'string/tel' },
];

const ENTITY_TABS = [
  { key: 'straßenverzeichnis', label: 'Straßenverzeichnis', pascal: 'Strassenverzeichnis' },
  { key: 'schnellmeldung', label: 'Schnellmeldung', pascal: 'Schnellmeldung' },
  { key: 'schadensmeldungen', label: 'Schadensmeldungen', pascal: 'Schadensmeldungen' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('straßenverzeichnis');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    straßenverzeichnis: new Set(),
    schnellmeldung: new Set(),
    schadensmeldungen: new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    straßenverzeichnis: {},
    schnellmeldung: {},
    schadensmeldungen: {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'straßenverzeichnis': return (data as any).strassenverzeichnis as Strassenverzeichnis[] ?? [];
      case 'schnellmeldung': return (data as any).schnellmeldung as Schnellmeldung[] ?? [];
      case 'schadensmeldungen': return (data as any).schadensmeldungen as Schadensmeldungen[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'schnellmeldung':
        lists.straßenverzeichnisList = (data as any).strassenverzeichnis ?? [];
        break;
      case 'schadensmeldungen':
        lists.straßenverzeichnisList = (data as any).strassenverzeichnis ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    if (entity === 'schnellmeldung' && fieldKey === 'strasse_auswahl') {
      const match = (lists.straßenverzeichnisList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.strassenname ?? '—';
    }
    if (entity === 'schadensmeldungen' && fieldKey === 'strasse') {
      const match = (lists.straßenverzeichnisList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.strassenname ?? '—';
    }
    return url;
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'straßenverzeichnis': return STRASSENVERZEICHNIS_FIELDS;
      case 'schnellmeldung': return SCHNELLMELDUNG_FIELDS;
      case 'schadensmeldungen': return SCHADENSMELDUNGEN_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return records.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'straßenverzeichnis': return {
        create: (fields: any) => LivingAppsService.createStrassenverzeichni(fields),
        update: (id: string, fields: any) => LivingAppsService.updateStrassenverzeichni(id, fields),
        remove: (id: string) => LivingAppsService.deleteStrassenverzeichni(id),
      };
      case 'schnellmeldung': return {
        create: (fields: any) => LivingAppsService.createSchnellmeldungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateSchnellmeldungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteSchnellmeldungEntry(id),
      };
      case 'schadensmeldungen': return {
        create: (fields: any) => LivingAppsService.createSchadensmeldungenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateSchadensmeldungenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteSchadensmeldungenEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSortKey(''); setSortDir('asc'); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <Filter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Feld bearbeiten
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Ausgewählte löschen
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <X className="h-3.5 w-3.5 mr-1" /> Auswahl aufheben
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><Badge variant="secondary">{val?.label ?? '—'}</Badge></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}>{getApplookupDisplay(activeTab, fm.key, val)}</TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'straßenverzeichnis' || dialogState?.entity === 'straßenverzeichnis') && (
        <StrassenverzeichnisDialog
          open={createEntity === 'straßenverzeichnis' || dialogState?.entity === 'straßenverzeichnis'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'straßenverzeichnis' ? handleUpdate : (fields: any) => handleCreate('straßenverzeichnis', fields)}
          defaultValues={dialogState?.entity === 'straßenverzeichnis' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Strassenverzeichnis']}
        />
      )}
      {(createEntity === 'schnellmeldung' || dialogState?.entity === 'schnellmeldung') && (
        <SchnellmeldungDialog
          open={createEntity === 'schnellmeldung' || dialogState?.entity === 'schnellmeldung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'schnellmeldung' ? handleUpdate : (fields: any) => handleCreate('schnellmeldung', fields)}
          defaultValues={dialogState?.entity === 'schnellmeldung' ? dialogState.record?.fields : undefined}
          straßenverzeichnisList={(data as any).strassenverzeichnis ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Schnellmeldung']}
        />
      )}
      {(createEntity === 'schadensmeldungen' || dialogState?.entity === 'schadensmeldungen') && (
        <SchadensmeldungenDialog
          open={createEntity === 'schadensmeldungen' || dialogState?.entity === 'schadensmeldungen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'schadensmeldungen' ? handleUpdate : (fields: any) => handleCreate('schadensmeldungen', fields)}
          defaultValues={dialogState?.entity === 'schadensmeldungen' ? dialogState.record?.fields : undefined}
          straßenverzeichnisList={(data as any).strassenverzeichnis ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Schadensmeldungen']}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}