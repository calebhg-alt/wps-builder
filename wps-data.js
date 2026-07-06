/* ============================================================================
   WPS Builder — Data Layer
   All data below is drawn from AWS D1.1/D1.1M:2015 (Clause 1, Clause 3 Tables
   3.1/3.2/3.3, Clause 5.3.4, Clause 5.4.5, Annex U Table U.4).
   Architecture is process-keyed so future processes (FCAW-G, SMAW, GMAW,
   GTAW) can be added without restructuring the app.
   ============================================================================ */

// ---------------------------------------------------------------------------
// Process library — currently FCAW-S only, built to extend.
// ---------------------------------------------------------------------------
const PROCESS_LIBRARY = {
  "FCAW-S": {
    label: "FCAW-S — Self-Shielded Flux Cored Arc Welding",
    definition: "A flux cored arc welding process where shielding is exclusively provided by a flux contained within the tubular electrode.",
    citation: "AWS D1.1/D1.1M:2015, Clause 1, Terms and Definitions.",
    spec: "AWS A5.20/A5.20M",
    specCitation: "AWS D1.1/D1.1M:2015, Clause 5.3.4 — FCAW carbon steel electrodes shall conform to AWS A5.20 (or the newer combined AWS A5.36).",
    // Annex U, Table U.4 — usability designators
    designators: [
      { code: "T3S", desc: "Spray transfer, titanium-based slag, very high travel speed.", positions: ["F", "H"], polarity: "DCEP", singlePassOnly: true },
      { code: "T4", desc: "Globular transfer, fluoride-based slag, very high deposition, low sulfur for hot-crack resistance.", positions: ["F", "H"], polarity: "DCEP", singlePassOnly: false },
      { code: "T6", desc: "Spray transfer, oxide-based slag, good low-temperature impacts and root penetration.", positions: ["F", "H"], polarity: "DCEP", singlePassOnly: false },
      { code: "T7", desc: "Small droplet-to-spray transfer, fluoride-based slag, high deposition or out-of-position by diameter.", positions: ["F", "H", "VU", "OH"], polarity: "DCEN", singlePassOnly: false },
      { code: "T8", desc: "Small droplet-to-spray transfer, fluoride-based slag, improved out-of-position control and low-temperature toughness.", positions: ["F", "H", "VD", "VU", "OH"], polarity: "DCEN", singlePassOnly: false },
      { code: "T10S", desc: "Small droplet transfer, fluoride-based slag, high travel speed on any thickness.", positions: ["F", "H"], polarity: "DCEN", singlePassOnly: true },
      { code: "T11", desc: "Smooth spray transfer, limited slag. Annex U notes it is generally not recommended over 3/4 in [19 mm] thick.", positions: ["F", "H", "VD", "OH"], polarity: "DCEN", singlePassOnly: false, prequalifiedThicknessLimitIn: 0.5 },
      { code: "T14S", desc: "Smooth spray transfer, all positions, high travel speed.", positions: ["F", "H", "VD", "OH"], polarity: "DCEN", singlePassOnly: true },
      { code: "T17", desc: "Designed specifically for AC power sources.", positions: ["F", "H", "VD", "VU", "OH"], polarity: "AC", singlePassOnly: false },
    ],
    designatorCitation: "AWS D1.1/D1.1M:2015, Annex U, Table U.4 (informative, adapted from AWS A5.36).",
    // Table 3.2 — prequalified FCAW-S electrodes for Groups I & II
    prequalifiedGroups: ["I", "II"],
    prequalifiedElectrodes: ["E70T-4", "E7XT-6", "E7XT-7", "E7XT-8", "E7XT-11"],
    prequalifiedElectrodeToDesignator: { "E70T-4": "T4", "E7XT-6": "T6", "E7XT-7": "T7", "E7XT-8": "T8", "E7XT-11": "T11" },
    excludedDesignators: ["T1S", "T3S", "T10S", "T14S"],
    excludedSuffixNote: "Any classification with a \u201c-GS\u201d suffix is also excluded outright.",
    t11ThicknessNote: "T11 (E7XT-11) is excluded from Table 3.2's prequalified list specifically for thicknesses greater than 1/2 in [12 mm] \u2014 a stricter, code-normative limit distinct from Annex U's general 3/4 in usability note.",
    tableCitation: "AWS D1.1/D1.1M:2015, Clause 3, Table 3.2 — \u201cFiller Metals for Matching Strength\u201d to Table 3.1 base metal groups.",
    lowHydrogenStorage: false,
    requiresShieldingGas: false,
  },

  "FCAW-G": {
    label: "FCAW-G — Gas-Shielded Flux Cored Arc Welding",
    definition: "A flux cored arc welding process where additional shielding is obtained from an externally supplied gas or gas mixture.",
    citation: "AWS D1.1/D1.1M:2015, Clause 1, Terms and Definitions.",
    spec: "AWS A5.20/A5.20M",
    specCitation: "AWS D1.1/D1.1M:2015, Clause 5.3.4 — FCAW carbon steel electrodes shall conform to AWS A5.20 (or the newer combined AWS A5.36).",
    requiresShieldingGas: true,
    lowHydrogenStorage: false,
    designators: [
      { code: "T1", desc: "Gas-shielded, rutile-based slag. Spray transfer, low spatter loss, moderate slag volume fully covering the bead.", positions: ["F", "H", "VU", "OH"], polarity: "DCEP", singlePassOnly: false },
      { code: "T1S", desc: "Gas-shielded, similar to T1 but with higher manganese/silicon for single-pass welding of heavily oxidized or rimmed steel.", positions: ["F", "H", "VU", "OH"], polarity: "DCEP", singlePassOnly: true },
      { code: "T5", desc: "Gas-shielded, globular transfer, thin lime-fluoride slag. Improved impact properties and cold-cracking resistance vs. T1.", positions: ["F", "H", "VU", "OH"], polarity: "DCEP or DCEN", singlePassOnly: false },
      { code: "T9", desc: "Gas-shielded, similar to T1 but with improved weld metal notch toughness.", positions: ["F", "H", "VU", "OH"], polarity: "DCEP", singlePassOnly: false },
      { code: "T12", desc: "Gas-shielded, similar to T1, modified for improved impact toughness and lower manganese (ASME A-No.1 Analysis Group).", positions: ["F", "H", "VU", "OH"], polarity: "DCEP", singlePassOnly: false },
    ],
    designatorCitation: "AWS D1.1/D1.1M:2015, Annex U, Table U.4 (informative, adapted from AWS A5.36).",
    prequalifiedGroups: ["I", "II"],
    prequalifiedElectrodes: ["E7XT-1", "E7XT-5", "E7XT-9", "E7XT-12"],
    prequalifiedElectrodeToDesignator: { "E7XT-1": "T1", "E7XT-5": "T5", "E7XT-9": "T9", "E7XT-12": "T12" },
    excludedDesignators: ["T1S"],
    excludedSuffixNote: "Any classification with a \u201c-GS\u201d suffix is also excluded outright.",
    tableCitation: "AWS D1.1/D1.1M:2015, Clause 3, Table 3.2 — \u201cFiller Metals for Matching Strength\u201d to Table 3.1 base metal groups.",
    shieldingGasOptions: ["100% CO2", "75% Ar / 25% CO2 (mixed gas)"],
  },

  "SMAW": {
    label: "SMAW — Shielded Metal Arc Welding",
    definition: "An arc welding process that produces coalescence of metals by heating them with an arc between a covered metal electrode and the work. Shielding is obtained from decomposition of the electrode covering.",
    citation: "AWS D1.1/D1.1M:2015, Clause 1, Terms and Definitions (general SMAW description).",
    spec: "AWS A5.1/A5.1M (carbon steel) or A5.5/A5.5M (low-alloy)",
    specCitation: "AWS D1.1/D1.1M:2015, Clause 5.3.4 area — SMAW electrodes shall conform to AWS A5.1 (carbon steel) or A5.5 (low-alloy steel).",
    requiresShieldingGas: false,
    lowHydrogenStorage: null,
    designators: [
      { code: "E6010", desc: "Cellulosic covering, deep penetration, DCEP only. Not low-hydrogen.", positions: ["F", "H", "VU", "OH"], polarity: "DCEP", lowHydrogen: false },
      { code: "E6011", desc: "Cellulosic covering, deep penetration, AC or DCEP. Not low-hydrogen.", positions: ["F", "H", "VU", "OH"], polarity: "AC or DCEP", lowHydrogen: false },
      { code: "E6013", desc: "Rutile covering, easy strike, light spatter, AC/DCEP/DCEN. Not low-hydrogen.", positions: ["F", "H", "VU", "OH"], polarity: "AC, DCEP, or DCEN", lowHydrogen: false },
      { code: "E7014", desc: "Rutile/iron-powder covering, higher deposition, AC/DCEP/DCEN. Not low-hydrogen.", positions: ["F", "H", "VD", "OH"], polarity: "AC, DCEP, or DCEN", lowHydrogen: false },
      { code: "E7016", desc: "Low-hydrogen potassium covering, all-position, AC or DCEP.", positions: ["F", "H", "VU", "OH"], polarity: "AC or DCEP", lowHydrogen: true },
      { code: "E7018", desc: "Low-hydrogen iron-powder covering, all-position, AC or DCEP. Common structural choice.", positions: ["F", "H", "VU", "OH"], polarity: "AC or DCEP", lowHydrogen: true },
      { code: "E7024", desc: "Iron-powder covering, high deposition, flat/horizontal fillet only. Not low-hydrogen.", positions: ["F", "H"], polarity: "AC, DCEP, or DCEN", lowHydrogen: false },
      { code: "E7028", desc: "Low-hydrogen iron-powder covering, high deposition, flat/horizontal fillet only. Low-hydrogen.", positions: ["F", "H"], polarity: "AC or DCEP", lowHydrogen: true },
    ],
    designatorCitation: "AWS A5.1/A5.1M classifications, cross-referenced against AWS D1.1/D1.1M:2015, Clause 3, Table 3.2 SMAW columns.",
    prequalifiedGroups: ["I", "II", "III", "IV"],
    prequalifiedElectrodes: ["E6010", "E6011", "E6013", "E7014", "E7016", "E7018", "E7024", "E7028"],
    prequalifiedElectrodeToDesignator: { "E6010": "E6010", "E6011": "E6011", "E6013": "E6013", "E7014": "E7014", "E7016": "E7016", "E7018": "E7018", "E7024": "E7024", "E7028": "E7028" },
    groupRequirements: {
      "I": "E60XX or E70XX classifications (carbon steel, A5.1) \u2014 low-hydrogen not mandatory at this group.",
      "II": "E7015, E7016, E7018, or E7028 (carbon steel, A5.1, all low-hydrogen) \u2014 or E7015-X/E7016-X/E7018-X (low-alloy, A5.5).",
      "III": "Low-alloy low-hydrogen only: E8015-X family (A5.5). No plain carbon-steel A5.1 option at this group.",
      "IV": "Low-alloy low-hydrogen only: E9015-X/E9016-X/E9018-X/E9018M family (A5.5).",
    },
    tableCitation: "AWS D1.1/D1.1M:2015, Clause 3, Table 3.2 \u2014 \u201cFiller Metals for Matching Strength\u201d, SMAW and SAW columns.",
    lowHydrogenStorageCitation: "AWS D1.1/D1.1M:2015, Clause 5.3.2.1 \u2014 low-hydrogen electrodes conforming to A5.1/A5.5 shall arrive in hermetically sealed containers or be baked by the user, with holding ovens required once a sealed container is opened.",
  },

  // Future entries: "GMAW": {...}, "GTAW": {...}
};

// ---------------------------------------------------------------------------
// Form M-4 — "Welder, Welding Operator, or Tack Welder Performance
// Qualification Test Record" (the record commonly shorthanded WQTR).
// Field list drawn directly from the D1.1-2015 Annex M sample form.
// ---------------------------------------------------------------------------
const WQTR_FORM_CITATION = "AWS D1.1/D1.1M:2015, Annex M, Form M-4 \u2014 Sample Welder Qualification Blank Form (Single-Process): \u201cWelder, Welding Operator, or Tack Welder Performance Qualification Test Record.\u201d";
const WQTR_PROGRESSION_OPTIONS = ["Not applicable", "Uphill", "Downhill"];
const WQTR_TYPE_OF_WELD_JOINT = ["Groove", "Fillet"];
const WQTR_TEST_TYPES = [
  "Visual Inspection",
  "Guided Bend Test \u2014 Face",
  "Guided Bend Test \u2014 Root",
  "Guided Bend Test \u2014 Side",
  "Fillet Weld Break Test",
  "Macroetch Test",
  "Radiographic Test (RT)",
];

// ---------------------------------------------------------------------------
// Base metal groups — Table 3.1
// ---------------------------------------------------------------------------
const BASE_METAL_GROUPS = {
  "I": {
    strengthRange: "36\u201358 ksi yield",
    fcawSAllowed: true,
    examples: [
      { spec: "ASTM A36 (\u2264 3/4\" [19 mm])" },
      { spec: "ASTM A500 Gr. A" },
      { spec: "ASTM A500 Gr. B" },
      { spec: "ASTM A500 Gr. C" },
      { spec: "ASTM A501 Gr. A" },
      { spec: "ASTM A516 Gr. 55" },
      { spec: "ASTM A516 Gr. 60" },
      { spec: "ASTM A53 Gr. B" },
    ],
  },
  "II": {
    strengthRange: "42\u201355 ksi yield",
    fcawSAllowed: true,
    examples: [
      { spec: "ASTM A36 (> 3/4\" [19 mm])" },
      { spec: "ASTM A572 Gr. 42" },
      { spec: "ASTM A572 Gr. 50" },
      { spec: "ASTM A572 Gr. 55" },
      { spec: "ASTM A588" },
      { spec: "ASTM A709 Gr. 50" },
      { spec: "ASTM A992" },
    ],
  },
  "III": {
    strengthRange: "50\u201360 ksi yield (higher alloy)",
    fcawSAllowed: false,
    examples: [
      { spec: "ASTM A572 Gr. 60 (part)" },
      { spec: "ASTM A913 Gr. 60 (part)" },
      { spec: "Higher-strength low-alloy steels" },
    ],
  },
  "IV": {
    strengthRange: "60\u201365 ksi yield (higher alloy)",
    fcawSAllowed: false,
    examples: [
      { spec: "ASTM A572 Gr. 65" },
      { spec: "ASTM A913 Gr. 65/70" },
      { spec: "Highest prequalified strength steels" },
    ],
  },
};
const BASE_METAL_GROUPS_CITATION = "AWS D1.1/D1.1M:2015, Clause 3, Table 3.1 \u2014 \u201cApproved Base Metals for Prequalified WPSs.\u201d Examples shown are representative, not the complete table.";

// ---------------------------------------------------------------------------
// Table 3.3 — Prequalified Minimum Preheat & Interpass Temperature
// Category B applies to FCAW (along with SMAW low-hydrogen, SAW, GMAW) on
// Group I and Group II base metals.
// ---------------------------------------------------------------------------
const PREHEAT_CATEGORY_B = [
  { minIn: 0.125, maxIn: 0.75, tempF: 32, tempC: 0, label: "1/8\" to 3/4\" incl." },
  { minIn: 0.75, maxIn: 1.5, tempF: 50, tempC: 10, label: "Over 3/4\" thru 1-1/2\" incl." },
  { minIn: 1.5, maxIn: 2.5, tempF: 150, tempC: 65, label: "Over 1-1/2\" thru 2-1/2\" incl." },
  { minIn: 2.5, maxIn: Infinity, tempF: 225, tempC: 110, label: "Over 2-1/2\"" },
];
const PREHEAT_CITATION_B = "AWS D1.1/D1.1M:2015, Clause 3, Table 3.3, Category B (SMAW with low-hydrogen electrodes, SAW, GMAW, and FCAW on Group I/II base metals).";

// Category A — SMAW with OTHER THAN low-hydrogen electrodes (e.g., E6010,
// E6011, E6013, E7014, E7024) on Group I base metals. Higher preheat than
// Category B at the same thickness because non-low-hydrogen processes carry
// higher hydrogen content and cracking risk.
const PREHEAT_CATEGORY_A = [
  { minIn: 0.125, maxIn: 0.75, tempF: 32, tempC: 0, label: "1/8\" to 3/4\" incl." },
  { minIn: 0.75, maxIn: 1.5, tempF: 150, tempC: 65, label: "Over 3/4\" thru 1-1/2\" incl." },
  { minIn: 1.5, maxIn: 2.5, tempF: 225, tempC: 110, label: "Over 1-1/2\" thru 2-1/2\" incl." },
  { minIn: 2.5, maxIn: Infinity, tempF: 300, tempC: 150, label: "Over 2-1/2\"" },
];
const PREHEAT_CITATION_A = "AWS D1.1/D1.1M:2015, Clause 3, Table 3.3, Category A (SMAW with other than low-hydrogen electrodes on Group I base metals).";

// Determines which Table 3.3 category applies for a given process + electrode.
function getPreheatCategory(processKey, electrodeCode) {
  const proc = PROCESS_LIBRARY[processKey];
  if (processKey === "SMAW") {
    const d = proc.designators.find(x => x.code === electrodeCode);
    if (d && d.lowHydrogen === false) {
      return { rows: PREHEAT_CATEGORY_A, citation: PREHEAT_CITATION_A, name: "A" };
    }
    return { rows: PREHEAT_CATEGORY_B, citation: PREHEAT_CITATION_B, name: "B" };
  }
  // FCAW-S, FCAW-G (and future SAW/GMAW) fall under Category B
  return { rows: PREHEAT_CATEGORY_B, citation: PREHEAT_CITATION_B, name: "B" };
}

// ---------------------------------------------------------------------------
// Preheat floor — Clause 5.4.5 (GMAW/FCAW specific; SMAW has no equivalent
// blanket floor stated in this clause, so this note is shown only for
// gas-shielded/flux-cored processes)
// ---------------------------------------------------------------------------
const PREHEAT_FLOOR_F = 32;
const PREHEAT_FLOOR_CITATION = "AWS D1.1/D1.1M:2015, Clause 5.4.5 \u2014 GMAW/FCAW preheat is not normally required due to high heat input, but welding is prohibited below 32\u00b0F [0\u00b0C] base metal temperature.";

// ---------------------------------------------------------------------------
// Joint / weld / position reference data (course scope: 3G/4G structural)
// ---------------------------------------------------------------------------
const JOINT_TYPES = ["Butt Joint", "Tee Joint", "Corner Joint", "Lap Joint", "Edge Joint"];
const WELD_TYPES = ["Fillet Weld", "Square-Groove Weld", "Bevel-Groove Weld", "V-Groove Weld"];
const JOINT_PENETRATION_TYPES = ["Complete Joint Penetration (CJP)", "Partial Joint Penetration (PJP)", "N/A (Fillet Weld)"];
const WELDING_POSITIONS = [
  { code: "1G", desc: "Flat — groove" },
  { code: "2G", desc: "Horizontal — groove" },
  { code: "3G", desc: "Vertical — groove" },
  { code: "4G", desc: "Overhead — groove" },
  { code: "1F", desc: "Flat — fillet" },
  { code: "2F", desc: "Horizontal — fillet" },
  { code: "3F", desc: "Vertical — fillet" },
  { code: "4F", desc: "Overhead — fillet" },
];

// ---------------------------------------------------------------------------
// Storage / condition citations (Clause 5.3.1 / 5.3.2.1)
// ---------------------------------------------------------------------------
const STORAGE_GENERAL_CITATION = "AWS D1.1/D1.1M:2015, Clause 5.3.1.4/.5 \u2014 consumables removed from original packaging must be protected/stored so welding properties aren't affected, and kept dry and in suitable condition.";
const STORAGE_NOT_REQUIRED_NOTE = "The SMAW low-hydrogen oven/hermetic-container procedure (Clause 5.3.2.1) is scoped to electrodes conforming to A5.1/A5.5 and does not extend to FCAW-S wire.";
