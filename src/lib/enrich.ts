import type { EnrichedSchadensmeldungen, EnrichedSchnellmeldung } from '@/types/enriched';
import type { Schadensmeldungen, Schnellmeldung, Strassenverzeichnis } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface SchnellmeldungMaps {
  strassenverzeichnisMap: Map<string, Strassenverzeichnis>;
}

export function enrichSchnellmeldung(
  schnellmeldung: Schnellmeldung[],
  maps: SchnellmeldungMaps
): EnrichedSchnellmeldung[] {
  return schnellmeldung.map(r => ({
    ...r,
    strasse_auswahlName: resolveDisplay(r.fields.strasse_auswahl, maps.strassenverzeichnisMap, 'strassenname'),
  }));
}

interface SchadensmeldungenMaps {
  strassenverzeichnisMap: Map<string, Strassenverzeichnis>;
}

export function enrichSchadensmeldungen(
  schadensmeldungen: Schadensmeldungen[],
  maps: SchadensmeldungenMaps
): EnrichedSchadensmeldungen[] {
  return schadensmeldungen.map(r => ({
    ...r,
    strasseName: resolveDisplay(r.fields.strasse, maps.strassenverzeichnisMap, 'strassenname'),
  }));
}
