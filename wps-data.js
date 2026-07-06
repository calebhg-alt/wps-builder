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
  },
  // Future entries: "FCAW-G": {...}, "SMAW": {...}, "GMAW": {...}, "GTAW": {...}
};

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
const PREHEAT_CITATION = "AWS D1.1/D1.1M:2015, Clause 3, Table 3.3, Category B (applies to FCAW on Group I/II base metals).";

// ---------------------------------------------------------------------------
// Preheat floor — Clause 5.4.5
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
