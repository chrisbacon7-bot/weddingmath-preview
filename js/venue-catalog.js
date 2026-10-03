import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/venues.json");
const catalog = JSON.parse(readFileSync(file, "utf8"));

export const venueMetros = catalog.metros;
export const venues = catalog.venues;

export function metroById(id) {
  return venueMetros.find((metro) => metro.id === id) || null;
}

export function metroBySlug(stateSlug, slug) {
  return venueMetros.find((metro) => metro.stateSlug === stateSlug && metro.slug === slug) || null;
}

export function isBooking(venue) {
  return !venue.closed;
}

export function venuesForMetro(id) {
  return venues.filter((venue) => venue.metro === id && isBooking(venue));
}

export function venuesForState(abbr) {
  const ids = new Set(venueMetros.filter((metro) => metro.state === abbr).map((metro) => metro.id));
  return venues.filter((venue) => ids.has(venue.metro) && isBooking(venue));
}

export function venueById(id) {
  return venues.find((venue) => venue.id === id) || null;
}

export function venuePath(venue) {
  const metro = metroById(venue.metro);
  return `/venues/${metro.stateSlug}/${metro.slug}/${venue.id}`;
}

export function metroPath(metro) {
  return `/venues/${metro.stateSlug}/${metro.slug}`;
}
