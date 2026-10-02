/**
 * Search copy, state cost pages, and guides.
 * Dollar amounts are read from data/costs.json. Nothing here is a new survey figure.
 */

import { SITE } from "./site-config.js";
import { escapeHtml } from "./html.js";
import { describe } from "./describe.js";
import { planFor } from "./estimate.js";
import { formatMoney, formatPlan } from "./format.js";
import { venueLinksForState } from "./venue-pages.js";

const money = (n) => formatMoney(n, { exact: true });

export function stateSlug(name) {
  return String(name).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function renderCrumbs(crumbs) {
  if (!crumbs || crumbs.length < 2) return "";
  const items = crumbs.map((crumb, index) => {
    const last = index === crumbs.length - 1;
    const inner = last
      ? `<span aria-current="page">${escapeHtml(crumb.name)}</span>`
      : `<a href="${escapeHtml(crumb.path)}">${escapeHtml(crumb.name)}</a>`;
    return `<li>${inner}</li>`;
  }).join("");
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}

export function renderBelow(page) {
  const faqs = page.faqs || [];
  const paragraphs = page.explainer || [];
  if (!page.explainerTitle && !paragraphs.length && !faqs.length && !(page.related || []).length) return "";
  const faqItems = faqs.map((item) => `<details class="faq-item"><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`).join("");
  const sources = faqs.length ? `<p>Every figure is cited on the <a href="/sources">sources page</a>.</p>` : "";
  let block = "";
  if (page.explainerTitle || paragraphs.length || faqs.length) {
    const intro = page.explainerTitle || paragraphs.length
      ? `<h2>${escapeHtml(page.explainerTitle || "About this page")}</h2>${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}`
      : "";
    const questions = faqs.length ? `<h2>Common questions</h2><div class="faq">${faqItems}</div>` : "";
    block = `<details class="explainer-fold"><summary>About this page and common questions</summary><section class="explainer" aria-label="About this page">${intro}${questions}${sources}</section></details>`;
  }
  return `${block}${renderRelated(page.related)}`;
}

export function toolSeo(costs) {
  const knot = money(costs.national.knotAverage.value);
  const zola = money(costs.national.zolaAverage.value);
  const median = money(costs.national.knotMedian.value);
  const perGuest = money(costs.national.knotPerGuest.value);
  const guests = costs.national.knotGuests.value;
  const knotDate = prettyDate(costs.sources["knot-study"].date);
  const zolaDate = prettyDate(costs.sources["zola-index"].date);
  const moonKnot = money(costs.honeymoon.knot.value);
  const moonZola = money(costs.honeymoon.zola.value);
  const moonShare = Math.round(costs.honeymoon.knotShare.value * 100);
  const service = `${costs.hidden.serviceChargeLowPct.value}–${costs.hidden.serviceChargeHighPct.value}%`;
  const added = money(costs.hidden.averageAdded.value);
  const feeShare = Math.round(costs.hidden.couplesWithMandatoryVenueFee.value * 100);
  const studies = `The Knot's 2026 Real Weddings Study (article updated ${knotDate}) puts the average at ${knot} for couples married in 2025, ${perGuest} a guest, with a median of ${median}. Zola's Wedding Cost Index (updated ${zolaDate}) puts the average at ${zola}.`;

  const tools = [
    ["/", "Wedding cost calculator", "ZIP or city, guests, and an instant local total."],
    ["/budget", "Wedding budget calculator", "Split a total into categories."],
    ["/budget/reverse", "How much can we afford", "Turn savings into a guest count."],
    ["/budget/per-guest", "Wedding cost per guest calculator", "What one guest adds, and what cutting the list saves."],
    ["/budget/tracker", "Wedding budget tracker", "Budget, quoted, and paid, in this browser."],
    ["/wedding-cost", "Wedding cost by state", "Published averages for every state."],
    ["/guides", "Wedding planning guides", "Cost, hidden fees, and the honeymoon."],
    ["/honeymoon", "Honeymoon budget", "Both published averages, then VacationMath."],
  ];
  const pick = (path, extra = []) => linksExcept(path, [...tools, ...extra]);

  return {
    "/": {
      title: "Wedding Cost Calculator",
      description: `Wedding cost calculator for your ZIP or city. ${studies} Both stay visible. No account.`,
      schema: "home",
      crumbs: [],
      explainerTitle: "What this wedding cost calculator uses",
      explainer: [
        studies,
        "Enter a ZIP, a city, or choose Not sure yet. The guest count starts at the Knot average of 117 and you can change it. A city with its own published figure uses that figure. A state uses the state figure. A metro without a wedding survey is labeled estimated: state data scaled by BEA Regional Price Parities for 2024. When both studies publish a number, you see both.",
      ],
      faqs: [
        { q: "How much does a wedding cost?", a: `The Knot's 2026 average is ${knot}, about ${perGuest} a guest, with a median of ${median}. Zola's 2026 average is ${zola}. The local number depends on the place and the guest count. This calculator shows the published figures side by side.` },
        { q: "What is a wedding cost calculator?", a: "It turns a place and a guest count into a planning total from published wedding studies. You can add a budget to see whether that total fits. The result stays in this browser and can be shared as a link." },
        { q: "Do I need an account?", a: "No. There is no email gate. A budget can stay on your phone, be printed, or be copied as a link." },
      ],
      related: pick("/"),
      og: { figure: knot },
    },
    "/tools": {
      title: "Wedding Budget Tools",
      description: `Wedding budget tools for a local total, a category split, what you can afford, cost per guest, and a payment tracker. National Knot average ${knot}. Zola average ${zola}.`,
      schema: "collection",
      crumbs: [{ name: "Home", path: "/" }, { name: "Wedding budget tools", path: "/tools" }],
      explainerTitle: "Which wedding budget tool to open",
      explainer: [
        "Start with the wedding cost calculator if you want the local total. Open the wedding budget calculator to split that total. Open the affordability tool if you know what you can save. Open cost per guest if you are deciding how many people to invite.",
        studies,
      ],
      faqs: [
        { q: "Which wedding budget tool should we use first?", a: "If you know the place and the guest count, start with the wedding cost calculator. If you know what you can save, start with how much you can afford. The tracker is for quotes you have already received." },
        { q: "Are these wedding budget tools free?", a: "Yes. They run in the browser. There is no account and no required email." },
      ],
      related: pick("/tools"),
      og: { figure: knot },
    },
    "/budget": {
      title: "Wedding Budget Calculator",
      description: `Wedding budget calculator that splits a total by category for your city and guest count. Knot average ${knot}. Zola average ${zola}. Priorities move money and leave the total the same.`,
      schema: "app",
      crumbs: [{ name: "Home", path: "/" }, { name: "Tools", path: "/tools" }, { name: "Wedding budget calculator", path: "/budget" }],
      explainerTitle: "How the wedding budget calculator splits a total",
      explainer: [
        "The wedding budget calculator takes a place, a guest count, and a total. Leave the total blank and it splits the local planning figure. Category lines follow The Knot's vendor averages, scaled so they add up to that total. Not every couple hires every vendor, so the raw vendor averages add up to more than the Knot average.",
        "Pick up to three priorities to put more of the same total toward the place, the food, the photos, the flowers, the music, or what you wear. Zola's category averages stay off this split. When Zola publishes a local total, it stays beside the Knot figure.",
      ],
      faqs: [
        { q: "What is a wedding budget calculator?", a: `It divides a wedding total into categories for a place and a guest count. The national Knot average is ${knot} and the Zola average is ${zola}. Your lines add up to the total on the page, which is the local figure or a number you type.` },
        { q: "Do priorities change the wedding budget?", a: "No. Priorities move money between categories. The total stays the same. They are your choices, not a survey result." },
        { q: "Why do The Knot and Zola show different wedding budgets?", a: `They survey different couples. The Knot's 2026 average is ${knot} with a median of ${median}. Zola's 2026 average is ${zola}. Both stay on the page.` },
        { q: "Are the honeymoon and the rings inside this budget?", a: `The Knot's honeymoon average is ${money(costs.honeymoon.knot.value)} and the rehearsal-dinner average is ${money(costs.extras.rehearsalDinnerKnot.value)}. Those are usually extra. The sources page lists them.` },
      ],
      related: pick("/budget", [["/guides/wedding-budget-breakdown", "Wedding budget breakdown", "What the category averages mean."]]),
      og: { figure: knot },
    },
    "/budget/reverse": {
      title: "How Much Can We Afford for a Wedding",
      description: `See how much you can afford for a wedding from savings, monthly savings, and family help, then a guest count at local prices. Knot average ${knot}.`,
      schema: "app",
      crumbs: [{ name: "Home", path: "/" }, { name: "Tools", path: "/tools" }, { name: "How much can we afford", path: "/budget/reverse" }],
      explainerTitle: "How much you can afford for a wedding",
      explainer: [
        "Add what you have saved, what you can set aside each month, and only the family help someone has actually offered. The total is yours. The guest count is how many people that total covers at the local Knot-based cost.",
        `Nationally, The Knot's average is ${knot} and the median is ${median}. A local figure can sit far from either one. Where the local number is a range, the comfortable guest count covers the high end and the stretch count reaches the low end.`,
      ],
      faqs: [
        { q: "How much can we afford for a wedding?", a: "Add savings, monthly savings times the months until the wedding, and family help that has been offered. That sum is the total. The tool then estimates how many guests it covers where you are getting married." },
        { q: "Should we plan from the average or the median?", a: `The Knot's average is ${knot} and the median is ${median}. The median is the middle couple. The average is pulled up by expensive weddings. Your total is the one to plan from.` },
        { q: "What if our total is below the local estimate?", a: "The guest count falls, including below a typical wedding. You can also compare a shorter list on the cost-per-guest page. Some bills, such as the venue and the photographer, stay put when the list shrinks." },
      ],
      related: pick("/budget/reverse"),
      og: { figure: knot },
    },
    "/budget/per-guest": {
      title: "Wedding Cost Per Guest Calculator",
      description: `Wedding cost per guest calculator. The Knot's national figure is ${perGuest} a guest. See what cutting guests saves, and add service charge, tax, and gratuity to a quote.`,
      schema: "app",
      crumbs: [{ name: "Home", path: "/" }, { name: "Tools", path: "/tools" }, { name: "Cost per guest", path: "/budget/per-guest" }],
      explainerTitle: "What the wedding cost per guest includes",
      explainer: [
        `The Knot's national average is ${perGuest} per guest, from the ${knot} average and ${guests} guests. A local all-in figure divides the whole wedding by the guest count. Cutting guests saves less than that all-in rate, because the venue, photographer, and similar costs stay.`,
        `On a quote, a service charge is often ${service}. Zola's venue guide mentions a top end of ${costs.hidden.serviceChargeVenueHighPct.value}%. In Zola's survey, ${feeShare}% of couples faced a mandatory venue service fee, and unexpected costs averaged ${added}. Type the percents from your contract. This page does not guess a sales-tax rate.`,
      ],
      faqs: [
        { q: "What is the average wedding cost per guest?", a: `The Knot's 2026 national figure is ${perGuest} per guest. Local pages divide a state or city total by the guest count and label that division. They are not extra published rates.` },
        { q: "How much do we save by cutting wedding guests?", a: "Less than the all-in cost per guest. Food, drinks, and a few other lines shrink. The venue, photographer, music, and similar costs stay. The calculator shows both numbers." },
        { q: "What is a wedding service charge?", a: `A percent added to the bill, often for staffing. Zola says it commonly runs ${service}, and its venue guide mentions ${costs.hidden.serviceChargeLowPct.value}–${costs.hidden.serviceChargeVenueHighPct.value}%. A service charge is not automatically a tip. Plus-plus means the menu price still needs the service charge and the tax.` },
        { q: "What do hidden wedding costs average?", a: `Zola's spend survey put unexpected costs at ${added} on average. That is a national survey figure, not a line on your quote. ${feeShare}% of couples in that survey had a mandatory venue service fee.` },
      ],
      related: pick("/budget/per-guest", [["/guides/hidden-wedding-costs", "Hidden wedding costs", "Service charges, tax, and plus-plus."]]),
      og: { figure: perGuest },
    },
    "/budget/tracker": {
      title: "Wedding Budget Tracker",
      description: "Wedding budget tracker for budget, quoted, and paid, with due dates. Saved in this browser, with a CSV download and a share link. No account.",
      schema: "app",
      crumbs: [{ name: "Home", path: "/" }, { name: "Tools", path: "/tools" }, { name: "Wedding budget tracker", path: "/budget/tracker" }],
      explainerTitle: "How the wedding budget tracker stores numbers",
      explainer: [
        "The wedding budget tracker is for the quotes you actually have. Each line has a budget, a quote, what you have paid, a due date, and a vendor. Due dates turn amber inside 30 days and dark red after they pass, when that line is still open.",
        "The tracker stays in this browser. A share link puts the lines in the address after a hash, when the link is short enough. Otherwise download the CSV. Clearing the browser's saved data clears the tracker.",
      ],
      faqs: [
        { q: "What is a wedding budget tracker?", a: "A list of wedding categories with a budget, a quote, an amount paid, and a due date. It shows what is still to pay. It is for your contracts, not for the national average." },
        { q: "Is the wedding budget tracker saved online?", a: "No. It is saved in this browser only. Download a CSV if you want a copy, or copy a share link when the tracker is short enough to fit in one." },
        { q: "Can I fill the tracker from the wedding budget calculator?", a: "Yes. Open the budget calculator first. Then use “Use my budget split” here. Quotes and payments stay blank until you type them." },
      ],
      related: pick("/budget/tracker"),
      og: { figure: knot },
    },
    "/honeymoon": {
      title: "Honeymoon Budget",
      description: `Honeymoon budget from published averages: ${moonKnot} in The Knot's 2026 study and ${moonZola} in Zola's. ${moonShare}% of Knot couples took a honeymoon. Then price the trip on VacationMath.`,
      schema: "app",
      crumbs: [{ name: "Home", path: "/" }, { name: "Honeymoon budget", path: "/honeymoon" }],
      explainerTitle: "What a honeymoon budget covers",
      explainer: [
        `The Knot's 2026 average honeymoon is ${moonKnot}. Zola's is ${moonZola}. ${moonShare}% of couples in The Knot's study took a honeymoon. Those averages sit on top of the wedding. They are outside the ceremony-and-reception total.`,
        "VacationMath prices a real trip: flights, a place to stay, and daily spending. The links on this page open that site in a new tab. They are marked as a referral from this site. They are not ads.",
      ],
      faqs: [
        { q: "How much does a honeymoon cost?", a: `The Knot's 2026 average is ${moonKnot}. Zola's 2026 average is ${moonZola}. ${moonShare}% of couples in The Knot's study took one. The two studies stay separate.` },
        { q: "Is the honeymoon inside the average wedding cost?", a: `No. The Knot wedding average of ${knot} and the honeymoon average of ${moonKnot} are separate figures. Plan the trip on top of the wedding.` },
        { q: "Where do we price the actual trip?", a: "VacationMath, linked from this page, prices flights, lodging, and daily spending for places such as Maui, plus all-inclusive resorts, cruises, and how to fund the trip." },
      ],
      related: pick("/honeymoon", [["/guides/honeymoon-budget", "Honeymoon budget guide", "The published averages, in one place."]]),
      og: { figure: moonKnot },
    },
    "/sources": {
      title: "Wedding Cost Sources",
      description: `Every wedding dollar figure on this site, with its source and date. Knot average ${knot} (${knotDate}). Zola average ${zola} (${zolaDate}). BEA price levels for 2024.`,
      schema: "sources",
      crumbs: [{ name: "Home", path: "/" }, { name: "Wedding cost sources", path: "/sources" }],
      explainerTitle: "How to read the wedding cost sources",
      explainer: [
        "If a dollar amount appears on a tool or a state page, it is in the tables here, or it is labeled as math from these tables. City studies, state studies, and estimated metros are labeled. The Knot and Zola stay in their own columns.",
      ],
      faqs: [
        { q: "Where do the wedding cost numbers come from?", a: `The Knot 2026 Real Weddings Study, average-cost article updated ${knotDate}, and the study readout. The Zola Wedding Cost Index, updated ${zolaDate}. BEA Regional Price Parities, all items, 2024, released ${prettyDate(costs.sources["bea-rpp"].date)}.` },
        { q: "Are The Knot and Zola averaged together?", a: `No. The Knot average is ${knot} and the Zola average is ${zola}. When both publish a local figure, both stay on the page.` },
        { q: "Why is North Dakota missing a Zola range?", a: "North Dakota was not in the Zola state table on the Wedding Cost Index page. The Knot state average is shown. No Zola range is filled in." },
      ],
      related: pick("/sources"),
      og: { figure: knot },
    },
    "/about": {
      title: "About This Wedding Cost Site",
      description: `How ${SITE.name} chooses city, state, and estimated metro wedding figures. Knot average ${knot}. Zola average ${zola}.`,
      schema: "page",
      crumbs: [{ name: "Home", path: "/" }, { name: "About", path: "/about" }],
      related: pick("/about"),
      og: { figure: knot },
    },
    "/disclosures": {
      title: "Wedding Cost Disclosures",
      description: `Disclosures for ${SITE.name}. No accounts, no lead sales, and no blended wedding averages. VacationMath honeymoon links are labeled referrals.`,
      schema: "page",
      crumbs: [{ name: "Home", path: "/" }, { name: "Disclosures", path: "/disclosures" }],
      related: pick("/disclosures"),
      og: { figure: "" },
    },
    "/wedding-cost": {
      title: "How Much Does a Wedding Cost",
      description: `How much a wedding costs, by state. The Knot's 2026 average is ${knot}. Zola's is ${zola}. The median Knot wedding is ${median}. Open a state for its own figures.`,
      schema: "collection",
      crumbs: [{ name: "Home", path: "/" }, { name: "Wedding cost", path: "/wedding-cost" }],
      explainerTitle: "How state wedding costs are chosen",
      explainer: [
        "Each state page starts with that state's published Knot average and Zola range. A city with its own study is listed separately. A metro without a wedding survey is an estimate: the state figure times the metro's BEA price level, divided by the state's. Washington, DC has city figures and no state row. North Dakota has no Zola range on the source page.",
      ],
      faqs: [
        { q: "How much does a wedding cost?", a: `The Knot's 2026 average is ${knot} for couples married in 2025, ${perGuest} a guest, with a median of ${median}. Zola's 2026 average is ${zola}. State pages show the published state figures.` },
        { q: "Which state has its own wedding cost page?", a: "All 50 states, plus Washington, DC. DC uses the published city figures because neither study prints a DC state row." },
        { q: "Do guest-count bands change the state average?", a: `The Knot's national bands are ${money(costs.guestBands[0].value)}, ${money(costs.guestBands[1].value)}, and ${money(costs.guestBands[2].value)}. They are a reference. At 117 guests, a Knot-based estimate matches the published average, so the bands are not used as a step multiplier.` },
      ],
      related: pick("/wedding-cost"),
      og: { figure: knot },
    },
    "/guides": {
      title: "Wedding Planning Guides",
      description: `Wedding planning guides for the average cost, a budget breakdown, cost per guest, hidden fees, and a honeymoon budget. Knot average ${knot}. Zola average ${zola}.`,
      schema: "collection",
      crumbs: [{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }],
      explainerTitle: "What these wedding planning guides cover",
      explainer: [
        "These guides explain the published figures. The calculators do the local math. State pages are the local guides: each one has that state's Knot average, Zola range, city studies, and estimated metros.",
      ],
      faqs: [
        { q: "Where are the local wedding cost guides?", a: "On the state pages under Wedding cost. Each state uses its own published figures. A metro without a city study is labeled estimated." },
        { q: "Are the guides the same as the calculators?", a: "The guides explain the studies. The wedding cost calculator, budget calculator, affordability tool, and cost-per-guest calculator apply those studies to a place and a guest count." },
      ],
      related: pick("/guides"),
      og: { figure: knot },
    },
  };
}

export function extraPages(costs, geo) {
  const states = statePages(costs, geo);
  return [costHubBody(costs, geo, states), guidesHub(costs), ...guidePages(costs), ...states];
}

export function postalRedirects(geo) {
  return Object.keys(geo.states).map((abbr) => {
    const slug = stateSlug(geo.states[abbr].name);
    return [`/wedding-cost/${abbr.toLowerCase()}`, `/wedding-cost/${slug}`];
  });
}

export function llmsBody(origin, costs) {
  const knot = money(costs.national.knotAverage.value);
  const zola = money(costs.national.zolaAverage.value);
  const stateLines = Object.entries(costs.states)
    .map(([abbr, row]) => {
      const name = rowName(abbr);
      const slug = stateSlug(nameFromAbbr(abbr, costs));
      const zolaBit = row.zolaLow == null ? "Zola range not published" : `Zola ${money(row.zolaLow)}–${money(row.zolaHigh)}`;
      return `- [${nameFromAbbr(abbr, costs)}](${origin}/wedding-cost/${slug}): Knot ${money(row.knot)}; ${zolaBit}`;
    })
    .sort()
    .join("\n");
  return `# ${SITE.name}
${SITE.placeholder ? "Placeholder name. Change it in src/site-config.js and rebuild. The figures are the product.\n" : ""}
> Local wedding math from published studies. The Knot and Zola stay side by side. Training use is declined in robots.txt (Content-Signal: ai-train=no). Search and citation of these pages is fine.

National Knot average ${knot}. National Zola average ${zola}. Knot median ${money(costs.national.knotMedian.value)}. Knot per guest ${money(costs.national.knotPerGuest.value)}. Honeymoon ${money(costs.honeymoon.knot.value)} (Knot) and ${money(costs.honeymoon.zola.value)} (Zola).

## Tools
- [Wedding cost calculator](${origin}/): ZIP or city, guests, optional budget
- [Wedding budget tools](${origin}/tools)
- [Wedding budget calculator](${origin}/budget): category split
- [How much can we afford for a wedding](${origin}/budget/reverse)
- [Wedding cost per guest calculator](${origin}/budget/per-guest)
- [Wedding budget tracker](${origin}/budget/tracker)
- [Honeymoon budget](${origin}/honeymoon): hands off to VacationMath
- [How much does a wedding cost](${origin}/wedding-cost): state index
- [Wedding planning guides](${origin}/guides)
- [Wedding cost sources](${origin}/sources): every figure, source, and date

## Guides
- [Average wedding cost in 2026](${origin}/guides/average-wedding-cost)
- [Wedding budget breakdown](${origin}/guides/wedding-budget-breakdown)
- [Wedding cost per guest](${origin}/guides/wedding-cost-per-guest)
- [Hidden wedding costs](${origin}/guides/hidden-wedding-costs)
- [Honeymoon budget](${origin}/guides/honeymoon-budget)

## State wedding costs
${stateLines}
- [Washington, DC](${origin}/wedding-cost/district-of-columbia): city figures, Knot ${money(costs.metros["47900"].knot)}, Zola 150-guest ${money(costs.metros["47900"].zola150)}. No state row.

## Rules
City figures are tier A. State figures are tier B. Metros without a wedding survey are tier C estimates: state wedding data times the metro BEA price level divided by the state price level, labeled estimated. Guest-count bands are a reference, not the calculator's step multiplier.
`;
}

function nameFromAbbr(abbr) {
  const names = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  };
  return names[abbr];
}

function rowName(abbr) {
  return nameFromAbbr(abbr);
}

function costHubBody(costs, geo, states) {
  const knot = money(costs.national.knotAverage.value);
  const zola = money(costs.national.zolaAverage.value);
  const median = money(costs.national.knotMedian.value);
  const perGuest = money(costs.national.knotPerGuest.value);
  const items = [...states].sort((a, b) => a.sort.localeCompare(b.sort)).map((page) => {
    return `<li><a href="${page.path}"><span><strong>${escapeHtml(page.crumbName)}</strong><br><small>${escapeHtml(page.directoryNote)}</small></span><span>${escapeHtml(page.directoryMoney)}</span></a></li>`;
  }).join("");
  const seo = toolSeo(costs)["/wedding-cost"];
  return {
    ...seo,
    file: "wedding-cost.html",
    path: "/wedding-cost",
    wide: true,
    body: `<h1>How Much Does a Wedding Cost</h1>
<p class="lede">The Knot's 2026 average is ${knot} for couples married in 2025, ${perGuest} a guest, with a median of ${median}. Zola's 2026 average is ${zola}. Pick a state for the published figures there.</p>
<p><a class="btn" href="/">Open the wedding cost calculator</a></p>
<h2>Wedding cost by state</h2>
<ul class="directory">${items}</ul>
<p class="hint">Washington, DC uses city figures. North Dakota has a Knot average and no Zola range. ${Object.keys(geo.metros).length} metros are covered inside the state pages.</p>`,
  };
}

function guidesHub(costs) {
  const seo = toolSeo(costs)["/guides"];
  const cards = guideDefs(costs).map((guide) => `<li class="tool-card card"><a href="${guide.path}"><h2>${escapeHtml(guide.title)}</h2><p>${escapeHtml(guide.card)}</p></a></li>`).join("");
  return {
    ...seo,
    file: "guides.html",
    path: "/guides",
    body: `<h1>Wedding Planning Guides</h1>
<p class="lede">Short guides to the published numbers. The calculators apply them to your guest list. The state pages are the local versions.</p>
<ul class="cards">${cards}</ul>
<p><a href="/wedding-cost">Browse wedding cost by state</a>.</p>`,
  };
}

function guidePages(costs) {
  return guideDefs(costs).map((guide) => ({
    file: `guides/${guide.slug}.html`,
    path: guide.path,
    title: guide.title,
    description: guide.description,
    schema: "article",
    crumbs: [{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }, { name: guide.crumb, path: guide.path }],
    faqs: guide.faqs,
    related: [
      ["/", "Wedding cost calculator", "Apply this to your ZIP."],
      ["/wedding-cost", "Wedding cost by state", "Published figures for each state."],
      ["/budget", "Wedding budget calculator", "Split a total into categories."],
      ["/honeymoon", "Honeymoon budget", "Then price the trip on VacationMath."],
      ["/sources", "Sources", "Every figure, with its date."],
    ].filter(([href]) => href !== guide.path),
    og: { figure: guide.figure },
    body: `<article><h1>${escapeHtml(guide.title)}</h1><p class="lede">${escapeHtml(guide.lede)}</p>${guide.body}</article>`,
  }));
}

function guideDefs(costs) {
  const knot = money(costs.national.knotAverage.value);
  const zola = money(costs.national.zolaAverage.value);
  const median = money(costs.national.knotMedian.value);
  const perGuest = money(costs.national.knotPerGuest.value);
  const guests = costs.national.knotGuests.value;
  const bands = costs.guestBands.map((band) => `${band.label}: ${money(band.value)}`).join(". ");
  const seasons = costs.seasons.map((season) => `${season.label} ${money(season.value)}`).join(", ");
  const moonKnot = money(costs.honeymoon.knot.value);
  const moonZola = money(costs.honeymoon.zola.value);
  const moonShare = Math.round(costs.honeymoon.knotShare.value * 100);
  const added = money(costs.hidden.averageAdded.value);
  const feeShare = Math.round(costs.hidden.couplesWithMandatoryVenueFee.value * 100);
  const service = `${costs.hidden.serviceChargeLowPct.value}–${costs.hidden.serviceChargeHighPct.value}%`;
  const venue = money(costs.categories.find((cat) => cat.id === "venue").amount);
  const catering = money(costs.categories.find((cat) => cat.id === "catering").amount);
  return [
    {
      slug: "average-wedding-cost",
      path: "/guides/average-wedding-cost",
      title: "Average Wedding Cost in 2026",
      crumb: "Average wedding cost",
      card: `Knot ${knot}, median ${median}. Zola ${zola}.`,
      description: `The average wedding cost in 2026 is ${knot} in The Knot's study and ${zola} in Zola's index. Median ${median}. ${perGuest} per guest.`,
      lede: `Two published averages, kept apart. The Knot says ${knot}. Zola says ${zola}.`,
      figure: knot,
      body: `<p>The Knot 2026 Real Weddings Study puts average spending at ${knot} for couples married in 2025. The median is ${median}. The average per guest is ${perGuest}, and the average guest count is ${guests}. Zola's Wedding Cost Index puts the average at ${zola}.</p>
<p>The Knot's national guest-count bands are a reference: ${bands}. They are not the calculator's formula. Using the top band as a step would push a ${guests}-guest wedding off the published ${knot} average.</p>
<p>Season averages, also national: ${seasons}. Summer is the high season in that study. The season control on the budget calculator applies that national pattern on top of a local figure and says so.</p>
<p>The local number is the one to plan from. A state page has that state's published figures. The <a href="/">wedding cost calculator</a> applies them to a ZIP and a guest count.</p>`,
      faqs: [
        { q: "What is the average wedding cost in 2026?", a: `The Knot's average is ${knot}, with a median of ${median} and ${perGuest} per guest. Zola's average is ${zola}.` },
        { q: "Why is the average higher than the median?", a: `The Knot median is ${median} and the average is ${knot}. Expensive weddings pull the average up. Half of couples in that study spent the median or less.` },
        { q: "Does the season change the average?", a: `In The Knot's national figures, July–September weddings averaged ${money(costs.seasons.find((s) => s.id === "summer").value)}. January–March and October–December averaged ${money(costs.seasons.find((s) => s.id === "winter").value)}.` },
      ],
    },
    {
      slug: "wedding-budget-breakdown",
      path: "/guides/wedding-budget-breakdown",
      title: "Wedding Budget Breakdown",
      crumb: "Budget breakdown",
      card: "How the category lines add up to one total.",
      description: `Wedding budget breakdown using The Knot's vendor averages, scaled to a local total. Venue average ${venue}. Catering ${catering} per guest. Zola's categories stay separate.`,
      lede: "A wedding budget breakdown is a total first, then the lines that add up to it.",
      figure: venue,
      body: `<p>The Knot's venue average is ${venue}. Catering averages ${catering} per guest. The full vendor list is on the <a href="/sources">sources page</a>. Those averages are among couples who hired that vendor. Added raw, they come to more than the ${knot} wedding average, because not every couple hires every vendor.</p>
<p>The <a href="/budget">wedding budget calculator</a> keeps the shape of those averages and scales the lines so they add up to your total. Priorities move money between lines. The total stays put. Zola publishes its own category averages, including a venue average of ${money(costs.zolaCategories.find((cat) => cat.id === "venue").amount)}. Those stay out of the Knot-shaped split.</p>
<p>Rehearsal dinner (${money(costs.extras.rehearsalDinnerKnot.value)} in The Knot's study), rings, and the honeymoon are usually outside that total.</p>`,
      faqs: [
        { q: "What is a typical wedding budget breakdown?", a: `The lines follow The Knot's vendor averages and are scaled to the local total or a total you type. The national Knot average is ${knot}. The venue average, among couples who hired a venue, is ${venue}.` },
        { q: "Why don't the category averages add up to the wedding average?", a: `Each category average is for couples who paid that vendor. Most couples skip some vendors. The calculator scales the lines so they add up to ${knot} nationally, or to the local total.` },
        { q: "Can we put more money toward one part?", a: "Yes. Pick up to three priorities on the wedding budget calculator. They increase those lines and reduce the others. The total does not change." },
      ],
    },
    {
      slug: "wedding-cost-per-guest",
      path: "/guides/wedding-cost-per-guest",
      title: "Wedding Cost Per Guest",
      crumb: "Cost per guest",
      card: `${perGuest} nationally, and why cutting guests saves less.`,
      description: `Wedding cost per guest: The Knot's national figure is ${perGuest}. Cutting guests saves less than that, because some bills stay put.`,
      lede: `The Knot's national wedding cost per guest is ${perGuest}. The bill you avoid by cutting a name is smaller.`,
      figure: perGuest,
      body: `<p>The ${perGuest} figure is the ${knot} average divided across ${guests} guests. It is published as a national rate. State and city pages that show a per-guest amount say when it is simply their total divided by ${guests} or by the guest count you picked.</p>
<p>Food is priced per guest in The Knot's study, at ${money(costs.categories.find((cat) => cat.id === "catering").amount)}. Drinks, cake, rentals, favors, and invitations are treated as growing with the headcount. The venue, photographer, music, and clothes stay put. That is why the <a href="/budget/per-guest">wedding cost per guest calculator</a> shows a smaller savings when you cut the list.</p>`,
      faqs: [
        { q: "What is the wedding cost per guest?", a: `The Knot's 2026 national figure is ${perGuest}. Divide a local total by the guest count for a local all-in figure, and read the label so you know whether that rate was published or calculated.` },
        { q: "How much does cutting 10 guests save?", a: "Less than 10 times the all-in cost per guest. The meal and a few other lines shrink. The venue and the photographer do not. The calculator shows the smaller number for your place." },
      ],
    },
    {
      slug: "hidden-wedding-costs",
      path: "/guides/hidden-wedding-costs",
      title: "Hidden Wedding Costs",
      crumb: "Hidden costs",
      card: `Service charges often ${service}. Unexpected costs averaged ${added}.`,
      description: `Hidden wedding costs: Zola puts unexpected costs at ${added}. Service charges often run ${service}. ${feeShare}% of couples had a mandatory venue fee.`,
      lede: "The number on a menu is often the number before the service charge and the tax.",
      figure: added,
      body: `<p>Zola's spend survey put unexpected costs at ${added} on average. ${feeShare}% of couples faced a mandatory venue service fee. A service charge commonly runs ${service}. Zola's venue guide mentions a top end of ${costs.hidden.serviceChargeVenueHighPct.value}%.</p>
<p>Plus-plus means the menu price still needs the service charge and the tax. A service charge is not automatically a tip. Read the contract before you add gratuity on top. The checker on the <a href="/budget/per-guest">cost per guest page</a> adds the percents you type. It does not guess a state tax rate.</p>
<p>Zola also says weekday or winter dates can run ${costs.hidden.offPeakSavingsLowPct.value}–${costs.hidden.offPeakSavingsHighPct.value}% less at many vendors. That is a discount range, not a promise. The Knot study says ${Math.round(costs.hidden.knotWentOverShare.value * 100)}% of couples went over budget. Zola's survey says ${Math.round(costs.hidden.zolaWentOverShare.value * 100)}% did. Different studies, both on the record.</p>`,
      faqs: [
        { q: "What are hidden wedding costs?", a: `Costs that show up after the first quote. Zola's survey averaged them at ${added}. A common one is a venue service charge of ${service}.` },
        { q: "What does plus-plus mean on a wedding menu?", a: "The printed price still needs a service charge and sales tax. Ask whether gratuity is already inside the service charge." },
        { q: "Do off-peak weddings cost less?", a: `Zola says many vendors discount weekday or winter weddings by about ${costs.hidden.offPeakSavingsLowPct.value}–${costs.hidden.offPeakSavingsHighPct.value}%. Confirm it in the contract. The main total on the budget calculator stays put until you edit it.` },
      ],
    },
    {
      slug: "honeymoon-budget",
      path: "/guides/honeymoon-budget",
      title: "Honeymoon Budget",
      crumb: "Honeymoon budget",
      card: `${moonKnot} in The Knot's study. ${moonZola} in Zola's.`,
      description: `Honeymoon budget: ${moonKnot} average in The Knot's 2026 study and ${moonZola} in Zola's. ${moonShare}% of Knot couples took a honeymoon.`,
      lede: `Plan the honeymoon on top of the wedding. The Knot average is ${moonKnot}. Zola's is ${moonZola}.`,
      figure: moonKnot,
      body: `<p>${moonShare}% of couples in The Knot's 2026 study took a honeymoon. The average they spent was ${moonKnot}. Zola's average is ${moonZola}. Neither figure is inside the ${knot} wedding average.</p>
<p>The <a href="/honeymoon">honeymoon budget page</a> links to VacationMath for a real trip total: Maui and other destinations, all-inclusive resorts, cruises, and how to fund the trip.</p>`,
      faqs: [
        { q: "How much should a honeymoon budget be?", a: `The published averages are ${moonKnot} (The Knot) and ${moonZola} (Zola). A specific trip can sit far from either one. VacationMath prices the flights, lodging, and daily spending.` },
        { q: "What share of couples take a honeymoon?", a: `${moonShare}% of couples in The Knot's 2026 study took one.` },
      ],
    },
  ];
}

function statePages(costs, geo) {
  const abbrs = Object.keys(geo.states).sort((a, b) => geo.states[a].name.localeCompare(geo.states[b].name));
  const pages = abbrs.map((abbr) => renderState(abbr, costs, geo));
  pages.forEach((page, index) => {
    const prev = pages[(index - 1 + pages.length) % pages.length];
    const next = pages[(index + 1) % pages.length];
    page.related = [
      [`/?loc=${page.loc}`, `Wedding cost calculator for ${page.crumbName}`, "Same figures, with your guest count."],
      [`/budget?loc=${page.loc}`, "Wedding budget calculator", "Split the total into categories."],
      ["/budget/per-guest", "Wedding cost per guest calculator", "What cutting guests saves."],
      ["/honeymoon", "Honeymoon budget", "A separate trip, after the wedding."],
      [prev.path, prev.crumbName, "Neighboring page in the state list."],
      [next.path, next.crumbName, "Next state in the list."],
    ];
  });
  return pages;
}

function renderState(abbr, costs, geo) {
  const official = geo.states[abbr].name;
  const slug = stateSlug(official);
  const path = `/wedding-cost/${slug}`;
  const label = abbr === "DC" ? "Washington, DC" : official;
  const place = describe(abbr === "DC" ? "metro:47900" : `state:${abbr}`, { geo, costs, zipState: abbr });
  const guests = costs.national.knotGuests.value;
  if (abbr === "DC") return renderDc({ label, slug, path, place, costs, geo, guests });
  const row = costs.states[abbr];
  const knotText = money(row.knot);
  const per = money(row.knot / guests);
  const diff = row.knot - costs.national.knotAverage.value;
  const compare = diff === 0
    ? `the same as the national Knot average of ${money(costs.national.knotAverage.value)}`
    : `${money(Math.abs(diff))} ${diff > 0 ? "above" : "below"} the national Knot average of ${money(costs.national.knotAverage.value)}`;
  const zolaHtml = row.zolaLow == null
    ? `<p>Zola's Wedding Cost Index does not publish a ${escapeHtml(official)} range. This page leaves that blank.</p>`
    : `<p>Zola's published ${escapeHtml(official)} budget range is ${money(row.zolaLow)}–${money(row.zolaHigh)}. Zola's national average is ${money(costs.national.zolaAverage.value)}. ${zolaPosition(row, costs.national.zolaAverage.value)}</p>`;
  const examples = [50, 100, guests, 150].map((count) => {
    const plan = planFor(place, count, costs);
    const note = count === guests ? "Matches the published Knot average." : "Knot-based planning figure.";
    return `<tr><td>${count}</td><td>${escapeHtml(formatPlan(plan))}</td><td>${note}</td></tr>`;
  }).join("");
  const cities = cityBlocks(abbr, costs, geo);
  const metros = metroTable(abbr, costs, geo, guests);
  const directoryMoney = knotText;
  const directoryNote = row.zolaLow == null ? "Zola range not published" : `Zola ${money(row.zolaLow)}–${money(row.zolaHigh)}`;
  const description = row.zolaLow == null
    ? `How much a wedding costs in ${official}: The Knot's 2026 average is ${knotText}. Zola does not publish a ${official} range. Cities, metro estimates, and sources.`
    : `How much a wedding costs in ${official}: The Knot's 2026 average is ${knotText}. Zola's budget range is ${money(row.zolaLow)}–${money(row.zolaHigh)}.`;
  const zolaFaq = row.zolaLow == null
    ? `Zola does not publish a ${official} range on the Wedding Cost Index page, so this page does not invent one. The Knot average is ${knotText}.`
    : `Zola's published ${official} budget range is ${money(row.zolaLow)}–${money(row.zolaHigh)}. It stays beside the Knot average of ${knotText}. The two are separate studies.`;
  return {
    file: `wedding-cost/${slug}.html`,
    path,
    title: `How Much Does a Wedding Cost in ${label}?`,
    description,
    schema: "article",
    wide: true,
    sort: official,
    crumbName: label,
    directoryMoney,
    directoryNote,
    loc: `state:${abbr}`,
    crumbs: [{ name: "Home", path: "/" }, { name: "Wedding cost", path: "/wedding-cost" }, { name: label, path }],
    og: { figure: knotText },
    faqs: [
      { q: `How much does a wedding cost in ${label}?`, a: `The Knot's 2026 average for ${official} is ${knotText}. That is ${compare}. ${zolaFaq}` },
      { q: `What is the wedding cost per guest in ${label}?`, a: `The Knot does not publish a separate ${official} per-guest rate. Dividing the state average of ${knotText} by the national average guest count of ${guests} is ${per}. That division is labeled as math, not as its own published rate. The national published rate is ${money(costs.national.knotPerGuest.value)}.` },
      { q: `Which cities in ${label} have their own wedding cost figures?`, a: cities.faq },
      { q: `What if our ${label} city has no wedding study?`, a: `The state average is the sourced starting point. A metro without its own study is estimated by multiplying the state figures by that metro's BEA price level divided by ${official}'s price level of ${geo.states[abbr].rpp.toFixed(1)} (US = 100). The page labels those rows estimated.` },
    ],
    explainerTitle: `Using the ${label} figures`,
    explainer: [
      `At ${guests} guests, the Knot-based planning figure matches the published ${official} average of ${knotText}. Other guest counts move food and a few other lines and leave the venue, photographer, and similar costs put. Zola's state range, when it exists, stays beside that figure.`,
      `${official}'s all-items price level is ${geo.states[abbr].rpp.toFixed(1)}, with the US at 100, from BEA Regional Price Parities for 2024.`,
    ],
    body: `<article>
<h1>How Much Does a Wedding Cost in ${escapeHtml(label)}?</h1>
<section class="summary-card card">
  <p class="kicker">At a glance</p>
  <div class="pair">
    <article><p class="study">The Knot</p><p class="figure">${knotText}</p><p class="hint">Average spend in ${escapeHtml(official)}. 2026 Real Weddings Study, article updated ${escapeHtml(prettyDate(costs.sources["knot-study"].date))}.</p></article>
    <article><p class="study">Zola</p><p class="figure">${row.zolaLow == null ? "Not published" : `${money(row.zolaLow)}–${money(row.zolaHigh)}`}</p><p class="hint">${row.zolaLow == null ? `No ${escapeHtml(official)} range on the Wedding Cost Index page.` : `Published budget range. Updated ${escapeHtml(prettyDate(costs.sources["zola-index"].date))}. Shown beside The Knot.`}</p></article>
  </div>
  ${costBars(row.knot, row.zolaLow, row.zolaHigh, costs.national.knotAverage.value)}
  <p><a class="btn" href="/?loc=state:${abbr}">Price a ${escapeHtml(label)} wedding</a></p>
</section>
<p class="lede">The Knot's 2026 average for a ${escapeHtml(official)} wedding is ${knotText}. That is ${escapeHtml(compare)}.</p>
${zolaHtml}
${venueLinksForState(abbr)}
<h2>Guest count</h2>
<p>The Knot's national average guest count is ${guests}. The ${per} figure is ${knotText} divided by ${guests}. It is that division, not a separate published ${escapeHtml(official)} rate.</p>
<div class="table-wrap"><table>
<caption>Knot-based planning figure for a ${escapeHtml(official)} wedding at four guest counts.</caption>
<thead><tr><th>Guests</th><th>Planning figure</th><th>What it is</th></tr></thead>
<tbody>${examples}</tbody>
</table></div>
<h2>Cities in ${escapeHtml(label)} with their own figures</h2>
${cities.html}
<h2>Other ${escapeHtml(label)} metros</h2>
${metros}
</article>`,
  };
}

function renderDc({ label, slug, path, place, costs, geo, guests }) {
  const metro = costs.metros["47900"];
  const knotText = money(metro.knot);
  const zolaText = money(metro.zola150);
  const examples = [50, 100, guests, 150].map((count) => {
    const plan = planFor(place, count, costs);
    return `<tr><td>${count}</td><td>${escapeHtml(formatPlan(plan))}</td><td>${count === guests ? "Matches The Knot's Washington, DC average." : "Knot-based planning figure for the published city."}</td></tr>`;
  }).join("");
  return {
    file: `wedding-cost/${slug}.html`,
    path,
    title: `How Much Does a Wedding Cost in ${label}?`,
    description: `How much a wedding costs in Washington, DC. The Knot's 2026 city average is ${knotText}. Zola's 150-guest figure is ${zolaText}. Neither study publishes a DC state row.`,
    schema: "article",
    wide: true,
    sort: "District of Columbia",
    crumbName: label,
    directoryMoney: knotText,
    directoryNote: `Zola ${zolaText} at 150 guests`,
    loc: "metro:47900",
    crumbs: [{ name: "Home", path: "/" }, { name: "Wedding cost", path: "/wedding-cost" }, { name: label, path }],
    og: { figure: knotText },
    faqs: [
      { q: "How much does a wedding cost in Washington, DC?", a: `The Knot's 2026 city average is ${knotText}. Zola's 150-guest figure is ${zolaText}. Neither study publishes a separate District of Columbia state average, so this page uses the city figures.` },
      { q: "Is there a DC state average?", a: "No. The Knot's state table and Zola's state table both skip the District of Columbia. The Washington city figures are the sourced numbers." },
      { q: "Does the Washington metro include other states?", a: "Yes. The Washington-Arlington-Alexandria metro includes parts of Virginia, Maryland, and West Virginia. The published city figures are for Washington, DC, and this site uses them for that metro." },
    ],
    explainerTitle: "Using the Washington, DC figures",
    explainer: [
      `At ${guests} guests, the planning figure matches The Knot's published Washington average of ${knotText}. Zola's ${zolaText} is the published 150-guest figure and stays beside it.`,
      `The District's all-items price level is ${geo.states.DC.rpp.toFixed(1)}, with the US at 100 (BEA, 2024). The metro's price level is ${geo.metros["47900"].rpp.toFixed(1)}.`,
    ],
    body: `<article>
<h1>How Much Does a Wedding Cost in ${escapeHtml(label)}?</h1>
<section class="summary-card card">
  <p class="kicker">At a glance</p>
  <div class="pair">
    <article><p class="study">The Knot</p><p class="figure">${knotText}</p><p class="hint">Washington, DC city average. Article updated ${escapeHtml(prettyDate(costs.sources["knot-study"].date))}.</p></article>
    <article><p class="study">Zola</p><p class="figure">${zolaText}</p><p class="hint">150-guest Washington, DC figure. Updated ${escapeHtml(prettyDate(costs.sources["zola-index"].date))}.</p></article>
  </div>
  ${costBars(metro.knot, null, null, costs.national.knotAverage.value, metro.zola150)}
  <p><a class="btn" href="/?loc=metro:47900">Price a Washington, DC wedding</a></p>
</section>
<p class="lede">The Knot and Zola do not publish a District of Columbia state average. They do publish Washington, DC city figures: ${knotText} in The Knot's 2026 study, and ${zolaText} for a 150-guest wedding in Zola's index.</p>
<h2>Guest count</h2>
<div class="table-wrap"><table>
<caption>Knot-based planning figure for a Washington, DC wedding.</caption>
<thead><tr><th>Guests</th><th>Planning figure</th><th>What it is</th></tr></thead>
<tbody>${examples}</tbody>
</table></div>
<h2>Cities with their own figures</h2>
<p>Washington, DC is the published city. The Knot average is ${knotText}. Zola's 150-guest figure is ${zolaText}. <a href="/?loc=metro:47900">Open it in the calculator</a>.</p>
<h2>Other District of Columbia metros</h2>
<p>The July 2023 delineation assigns the Washington metro here. It crosses into Virginia, Maryland, and West Virginia. No second metro is assigned to the District alone.</p>
</article>`,
  };
}

function cityBlocks(abbr, costs, geo) {
  const blocks = [];
  const names = [];
  for (const [code, metro] of Object.entries(geo.metros)) {
    if (metro.primaryState !== abbr) continue;
    const wedding = costs.metros[code];
    if (!wedding) continue;
    names.push(metro.short);
    const bits = [];
    if (wedding.knot) bits.push(`The Knot's city average is ${money(wedding.knot)}`);
    if (wedding.curve) {
      const at150 = wedding.curve.find((pt) => pt.guests === 150);
      bits.push(`Zola publishes a guest-count curve, including ${money(at150.value)} at 150 guests`);
    } else if (wedding.zola150) bits.push(`Zola's 150-guest figure is ${money(wedding.zola150)}`);
    const subs = Object.values(costs.subs).filter((sub) => sub.parent === code);
    const subText = subs.map((sub) => `${escapeHtml(sub.label)}: Zola's 150-guest figure is ${money(sub.zola150)}`).join(". ");
    blocks.push(`<p><strong>${escapeHtml(metro.short)}.</strong> ${bits.join(". ")}. A city figure is separate from the state average. <a href="/?loc=metro:${code}">Price a ${escapeHtml(metro.short)} wedding</a>.${subText ? ` ${subText}.` : ""}</p>`);
  }
  if (!blocks.length) {
    return {
      html: `<p>The Knot and Zola do not publish a city wedding figure for ${escapeHtml(geo.states[abbr].name)}. The state averages above are the sourced local numbers.</p>`,
      faq: `No city in ${geo.states[abbr].name} has its own Knot or Zola wedding figure in these studies. Use the state average, or an estimated metro row if you are in one.`,
    };
  }
  return {
    html: blocks.join(""),
    faq: `${names.join(", ")} ${names.length === 1 ? "has" : "have"} a published city figure, listed above the state average. Other metros in the state are estimates.`,
  };
}

function metroTable(abbr, costs, geo, guests) {
  const rows = [];
  for (const [code, metro] of Object.entries(geo.metros)) {
    if (metro.primaryState !== abbr) continue;
    if (costs.metros[code]) continue;
    const place = describe(`metro:${code}`, { geo, costs, zipState: abbr });
    const plan = planFor(place, guests, costs);
    rows.push(`<tr><td>${escapeHtml(metro.short)}</td><td class="num">${metro.rpp.toFixed(1)}</td><td>Estimated</td><td>${escapeHtml(formatPlan(plan))}</td></tr>`);
  }
  rows.sort((a, b) => a.localeCompare(b));
  if (!rows.length) return `<p>Every metro assigned primarily to this state has its own city study, listed above.</p>`;
  return `<p>Estimated means the state wedding figures times this metro's price level, divided by the state's. It is not a survey of weddings in that metro. Figures use ${guests} guests. A metro that crosses state lines is listed under its primary state.</p>
<div class="table-wrap metro-table"><table>
<caption>Estimated ${guests}-guest wedding cost for metros without their own wedding survey.</caption>
<thead><tr><th>Metro</th><th>Price level</th><th>Level</th><th>At ${guests} guests</th></tr></thead>
<tbody>${rows.join("")}</tbody>
</table></div>`;
}

function costBars(knot, zolaLow, zolaHigh, national, zolaPoint) {
  const rows = [{ label: "The Knot", value: knot }];
  if (zolaPoint) rows.push({ label: "Zola", value: zolaPoint });
  else if (zolaLow != null) {
    rows.push({ label: "Zola low", value: zolaLow });
    rows.push({ label: "Zola high", value: zolaHigh });
  }
  rows.push({ label: "US Knot avg", value: national });
  const max = Math.max(...rows.map((row) => row.value));
  return `<div class="bar-list">${rows.map((row) => {
    const width = Math.max(8, Math.round((row.value / max) * 100));
    return `<div class="bar-row"><span>${escapeHtml(row.label)}</span><span class="bar-track"><span style="--w:${width}%"></span></span><strong>${money(row.value)}</strong></div>`;
  }).join("")}</div>`;
}

function zolaPosition(row, national) {
  if (row.zolaLow > national) return "The whole range sits above Zola's national average.";
  if (row.zolaHigh < national) return "The whole range sits below Zola's national average.";
  return "The range covers both sides of Zola's national average.";
}

function renderRelated(links) {
  if (!links || !links.length) return "";
  const cards = links.map(([href, label, note]) => `<a href="${escapeHtml(href)}"><span><strong>${escapeHtml(label)}</strong><br><small>${escapeHtml(note)}</small></span><span>Open</span></a>`).join("");
  return `<nav class="related" aria-label="Related"><h2>Keep going</h2><div class="links">${cards}</div></nav>`;
}

function linksExcept(path, items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (item[0] === path || seen.has(item[0])) continue;
    seen.add(item[0]);
    out.push(item);
    if (out.length === 6) break;
  }
  return out;
}

function prettyDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[month - 1]} ${day}, ${year}`;
}
