import { createIsomorphicFn } from "@tanstack/react-start";
import { clsx, type ClassValue } from "clsx";
import SuperJSON from "superjson";
import { twMerge } from "tailwind-merge";

export const CHANNEL = "WEDDING_TIMERS";
export const TIMER_UPDATED = "TIMER_UPDATED";
export const ACTION_UPDATED = "ACTION_UPDATED";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const logger = createIsomorphicFn()
  .server((msg) => console.log(`[SERVER]: ${msg}`))
  .client((msg) => console.log(`[CLIENT]: ${msg}`));

export const transformer = SuperJSON;

/**
 * Utilitaires pour la gestion des dates "timezone-agnostic"
 *
 * Le principe : les dates en DB sont stockées en UTC mais représentent des heures locales "naïves"
 * Par exemple, si on veut que quelque chose se déclenche à 17:05 locale, on stocke "2025-10-25T17:05:00.000Z"
 * et on l'interprète comme 17:05 dans le fuseau horaire de l'utilisateur
 */

/**
 * Crée une date "timezone-agnostic" à partir de composants de date/heure locaux
 * @param year - Année
 * @param month - Mois (1-12)
 * @param day - Jour du mois
 * @param hours - Heures (0-23)
 * @param minutes - Minutes (0-59)
 * @param seconds - Secondes (0-59), par défaut 0
 * @returns Date UTC qui représente l'heure locale spécifiée
 *
 * @example
 * // Pour créer un timer qui se déclenche à 17:05 locale
 * const scheduledTime = createTimezoneAgnosticDate(2025, 10, 25, 17, 5);
 * // Résultat : 2025-10-25T17:05:00.000Z
 */
export function createTimezoneAgnosticDate(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number = 0,
): Date {
  // Créer une date UTC avec les composants fournis
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, 0));
}

/**
 * Extrait les composants de date/heure d'une date "timezone-agnostic"
 * @param date - La date à extraire (peut être Date ou string ISO)
 * @returns Objet contenant les composants de date/heure
 *
 * @example
 * const dbDate = new Date("2025-10-25T17:05:00.000Z");
 * const components = getTimezoneAgnosticComponents(dbDate);
 * // Résultat : { year: 2025, month: 10, day: 25, hours: 17, minutes: 5, seconds: 0 }
 */
export function getTimezoneAgnosticComponents(date: Date | string): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const d = typeof date === "string" ? new Date(date) : date;

  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1, // 1-12
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    seconds: d.getUTCSeconds(),
  };
}

/**
 * Convertit une date "timezone-agnostic" en date locale pour l'affichage
 * Cette fonction crée une nouvelle Date avec les mêmes composants mais dans le fuseau local
 *
 * @param date - La date stockée en DB (UTC représentant une heure locale)
 * @returns Date dans le fuseau horaire local de l'utilisateur
 *
 * @example
 * const dbDate = new Date("2025-10-25T17:05:00.000Z");
 * const localDate = convertToLocalDate(dbDate);
 * // Si vous êtes à Montréal (UTC-4/5), localDate affichera 17:05 heure locale
 */
export function convertToLocalDate(date: Date | string): Date {
  const components = getTimezoneAgnosticComponents(date);

  // Créer une date locale avec les mêmes composants
  return new Date(
    components.year,
    components.month - 1,
    components.day,
    components.hours,
    components.minutes,
    components.seconds,
  );
}

/**
 * Convertit une date locale en date "timezone-agnostic" pour le stockage en DB
 *
 * @param localDate - Date dans le fuseau horaire local
 * @returns Date UTC qui représente la même heure locale
 *
 * @example
 * const localDate = new Date(2025, 9, 25, 17, 5); // 25 oct 2025, 17:05 locale
 * const dbDate = convertToTimezoneAgnosticDate(localDate);
 * // Résultat : 2025-10-25T17:05:00.000Z (peu importe le fuseau horaire)
 */
export function convertToTimezoneAgnosticDate(localDate: Date): Date {
  return createTimezoneAgnosticDate(
    localDate.getFullYear(),
    localDate.getMonth() + 1,
    localDate.getDate(),
    localDate.getHours(),
    localDate.getMinutes(),
    localDate.getSeconds(),
  );
}

/**
 * Formate une date "timezone-agnostic" pour l'affichage
 * @param date - La date à formater
 * @param options - Options de formatage Intl.DateTimeFormat
 * @returns String formatée
 *
 * @example
 * const dbDate = new Date("2025-10-25T17:05:00.000Z");
 * const formatted = formatTimezoneAgnosticDate(dbDate, {
 *   dateStyle: 'short',
 *   timeStyle: 'short'
 * });
 * // Résultat : "25/10/2025 17:05" (peu importe le fuseau horaire)
 */
export function formatTimezoneAgnosticDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  // Utiliser UTC pour le formatage pour garantir que les composants ne changent pas
  const utcOptions: Intl.DateTimeFormatOptions = {
    ...options,
    timeZone: "UTC",
  };

  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", utcOptions).format(d);
}

/**
 * Vérifie si une date "timezone-agnostic" est dans le passé/futur
 * en comparant avec l'heure locale actuelle
 *
 * @param date - La date à vérifier
 * @returns true si la date est dans le passé
 *
 * @example
 * const scheduledTime = new Date("2025-10-25T17:05:00.000Z");
 * if (isTimezoneAgnosticDatePast(scheduledTime)) {
 *   console.log("Le timer aurait dû déjà être lancé");
 * }
 */
export function isTimezoneAgnosticDatePast(date: Date | string): boolean {
  return getTimezoneAgnosticTimeDiff(date) < 0;
}

/**
 * Calcule la différence en millisecondes entre maintenant et une date "timezone-agnostic"
 *
 * @param date - La date cible
 * @returns Différence en millisecondes (positif si dans le futur, négatif si passé)
 *
 * @example
 * const scheduledTime = new Date("2025-10-25T17:05:00.000Z");
 * const msUntilStart = getTimezoneAgnosticTimeDiff(scheduledTime);
 * console.log(`Timer démarre dans ${msUntilStart / 1000} secondes`);
 */
export function getTimezoneAgnosticTimeDiff(date: Date | string): number {
  const targetComponents = getTimezoneAgnosticComponents(date);
  const targetLocal = new Date(
    targetComponents.year,
    targetComponents.month - 1,
    targetComponents.day,
    targetComponents.hours,
    targetComponents.minutes,
    targetComponents.seconds,
  );

  return targetLocal.getTime() - Date.now();
}
