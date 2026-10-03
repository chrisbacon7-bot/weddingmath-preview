/**
 * Published examples for blank calculator sub-lines.
 * Each figure is copied from that vendor's own site. None of them is a default.
 */

export const PUBLISHED_EXAMPLES = {
  meal: "Published examples, not added to your total. Let's Eat With Kibwe lists a buffet dinner starting at $150 per guest and a plated dinner starting at $250 (letseatwithkibwe.com/wedding-services, checked 2026-10-03). The Twisted Tines lists an Intimate Vow buffet at $50 per person and plated packages at $75 and $125 (thetwistedtines.com/weddings, checked 2026-10-03).",
  bar: "No separate beer-and-wine or open-bar price was printed on the caterer pages in this set. Actual Food Nashville describes an all-in wedding investment, including menu, staffing, and bar, of $100–$140 per guest (actualfoodnashville.com/contact, checked 2026-10-03). That is their guide, not a bar-only package.",
  cakeCut: "No cake-cutting fee was printed on the baker pages in this set.",
  hours: "Published examples, not added. Atlanta Music Pros lists a 5-hour wedding DJ package starting at $1,499 (https://atlantamusicpros.com/packages, checked 2026-10-03). Tommy Scott lists a standard package at $800 for up to 4 hours (https://www.djtommyscott.com/, checked 2026-10-03).",
  hourly: "Published examples, not added. Living Hope Photography prices coverage at $300 an hour (https://www.livinghopephotography.com/, checked 2026-10-03). Tommy Scott's extra DJ hour is $100 (https://www.djtommyscott.com/). 3rd Coast Entertainment lists $150 per extra hour as a photo-booth add-on (https://www.3rdcoastentertainment.com/nashville-wedding-dj/), not as the DJ package.",
  ceremony: "3rd Coast Entertainment's wedding page lists package names without a ceremony price. No separate ceremony-hour price is filled in here.",
  second: "Published example, not added. Shutter & Sound lists a second photographer at $800 (shutterandsound.com/atlanta-photography, checked 2026-10-03).",
  engagement: "Published example, not added. Lizzy Oakley Photography lists engagement or couples sessions at $550 (https://www.lizzyoakley.com/nashville-wedding-photographer-cost, checked 2026-10-03).",
  photoHours: "Published example, not added. Living Hope Photography's hourly rate is $300, and the page's 8-hour example is $2,400.",
  photoRate: "Published example, not added. Living Hope Photography prices photography at $300 an hour.",
  perSlice: "Published examples, not added. Baker's Man lists wedding cakes from $7.75 per serving in buttercream and $8.75 in fondant (bakersmaninc.com, checked 2026-10-03). The Bearded Baker lists buttercream at $9 per serving and fondant at $10.",
  bouquets: "Published example, not added. Harmony Fields lists luxury floral design starting at $1,500 (harmonyfieldsnashville.com, checked 2026-10-03). That is a design minimum, not a bouquet price.",
  centerpiece: "No per-centerpiece price was printed on the florist pages in this set. Flowers for Dreams describes Chicago weddings from $500 for simple personal flowers to $25,000 for full-service floristry (flowersfordreams.com/pages/chicago-wedding-flowers, checked 2026-10-03).",
  boutonnieres: "No boutonniere price was printed on the florist pages in this set.",
  arch: "No arch price was printed on the florist pages in this set.",
  chairPrice: "No per-chair rental price was printed on a vendor page in this set.",
  tablePrice: "No per-table rental price was printed on a vendor page in this set.",
  linens: "No linen package price was printed on a vendor page in this set.",
  tent: "No tent price was printed on a vendor page in this set.",
};

const FIELD_EXAMPLE = {
  meal: "meal",
  bar: "bar",
  cakeCut: "cakeCut",
  hours: "hours",
  hourly: "hourly",
  ceremony: "ceremony",
  second: "second",
  engagement: "engagement",
  photoHours: "photoHours",
  photoRate: "photoRate",
  perSlice: "perSlice",
  bouquets: "bouquets",
  boutonnieres: "boutonnieres",
  centerpiece: "centerpiece",
  arch: "arch",
  chairPrice: "chairPrice",
  tablePrice: "tablePrice",
  linens: "linens",
  tent: "tent",
};

export function exampleForField(name) {
  const key = FIELD_EXAMPLE[name];
  return key ? PUBLISHED_EXAMPLES[key] : "";
}
