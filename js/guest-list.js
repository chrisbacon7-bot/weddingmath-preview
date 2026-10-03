/**
 * Guest-list ordering. A is kept before B, then C.
 * A meal is a label. This file does not price a meal.
 */

const LIST_RANK = { A: 0, B: 1, C: 2 };

export function partySize(guest) {
  const extra = Number(guest && guest.plus);
  const seats = Number.isFinite(extra) && extra > 0 ? Math.round(extra) : 0;
  return 1 + seats;
}

export function rankedGuests(guests) {
  return [...(guests || [])]
    .filter((guest) => String(guest && guest.name || "").trim())
    .sort((a, b) => {
      const rank = (LIST_RANK[a.list] ?? 1) - (LIST_RANK[b.list] ?? 1);
      if (rank) return rank;
      return String(a.name).localeCompare(String(b.name));
    });
}

export function whoMakesTheCut(guests, cap) {
  const ranked = rankedGuests(guests);
  const limit = cap == null || cap === "" ? Infinity : Number(cap);
  const invited = [];
  const waiting = [];
  let headcount = 0;
  if (!Number.isFinite(limit) || limit < 0) {
    return { invited: ranked, waiting: [], headcount: ranked.reduce((sum, guest) => sum + partySize(guest), 0) };
  }
  for (const guest of ranked) {
    const size = partySize(guest);
    if (headcount + size <= limit) {
      invited.push(guest);
      headcount += size;
    } else {
      waiting.push(guest);
    }
  }
  return { invited, waiting, headcount };
}

export function blankGuest(partial = {}) {
  return {
    id: partial.id || "",
    name: String(partial.name || "").trim(),
    side: normSide(partial.side),
    group: normGroup(partial.group),
    list: normList(partial.list),
    rsvp: normRsvp(partial.rsvp),
    meal: String(partial.meal || "").trim(),
    plus: Math.max(0, Math.round(Number(partial.plus) || 0)),
  };
}

export function parseGuestPaste(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = /^name\b/i.test(lines[0]) && /side|group|list|rsvp|meal/i.test(lines[0]);
  return (header ? lines.slice(1) : lines).map(parseGuestLine).filter((guest) => guest.name);
}

export function guestCsv(guests) {
  const rows = [["name", "side", "group", "list", "rsvp", "meal", "plus"]];
  for (const guest of guests || []) {
    rows.push([guest.name, guest.side, guest.group, guest.list, guest.rsvp, guest.meal, String(guest.plus || 0)]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export const SAMPLE_GUESTS = [
  ["Aunt June", "a", "family", "A", "yes", "chicken", 1],
  ["Uncle Ray", "a", "family", "A", "yes", "beef", 0],
  ["Mom", "a", "family", "A", "yes", "fish", 0],
  ["Dad", "a", "family", "A", "waiting", "beef", 0],
  ["Cousin Eli", "a", "family", "B", "waiting", "", 0],
  ["Nora Blake", "a", "friends", "A", "yes", "vegetarian", 1],
  ["Sam Blake", "a", "friends", "B", "yes", "chicken", 0],
  ["Priya Shah", "b", "party", "A", "yes", "vegetarian", 0],
  ["Chris Shah", "b", "family", "A", "yes", "chicken", 0],
  ["Grandma Shah", "b", "family", "A", "waiting", "fish", 0],
  ["Leo Park", "b", "friends", "B", "no", "beef", 1],
  ["Mina Ortiz", "b", "work", "C", "waiting", "", 0],
  ["Jonah Ellis", "both", "work", "C", "waiting", "chicken", 0],
  ["Tess Nguyen", "b", "friends", "B", "yes", "vegan", 0],
  ["Owen Brooks", "a", "work", "C", "no", "", 0],
  ["The officiant", "both", "party", "A", "yes", "vegetarian", 0],
].map(([name, side, group, list, rsvp, meal, plus]) => blankGuest({ name, side, group, list, rsvp, meal, plus }));

function parseGuestLine(line) {
  if (!line.includes(",")) return blankGuest({ name: line });
  const cells = splitCsvLine(line);
  return blankGuest({
    name: cells[0],
    side: cells[1],
    group: cells[2],
    list: cells[3],
    rsvp: cells[4],
    meal: cells[5],
    plus: cells[6],
  });
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function normSide(value) {
  const text = String(value || "").trim().toLowerCase();
  if (["a", "partner a", "partner-a", "side a", "mine"].includes(text)) return "a";
  if (["b", "partner b", "partner-b", "side b", "theirs"].includes(text)) return "b";
  return "both";
}

function normGroup(value) {
  const text = String(value || "").trim().toLowerCase();
  if (["family", "friends", "work", "party"].includes(text)) return text;
  if (text.startsWith("wedding")) return "party";
  return "friends";
}

function normList(value) {
  const text = String(value || "").trim().toUpperCase();
  if (text === "A" || text === "C") return text;
  return "B";
}

function normRsvp(value) {
  const text = String(value || "").trim().toLowerCase();
  if (["yes", "y", "coming", "accepted"].includes(text)) return "yes";
  if (["no", "n", "declined"].includes(text)) return "no";
  return "waiting";
}
