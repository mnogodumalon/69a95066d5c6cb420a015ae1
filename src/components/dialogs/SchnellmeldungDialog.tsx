import { useState, useEffect, useRef, useCallback } from 'react';
import type { Schnellmeldung, Strassenverzeichnis } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, uploadFile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Camera, CheckCircle2, ChevronDown, Crosshair, FileText, ImagePlus, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { fileToDataUri, extractFromPhoto, dataUriToBlob } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface SchnellmeldungDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Schnellmeldung['fields']) => Promise<void>;
  defaultValues?: Schnellmeldung['fields'];
  straßenverzeichnisList: Strassenverzeichnis[];
  enablePhotoScan?: boolean;
}

export function SchnellmeldungDialog({ open, onClose, onSubmit, defaultValues, straßenverzeichnisList, enablePhotoScan = false }: SchnellmeldungDialogProps) {
  const [fields, setFields] = useState<Partial<Schnellmeldung['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
    }
  }, [open, defaultValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean: Record<string, unknown> = { ...fields };
      for (const [k, v] of Object.entries(clean)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && 'key' in v) clean[k] = (v as any).key;
        if (Array.isArray(v)) clean[k] = v.map((item: any) => item && typeof item === 'object' && 'key' in item ? item.key : item);
      }
      await onSubmit(clean as Schnellmeldung['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const [locating, setLocating] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  async function geoLocate(fieldKey: string) {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      let info = '';
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        info = data.display_name ?? '';
      } catch {}
      setFields(f => ({ ...f, [fieldKey]: { lat: latitude, long: longitude, info } as any }));
      setLocating(false);
    }, () => { setLocating(false); });
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    setScanSuccess(false);
    try {
      const uri = await fileToDataUri(file);
      if (file.type.startsWith('image/')) setPreview(uri);
      const schema = `{\n  "email": string | null, // E-Mail\n  "telefon": string | null, // Telefon\n  "vorname": string | null, // Vorname\n  "nachname": string | null, // Nachname\n  "strasse_auswahl": string | null, // Name des Straßenverzeichnis-Eintrags (z.B. "Jonas Schmidt")\n  "position_beschreibung": string | null, // Position (Hausnummer/Bereich)\n  "art_des_schadens": string | null, // one of: "Schlagloch", "Riss/Spalte", "Absenkung", "Aufbruch", "Verschleiß", "Bordstein beschädigt", "Sonstiges" // Art des Schadens\n  "schadensbeschreibung": string | null, // Kurze Beschreibung\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const _lookupOptions: Record<string, {key:string,label:string}[]> = {
          "art_des_schadens": [{key:"schlagloch",label:"Schlagloch"}, {key:"riss",label:"Riss/Spalte"}, {key:"absenkung",label:"Absenkung"}, {key:"aufbruch",label:"Aufbruch"}, {key:"verschleiss",label:"Verschleiß"}, {key:"bordstein",label:"Bordstein beschädigt"}, {key:"sonstiges",label:"Sonstiges"}],
        };
        function _resolveLookup(fieldKey: string, val: unknown) {
          const opts = _lookupOptions[fieldKey];
          if (!opts || val == null) return val;
          if (typeof val === 'string') {
            const v = val.toLowerCase().trim();
            const match = opts.find(o => o.label.toLowerCase() === v || o.key.toLowerCase() === v);
            if (match) return match;
          }
          if (Array.isArray(val)) {
            return val.map(item => {
              if (typeof item === 'string') {
                const iv = item.toLowerCase().trim();
                const m = opts.find(o => o.label.toLowerCase() === iv || o.key.toLowerCase() === iv);
                return m || item;
              }
              return item;
            });
          }
          return val;
        }
        const applookupKeys = new Set<string>(["strasse_auswahl"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = _lookupOptions[k] ? _resolveLookup(k, v) : v;
        }
        const strasse_auswahlName = raw['strasse_auswahl'] as string | null;
        if (strasse_auswahlName) {
          const strasse_auswahlMatch = straßenverzeichnisList.find(r => matchName(strasse_auswahlName!, [String(r.fields.strassenname ?? '')]));
          if (strasse_auswahlMatch) merged['strasse_auswahl'] = createRecordUrl(APP_IDS.STRASSENVERZEICHNIS, strasse_auswahlMatch.record_id);
        }
        return merged as Partial<Schnellmeldung['fields']>;
      });
      // Upload scanned file to file fields
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        try {
          const blob = dataUriToBlob(uri);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, foto: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handlePhotoScan(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handlePhotoScan(file);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Schnellmeldung bearbeiten' : 'Schnellmeldung hinzufügen'}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              KI-Erkennung
              <span className="text-muted-foreground font-normal">(füllt Felder automatisch aus)</span>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <ImagePlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hochladen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <Camera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={fields.email ?? ''}
              onChange={e => setFields(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefon</Label>
            <Input
              id="telefon"
              value={fields.telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="foto">Foto (optional)</Label>
            {fields.foto ? (
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText size={20} className="text-muted-foreground" />
                  </div>
                  <img
                    src={fields.foto}
                    alt=""
                    className="relative h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">{fields.foto.split("/").pop()}</p>
                  <div className="flex gap-2 mt-1">
                    <label
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Ändern
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const fileUrl = await uploadFile(file, file.name);
                            setFields(f => ({ ...f, foto: fileUrl }));
                          } catch (err) { console.error('Upload failed:', err); }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFields(f => ({ ...f, foto: undefined }))}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <Upload size={20} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Datei hochladen</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fileUrl = await uploadFile(file, file.name);
                      setFields(f => ({ ...f, foto: fileUrl }));
                    } catch (err) { console.error('Upload failed:', err); }
                  }}
                />
              </label>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vorname">Vorname</Label>
            <Input
              id="vorname"
              value={fields.vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nachname">Nachname</Label>
            <Input
              id="nachname"
              value={fields.nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strasse_auswahl">Straße</Label>
            <Select
              value={extractRecordId(fields.strasse_auswahl) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, strasse_auswahl: v === 'none' ? undefined : createRecordUrl(APP_IDS.STRASSENVERZEICHNIS, v) }))}
            >
              <SelectTrigger id="strasse_auswahl"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {straßenverzeichnisList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.strassenname ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="position_beschreibung">Position (Hausnummer/Bereich)</Label>
            <Input
              id="position_beschreibung"
              value={fields.position_beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, position_beschreibung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gps_koordinaten">Standort</Label>
            <div className="space-y-3">
              <Button type="button" variant="outline" className="w-full" disabled={locating} onClick={() => geoLocate("gps_koordinaten")}>
                {locating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Crosshair className="h-4 w-4 mr-1.5" />}
                Aktuellen Standort verwenden
              </Button>
              {fields.gps_koordinaten?.info && (
                <p className="text-sm text-muted-foreground break-words whitespace-normal">
                  {fields.gps_koordinaten.info}
                </p>
              )}
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" onClick={() => setShowCoords(v => !v)}>
                {showCoords ? 'Koordinaten verbergen' : 'Koordinaten anzeigen'}
                <ChevronDown className={`h-3 w-3 transition-transform ${showCoords ? "rotate-180" : ""}`} />
              </button>
              {showCoords && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Breitengrad</Label>
                    <Input type="number" step="any"
                      value={fields.gps_koordinaten?.lat ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, gps_koordinaten: { ...(f.gps_koordinaten as any ?? {}), lat: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Längengrad</Label>
                    <Input type="number" step="any"
                      value={fields.gps_koordinaten?.long ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, gps_koordinaten: { ...(f.gps_koordinaten as any ?? {}), long: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="art_des_schadens">Art des Schadens</Label>
            <Select
              value={lookupKey(fields.art_des_schadens) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, art_des_schadens: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="art_des_schadens"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="schlagloch">Schlagloch</SelectItem>
                <SelectItem value="riss">Riss/Spalte</SelectItem>
                <SelectItem value="absenkung">Absenkung</SelectItem>
                <SelectItem value="aufbruch">Aufbruch</SelectItem>
                <SelectItem value="verschleiss">Verschleiß</SelectItem>
                <SelectItem value="bordstein">Bordstein beschädigt</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schadensbeschreibung">Kurze Beschreibung</Label>
            <Textarea
              id="schadensbeschreibung"
              value={fields.schadensbeschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, schadensbeschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}