// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Strassenverzeichnis, Schnellmeldung, Schadensmeldungen } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://my.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: unknown): string | null {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://my.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

async function callApi(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Nutze Session Cookies für Auth
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

/** Upload a file to LivingApps. Returns the file URL for use in record fields. */
export async function uploadFile(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename ?? (file instanceof File ? file.name : 'upload'));
  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error(`File upload failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}

function enrichLookupFields<T extends { fields: Record<string, unknown> }>(
  records: T[], entityKey: string
): T[] {
  const opts = LOOKUP_OPTIONS[entityKey];
  if (!opts) return records;
  return records.map(r => {
    const fields = { ...r.fields };
    for (const [fieldKey, options] of Object.entries(opts)) {
      const val = fields[fieldKey];
      if (typeof val === 'string') {
        const m = options.find(o => o.key === val);
        fields[fieldKey] = m ?? { key: val, label: val };
      } else if (Array.isArray(val)) {
        fields[fieldKey] = val.map(v => {
          if (typeof v === 'string') {
            const m = options.find(o => o.key === v);
            return m ?? { key: v, label: v };
          }
          return v;
        });
      }
    }
    return { ...r, fields } as T;
  });
}

export class LivingAppsService {
  // --- STRASSENVERZEICHNIS ---
  static async getStrassenverzeichnis(): Promise<Strassenverzeichnis[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.STRASSENVERZEICHNIS}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Strassenverzeichnis[];
    return enrichLookupFields(records, 'straßenverzeichnis');
  }
  static async getStrassenverzeichni(id: string): Promise<Strassenverzeichnis | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.STRASSENVERZEICHNIS}/records/${id}`);
    const record = { record_id: data.id, ...data } as Strassenverzeichnis;
    return enrichLookupFields([record], 'straßenverzeichnis')[0];
  }
  static async createStrassenverzeichni(fields: Strassenverzeichnis['fields']) {
    return callApi('POST', `/apps/${APP_IDS.STRASSENVERZEICHNIS}/records`, { fields });
  }
  static async updateStrassenverzeichni(id: string, fields: Partial<Strassenverzeichnis['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.STRASSENVERZEICHNIS}/records/${id}`, { fields });
  }
  static async deleteStrassenverzeichni(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.STRASSENVERZEICHNIS}/records/${id}`);
  }

  // --- SCHNELLMELDUNG ---
  static async getSchnellmeldung(): Promise<Schnellmeldung[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHNELLMELDUNG}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Schnellmeldung[];
    return enrichLookupFields(records, 'schnellmeldung');
  }
  static async getSchnellmeldungEntry(id: string): Promise<Schnellmeldung | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHNELLMELDUNG}/records/${id}`);
    const record = { record_id: data.id, ...data } as Schnellmeldung;
    return enrichLookupFields([record], 'schnellmeldung')[0];
  }
  static async createSchnellmeldungEntry(fields: Schnellmeldung['fields']) {
    return callApi('POST', `/apps/${APP_IDS.SCHNELLMELDUNG}/records`, { fields });
  }
  static async updateSchnellmeldungEntry(id: string, fields: Partial<Schnellmeldung['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.SCHNELLMELDUNG}/records/${id}`, { fields });
  }
  static async deleteSchnellmeldungEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.SCHNELLMELDUNG}/records/${id}`);
  }

  // --- SCHADENSMELDUNGEN ---
  static async getSchadensmeldungen(): Promise<Schadensmeldungen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHADENSMELDUNGEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Schadensmeldungen[];
    return enrichLookupFields(records, 'schadensmeldungen');
  }
  static async getSchadensmeldungenEntry(id: string): Promise<Schadensmeldungen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHADENSMELDUNGEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Schadensmeldungen;
    return enrichLookupFields([record], 'schadensmeldungen')[0];
  }
  static async createSchadensmeldungenEntry(fields: Schadensmeldungen['fields']) {
    return callApi('POST', `/apps/${APP_IDS.SCHADENSMELDUNGEN}/records`, { fields });
  }
  static async updateSchadensmeldungenEntry(id: string, fields: Partial<Schadensmeldungen['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.SCHADENSMELDUNGEN}/records/${id}`, { fields });
  }
  static async deleteSchadensmeldungenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.SCHADENSMELDUNGEN}/records/${id}`);
  }

}