import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichSchadensmeldungen } from '@/lib/enrich';
import type { EnrichedSchadensmeldungen } from '@/types/enriched';
import type { Schadensmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { SchadensmeldungenDialog } from '@/components/dialogs/SchadensmeldungenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatCard } from '@/components/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  MapPin,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Construction,
  ChevronRight,
} from 'lucide-react';

const STATUS_COLUMNS = [
  {
    key: 'gemeldet',
    label: 'Gemeldet',
    icon: AlertCircle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    headerBg: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    key: 'in_bearbeitung',
    label: 'In Bearbeitung',
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    headerBg: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-800',
  },
  {
    key: 'behoben',
    label: 'Behoben',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    headerBg: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  {
    key: 'abgelehnt',
    label: 'Abgelehnt',
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 border-red-200',
    headerBg: 'bg-red-400',
    badge: 'bg-red-100 text-red-700',
  },
] as const;

const SEVERITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  kritisch: { label: 'Kritisch', color: 'text-red-700 bg-red-100 border-red-200', dot: 'bg-red-500' },
  hoch:     { label: 'Hoch',     color: 'text-orange-700 bg-orange-100 border-orange-200', dot: 'bg-orange-500' },
  mittel:   { label: 'Mittel',   color: 'text-yellow-700 bg-yellow-100 border-yellow-200', dot: 'bg-yellow-500' },
  gering:   { label: 'Gering',   color: 'text-green-700 bg-green-100 border-green-200', dot: 'bg-green-500' },
};

export default function DashboardOverview() {
  const {
    strassenverzeichnis, schadensmeldungen,
    strassenverzeichnisMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedSchadensmeldungen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedSchadensmeldungen | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const enriched = useMemo(
    () => enrichSchadensmeldungen(schadensmeldungen, { strassenverzeichnisMap }),
    [schadensmeldungen, strassenverzeichnisMap]
  );

  const columnData = useMemo(() => {
    const map: Record<string, EnrichedSchadensmeldungen[]> = {
      gemeldet: [],
      in_bearbeitung: [],
      behoben: [],
      abgelehnt: [],
    };
    enriched.forEach(r => {
      const key = r.fields.status?.key ?? 'gemeldet';
      if (map[key]) map[key].push(r);
      else map['gemeldet'].push(r);
    });
    // Sort each column by severity then date
    const severityOrder = { kritisch: 0, hoch: 1, mittel: 2, gering: 3 };
    Object.keys(map).forEach(col => {
      map[col].sort((a, b) => {
        const sa = severityOrder[a.fields.schweregrad?.key as keyof typeof severityOrder] ?? 4;
        const sb = severityOrder[b.fields.schweregrad?.key as keyof typeof severityOrder] ?? 4;
        if (sa !== sb) return sa - sb;
        return (b.fields.meldedatum ?? '').localeCompare(a.fields.meldedatum ?? '');
      });
    });
    return map;
  }, [enriched]);

  const stats = useMemo(() => ({
    total: schadensmeldungen.length,
    kritisch: schadensmeldungen.filter(r => r.fields.schweregrad?.key === 'kritisch').length,
    offen: (columnData.gemeldet?.length ?? 0) + (columnData.in_bearbeitung?.length ?? 0),
    strassen: strassenverzeichnis.length,
  }), [schadensmeldungen, columnData, strassenverzeichnis]);

  const handleStatusChange = async (record: EnrichedSchadensmeldungen, newStatus: string) => {
    await LivingAppsService.updateSchadensmeldungenEntry(record.record_id, { status: newStatus as any });
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteSchadensmeldungenEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schadensübersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Schadensmeldungen nach Status verwalten</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
          <Plus size={16} />
          Neue Meldung
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(stats.total)}
          description="Schadensmeldungen"
          icon={<Construction size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offen"
          value={String(stats.offen)}
          description="Gemeldet / In Bearbeitung"
          icon={<AlertTriangle size={18} className="text-amber-500" />}
        />
        <StatCard
          title="Kritisch"
          value={String(stats.kritisch)}
          description="Hoher Schweregrad"
          icon={<AlertCircle size={18} className="text-red-500" />}
        />
        <StatCard
          title="Straßen"
          value={String(stats.strassen)}
          description="Im Verzeichnis"
          icon={<MapPin size={18} className="text-primary" />}
        />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(col => {
          const Icon = col.icon;
          const cards = columnData[col.key] ?? [];
          return (
            <div key={col.key} className="flex flex-col gap-0 min-h-[400px]">
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <Icon size={15} className="text-white/90" />
                  <span className="text-sm font-semibold text-white">{col.label}</span>
                </div>
                <span className="text-xs font-bold text-white/80 bg-white/20 rounded-full px-2 py-0.5">
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className={`flex-1 rounded-b-xl border ${col.bg} p-2 space-y-2 overflow-y-auto max-h-[600px]`}>
                {cards.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Icon size={28} className={`${col.color} opacity-30 mb-2`} />
                    <p className="text-xs text-muted-foreground">Keine Meldungen</p>
                  </div>
                )}

                {cards.map(record => {
                  const sevKey = record.fields.schweregrad?.key ?? '';
                  const sev = SEVERITY_CONFIG[sevKey];
                  const isExpanded = expandedCard === record.record_id;

                  return (
                    <div
                      key={record.record_id}
                      className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Card top bar: severity */}
                      {sev && (
                        <div className={`h-1 w-full ${sev.dot}`} />
                      )}

                      <div className="p-3">
                        {/* Street + damage type */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {record.strasseName || 'Straße unbekannt'}
                            </p>
                            {record.fields.hausnummer_bereich && (
                              <p className="text-xs text-muted-foreground truncate">
                                Nr. {record.fields.hausnummer_bereich}
                              </p>
                            )}
                          </div>
                          {sev && (
                            <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${sev.color}`}>
                              {sev.label}
                            </span>
                          )}
                        </div>

                        {/* Damage type */}
                        {record.fields.schadenstyp && (
                          <div className="mt-1.5">
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                              {record.fields.schadenstyp.label}
                            </span>
                          </div>
                        )}

                        {/* Date */}
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <CalendarDays size={11} />
                          <span>{formatDate(record.fields.meldedatum)}</span>
                        </div>

                        {/* Expand toggle */}
                        <button
                          className="mt-2 flex items-center gap-1 text-xs text-primary/80 hover:text-primary transition-colors"
                          onClick={() => setExpandedCard(isExpanded ? null : record.record_id)}
                        >
                          <ChevronRight size={12} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          {isExpanded ? 'Weniger' : 'Details'}
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
                            {record.fields.beschreibung && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {record.fields.beschreibung}
                              </p>
                            )}
                            {(record.fields.melder_vorname || record.fields.melder_nachname) && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Melder:</span>{' '}
                                {[record.fields.melder_vorname, record.fields.melder_nachname].filter(Boolean).join(' ')}
                              </div>
                            )}
                            {record.fields.melder_email && (
                              <div className="text-xs text-muted-foreground truncate">
                                <span className="font-medium">E-Mail:</span>{' '}
                                {record.fields.melder_email}
                              </div>
                            )}
                            {record.fields.gps_position && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">GPS:</span>{' '}
                                {record.fields.gps_position.info || `${record.fields.gps_position.lat?.toFixed(5)}, ${record.fields.gps_position.long?.toFixed(5)}`}
                              </div>
                            )}

                            {/* Status change buttons */}
                            <div className="pt-1">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                Status ändern
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {STATUS_COLUMNS.filter(s => s.key !== col.key).map(s => (
                                  <button
                                    key={s.key}
                                    onClick={() => handleStatusChange(record, s.key)}
                                    className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors hover:opacity-80 ${s.badge}`}
                                  >
                                    → {s.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-border/30">
                          <button
                            onClick={() => setEditRecord(record)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(record)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <SchadensmeldungenDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (fields) => {
          await LivingAppsService.createSchadensmeldungenEntry(fields);
          fetchAll();
        }}
        straßenverzeichnisList={strassenverzeichnis}
        enablePhotoScan={AI_PHOTO_SCAN['Schadensmeldungen']}
      />

      {/* Edit Dialog */}
      {editRecord && (
        <SchadensmeldungenDialog
          open={!!editRecord}
          onClose={() => setEditRecord(null)}
          onSubmit={async (fields) => {
            await LivingAppsService.updateSchadensmeldungenEntry(editRecord.record_id, fields);
            setEditRecord(null);
            fetchAll();
          }}
          defaultValues={editRecord.fields}
          straßenverzeichnisList={strassenverzeichnis}
          enablePhotoScan={AI_PHOTO_SCAN['Schadensmeldungen']}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Meldung löschen"
        description={`Soll die Meldung für "${deleteTarget?.strasseName || 'diese Straße'}" wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-96 rounded-xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
