/**
 * Pricing schema for venue all-in totals.
 *
 * Labels couples can see today: published, public_fee_schedule, estimated.
 * venue_verified and couple_reported are stored for later and are not shown.
 *
 * Provenance src, most trusted first:
 * venue_portal_attested, venue_email, public_fee_schedule, venue_pdf, venue_page,
 * caterer_pdf, couple_final_invoice, couple_contract, couple_quote_doc,
 * planner_report, couple_self_reported, model_estimate.
 *
 * A component is fresh for 12 months from verifiedOn / capturedOn.
 * Missing amounts stay null. They are never stored as zero.
 */

export const LABEL_TYPES = [
  "published",
  "public_fee_schedule",
  "estimated",
  "venue_verified",
  "couple_reported",
];

export const SHOWN_LABELS = ["published", "public_fee_schedule", "estimated"];

export const PROVENANCE_SRC = [
  "venue_portal_attested",
  "venue_email",
  "public_fee_schedule",
  "venue_pdf",
  "venue_page",
  "caterer_pdf",
  "couple_final_invoice",
  "couple_contract",
  "couple_quote_doc",
  "planner_report",
  "couple_self_reported",
  "model_estimate",
];

export const COMPONENT_TYPES = [
  "site_fee",
  "ceremony_fee",
  "package_flat",
  "per_person",
  "bar_per_person",
  "fnb_minimum",
  "admin_fee",
  "security",
  "insurance",
  "cleaning",
  "attendant_hourly",
  "coordinator",
  "valet",
  "cake_cutting",
  "corkage",
  "outside_vendor_fee",
  "overtime_hourly",
  "deposit_refundable",
  "service_charge",
  "tax",
];

export const FRESHNESS_MONTHS = 12;

export const CHIP_TEXT = {
  published: "Published",
  public_fee_schedule: "Public fee schedule",
  estimated: "Estimated",
  venue_verified: "Venue-verified",
  couple_reported: "Couple-reported",
};

export function chipText(label) {
  if (!SHOWN_LABELS.includes(label)) return null;
  return CHIP_TEXT[label] || null;
}
