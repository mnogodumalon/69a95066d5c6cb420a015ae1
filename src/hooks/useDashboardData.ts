import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Strassenverzeichnis, Schnellmeldung, Schadensmeldungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [strassenverzeichnis, setStrassenverzeichnis] = useState<Strassenverzeichnis[]>([]);
  const [schnellmeldung, setSchnellmeldung] = useState<Schnellmeldung[]>([]);
  const [schadensmeldungen, setSchadensmeldungen] = useState<Schadensmeldungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [strassenverzeichnisData, schnellmeldungData, schadensmeldungenData] = await Promise.all([
        LivingAppsService.getStrassenverzeichnis(),
        LivingAppsService.getSchnellmeldung(),
        LivingAppsService.getSchadensmeldungen(),
      ]);
      setStrassenverzeichnis(strassenverzeichnisData);
      setSchnellmeldung(schnellmeldungData);
      setSchadensmeldungen(schadensmeldungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const strassenverzeichnisMap = useMemo(() => {
    const m = new Map<string, Strassenverzeichnis>();
    strassenverzeichnis.forEach(r => m.set(r.record_id, r));
    return m;
  }, [strassenverzeichnis]);

  return { strassenverzeichnis, setStrassenverzeichnis, schnellmeldung, setSchnellmeldung, schadensmeldungen, setSchadensmeldungen, loading, error, fetchAll, strassenverzeichnisMap };
}