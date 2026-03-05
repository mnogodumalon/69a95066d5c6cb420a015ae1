import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Schnellmeldung, Strassenverzeichnis } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { SchnellmeldungDialog } from '@/components/dialogs/SchnellmeldungDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN } from '@/config/ai-features';

export default function SchnellmeldungPage() {
  const [records, setRecords] = useState<Schnellmeldung[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Schnellmeldung | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schnellmeldung | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [straßenverzeichnisList, setStrassenverzeichnisList] = useState<Strassenverzeichnis[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, straßenverzeichnisData] = await Promise.all([
        LivingAppsService.getSchnellmeldung(),
        LivingAppsService.getStrassenverzeichnis(),
      ]);
      setRecords(mainData);
      setStrassenverzeichnisList(straßenverzeichnisData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Schnellmeldung['fields']) {
    await LivingAppsService.createSchnellmeldungEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Schnellmeldung['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateSchnellmeldungEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteSchnellmeldungEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getStrassenverzeichnisDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return straßenverzeichnisList.find(r => r.record_id === id)?.fields.strassenname ?? '—';
  }

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.some(item => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
      if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
      return String(v).toLowerCase().includes(s);
    });
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Schnellmeldung"
      subtitle={`${records.length} Schnellmeldung im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Schnellmeldung suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('email')}>
                <span className="inline-flex items-center gap-1">
                  E-Mail
                  {sortKey === 'email' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('telefon')}>
                <span className="inline-flex items-center gap-1">
                  Telefon
                  {sortKey === 'telefon' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('foto')}>
                <span className="inline-flex items-center gap-1">
                  Foto (optional)
                  {sortKey === 'foto' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('vorname')}>
                <span className="inline-flex items-center gap-1">
                  Vorname
                  {sortKey === 'vorname' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('nachname')}>
                <span className="inline-flex items-center gap-1">
                  Nachname
                  {sortKey === 'nachname' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('strasse_auswahl')}>
                <span className="inline-flex items-center gap-1">
                  Straße
                  {sortKey === 'strasse_auswahl' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('position_beschreibung')}>
                <span className="inline-flex items-center gap-1">
                  Position (Hausnummer/Bereich)
                  {sortKey === 'position_beschreibung' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gps_koordinaten')}>
                <span className="inline-flex items-center gap-1">
                  Standort
                  {sortKey === 'gps_koordinaten' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('art_des_schadens')}>
                <span className="inline-flex items-center gap-1">
                  Art des Schadens
                  {sortKey === 'art_des_schadens' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('schadensbeschreibung')}>
                <span className="inline-flex items-center gap-1">
                  Kurze Beschreibung
                  {sortKey === 'schadensbeschreibung' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">{record.fields.email ?? '—'}</TableCell>
                <TableCell>{record.fields.telefon ?? '—'}</TableCell>
                <TableCell>{record.fields.foto ? <div className="relative h-8 w-8 rounded bg-muted overflow-hidden"><div className="absolute inset-0 flex items-center justify-center"><FileText size={14} className="text-muted-foreground" /></div><img src={record.fields.foto} alt="" className="relative h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /></div> : '—'}</TableCell>
                <TableCell>{record.fields.vorname ?? '—'}</TableCell>
                <TableCell>{record.fields.nachname ?? '—'}</TableCell>
                <TableCell>{getStrassenverzeichnisDisplayName(record.fields.strasse_auswahl)}</TableCell>
                <TableCell>{record.fields.position_beschreibung ?? '—'}</TableCell>
                <TableCell className="max-w-[200px]"><span className="truncate block" title={record.fields.gps_koordinaten ? `${record.fields.gps_koordinaten.lat}, ${record.fields.gps_koordinaten.long}` : undefined}>{record.fields.gps_koordinaten?.info ?? (record.fields.gps_koordinaten ? `${record.fields.gps_koordinaten.lat?.toFixed(4)}, ${record.fields.gps_koordinaten.long?.toFixed(4)}` : '—')}</span></TableCell>
                <TableCell><Badge variant="secondary">{record.fields.art_des_schadens?.label ?? '—'}</Badge></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.schadensbeschreibung ?? '—'}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Schnellmeldung. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SchnellmeldungDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        straßenverzeichnisList={straßenverzeichnisList}
        enablePhotoScan={AI_PHOTO_SCAN['Schnellmeldung']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Schnellmeldung löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </PageShell>
  );
}