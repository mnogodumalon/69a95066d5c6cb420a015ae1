import type { Schadensmeldungen, Schnellmeldung } from './app';

export type EnrichedSchnellmeldung = Schnellmeldung & {
  strasse_auswahlName: string;
};

export type EnrichedSchadensmeldungen = Schadensmeldungen & {
  strasseName: string;
};
