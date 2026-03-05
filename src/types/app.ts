// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Strassenverzeichnis {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    strassenname?: string;
    stadtteil?: string;
    strassentyp?: LookupValue;
    notizen?: string;
  };
}

export interface Schnellmeldung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    email?: string;
    telefon?: string;
    foto?: string;
    vorname?: string;
    nachname?: string;
    strasse_auswahl?: string; // applookup -> URL zu 'Strassenverzeichnis' Record
    position_beschreibung?: string;
    gps_koordinaten?: GeoLocation; // { lat, long, info }
    art_des_schadens?: LookupValue;
    schadensbeschreibung?: string;
  };
}

export interface Schadensmeldungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    strasse?: string; // applookup -> URL zu 'Strassenverzeichnis' Record
    schadenstyp?: LookupValue;
    schweregrad?: LookupValue;
    hausnummer_bereich?: string;
    gps_position?: GeoLocation; // { lat, long, info }
    beschreibung?: string;
    fotos?: string;
    meldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    melder_vorname?: string;
    melder_nachname?: string;
    melder_email?: string;
    melder_telefon?: string;
  };
}

export const APP_IDS = {
  STRASSENVERZEICHNIS: '69a950402ada32cf440e589b',
  SCHNELLMELDUNG: '69a95045c0c7650f1a2b48e5',
  SCHADENSMELDUNGEN: '69a950448f0cebf4f85d78ee',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  straßenverzeichnis: {
    strassentyp: [{ key: "hauptstrasse", label: "Hauptstraße" }, { key: "nebenstrasse", label: "Nebenstraße" }, { key: "anliegerstrasse", label: "Anliegerstraße" }, { key: "fussgaengerzone", label: "Fußgängerzone" }, { key: "platz", label: "Platz" }],
  },
  schnellmeldung: {
    art_des_schadens: [{ key: "schlagloch", label: "Schlagloch" }, { key: "riss", label: "Riss/Spalte" }, { key: "absenkung", label: "Absenkung" }, { key: "aufbruch", label: "Aufbruch" }, { key: "verschleiss", label: "Verschleiß" }, { key: "bordstein", label: "Bordstein beschädigt" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  schadensmeldungen: {
    schadenstyp: [{ key: "schlagloch", label: "Schlagloch" }, { key: "riss", label: "Riss/Spalte" }, { key: "absenkung", label: "Absenkung" }, { key: "aufbruch", label: "Aufbruch" }, { key: "verschleiss", label: "Verschleiß der Fahrbahndecke" }, { key: "bordstein", label: "Beschädigte Bordsteinkante" }, { key: "sonstiges", label: "Sonstiges" }],
    schweregrad: [{ key: "gering", label: "Gering" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }, { key: "kritisch", label: "Kritisch" }],
    status: [{ key: "gemeldet", label: "Gemeldet" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "behoben", label: "Behoben" }, { key: "abgelehnt", label: "Abgelehnt" }],
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateStrassenverzeichnis = StripLookup<Strassenverzeichnis['fields']>;
export type CreateSchnellmeldung = StripLookup<Schnellmeldung['fields']>;
export type CreateSchadensmeldungen = StripLookup<Schadensmeldungen['fields']>;