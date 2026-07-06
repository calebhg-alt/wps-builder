/* ============================================================================
   WPS Builder — Application Logic
   Vanilla JS, no framework, no build step (single static site, GitHub Pages
   or Canvas iframe compatible). Fully keyboard operable; see the in-app
   Keyboard Shortcuts panel (Alt+K).
   ============================================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "wps-builder-fcaws-v1";

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  const defaultState = {
    process: "FCAW-S",
    header: { org: "", wpsNumber: "", date: "", revision: "", preparedBy: "" },
    baseMetal: { group: "", spec: "", thicknessIn: "" },
    filler: { electrode: "" },
    joint: { jointType: "", weldType: "", penetration: "", position: "" },
    preheat: { overrideTempF: "", interpassTempF: "" },
    electrical: {
      amperageMin: "", amperageMax: "",
      voltageMin: "", voltageMax: "",
      travelSpeed: "", ctwd: "",
      technique: "", cleaning: "",
    },
  };

  let state = loadState();
  let currentStep = 0;

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Object.assign({}, JSON.parse(JSON.stringify(defaultState)), parsed);
      }
    } catch (e) { /* ignore corrupt storage */ }
    return JSON.parse(JSON.stringify(defaultState));
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable; app still works, just no persistence */ }
  }

  // ---------------------------------------------------------------------
  // Icons (inline SVG, decorative -> aria-hidden)
  // ---------------------------------------------------------------------
  function icon(name) {
    const common = 'width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
    switch (name) {
      case "info":
        return `<svg ${common}><circle cx="12" cy="12" r="10" fill="#5B7A9E"/><rect x="11" y="10" width="2" height="7" fill="#fff"/><rect x="11" y="6.5" width="2" height="2" fill="#fff"/></svg>`;
      case "success":
        return `<svg ${common}><circle cx="12" cy="12" r="10" fill="#1F5C38"/><path d="M7 12.5l3 3 7-7" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      case "warn":
        return `<svg ${common}><path d="M12 2 L23 21 L1 21 Z" fill="#8A6D1D"/><rect x="11" y="9" width="2" height="6" fill="#fff"/><rect x="11" y="16.5" width="2" height="2" fill="#fff"/></svg>`;
      case "error":
        return `<svg ${common}><circle cx="12" cy="12" r="10" fill="#8f1515"/><line x1="8" y1="8" x2="16" y2="16" stroke="#fff" stroke-width="2.2"/><line x1="16" y1="8" x2="8" y2="16" stroke="#fff" stroke-width="2.2"/></svg>`;
      default:
        return "";
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function classificationForDesignator(proc, code) {
    const map = proc.prequalifiedElectrodeToDesignator || {};
    for (const classification in map) {
      if (map[classification] === code) return classification;
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // Step configuration
  // ---------------------------------------------------------------------
  const STEPS = [
    { id: "header", title: "WPS Header Information", render: renderHeaderStep },
    { id: "baseMetal", title: "Base Metal Selection", render: renderBaseMetalStep },
    { id: "filler", title: "Filler Metal Selection", render: renderFillerStep },
    { id: "joint", title: "Joint, Weld Type & Position", render: renderJointStep },
    { id: "preheat", title: "Preheat & Interpass Temperature", render: renderPreheatStep },
    { id: "electrical", title: "Electrical Characteristics & Technique", render: renderElectricalStep },
    { id: "review", title: "Review & Print", render: renderReviewStep },
  ];

  // ---------------------------------------------------------------------
  // Helpers: field + validation message builders
  // ---------------------------------------------------------------------
  function field(opts) {
    const { id, label, required, hint, type, value, options, tag } = opts;
    const reqMark = required ? '<span class="required-mark" aria-hidden="true">*</span>' : "";
    const reqAttr = required ? "required" : "";
    const reqSr = required ? '<span class="sr-only"> (required)</span>' : "";
    let control = "";
    if (tag === "select") {
      control = `<select id="${id}" name="${id}" ${reqAttr} aria-describedby="${id}-msg">
        <option value="">Select&hellip;</option>
        ${options.map(o => `<option value="${escapeHtml(o.value)}" ${o.value === value ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}
      </select>`;
    } else if (tag === "textarea") {
      control = `<textarea id="${id}" name="${id}" ${reqAttr} aria-describedby="${id}-msg">${escapeHtml(value)}</textarea>`;
    } else {
      control = `<input type="${type || 'text'}" id="${id}" name="${id}" ${reqAttr} value="${escapeHtml(value)}" aria-describedby="${id}-msg">`;
    }
    return `
      <div class="field">
        <label for="${id}">${escapeHtml(label)}${reqMark}${reqSr}</label>
        ${control}
        ${hint ? `<span class="hint">${hint}</span>` : ""}
        <div id="${id}-msg" aria-live="polite"></div>
      </div>
    `;
  }

  function msgHtml(kind, text) {
    if (!text) return "";
    return `<div class="validation-msg ${kind}">${icon(kind)}<span>${text}</span></div>`;
  }

  // ---------------------------------------------------------------------
  // Step render functions
  // ---------------------------------------------------------------------
  function renderHeaderStep() {
    const h = state.header;
    return `
      <h1 class="step-title">WPS Header Information</h1>
      <p class="step-desc">Basic identification for this Welding Procedure Specification. This information doesn't come from D1.1 directly, but every real WPS needs it.</p>
      <fieldset>
        <legend>Document Identification</legend>
        <div class="field-row">
          ${field({ id: "org", label: "School / Company Name", required: true, value: h.org })}
          ${field({ id: "wpsNumber", label: "WPS Number", required: true, value: h.wpsNumber, hint: "e.g., WPS-FCAWS-001" })}
        </div>
        <div class="field-row">
          ${field({ id: "date", label: "Date", required: true, type: "date", value: h.date })}
          ${field({ id: "revision", label: "Revision", required: false, value: h.revision, hint: "e.g., 0, A, 1" })}
        </div>
        <div class="field-row">
          ${field({ id: "preparedBy", label: "Prepared By", required: true, value: h.preparedBy })}
        </div>
      </fieldset>
      <fieldset>
        <legend>Welding Process</legend>
        <div class="field-row">
          ${field({
            id: "process", label: "Welding Process", required: true, tag: "select",
            value: state.process,
            options: Object.keys(PROCESS_LIBRARY).map(k => ({ value: k, label: PROCESS_LIBRARY[k].label })),
          })}
        </div>
        <div class="citation">
          <strong>${escapeHtml(state.process)}</strong> &mdash; ${escapeHtml(PROCESS_LIBRARY[state.process].definition)}<br>
          <em>${escapeHtml(PROCESS_LIBRARY[state.process].citation)}</em>
        </div>
      </fieldset>
    `;
  }

  function renderBaseMetalStep() {
    const bm = state.baseMetal;
    const groupOptions = Object.keys(BASE_METAL_GROUPS).map(g => ({
      value: g, label: `Group ${g} (${BASE_METAL_GROUPS[g].strengthRange})`,
    }));
    const specOptions = bm.group && BASE_METAL_GROUPS[bm.group]
      ? BASE_METAL_GROUPS[bm.group].examples.map(e => ({ value: e.spec, label: e.spec }))
      : [];
    return `
      <h1 class="step-title">Base Metal Selection</h1>
      <p class="step-desc">D1.1 sorts approved base metals into four strength-based groups (Table 3.1). Pick the group first, then a representative steel.</p>
      <fieldset>
        <legend>Base Metal Group (Table 3.1)</legend>
        <div class="field-row">
          ${field({ id: "bmGroup", label: "Base Metal Group", required: true, tag: "select", value: bm.group, options: groupOptions })}
          ${field({ id: "bmSpec", label: "Representative Steel Specification", required: true, tag: "select", value: bm.spec, options: specOptions, hint: bm.group ? "" : "Select a group first" })}
        </div>
        <div class="field-row">
          ${field({ id: "bmThickness", label: "Thickness of Thickest Part at Point of Welding (in)", required: true, type: "number", value: bm.thicknessIn, hint: "Used for preheat lookup and electrode thickness limits" })}
        </div>
        <div class="citation">${BASE_METAL_GROUPS_CITATION}</div>
      </fieldset>
    `;
  }

  function renderFillerStep() {
    const proc = PROCESS_LIBRARY[state.process];
    const f = state.filler;
    const options = proc.designators.map(d => ({
      value: d.code,
      label: `${d.code} \u2014 ${d.polarity}${d.singlePassOnly ? ", single-pass only" : ""}`,
    }));
    return `
      <h1 class="step-title">Filler Metal Selection</h1>
      <p class="step-desc">Choose a usability designator from Annex U, Table U.4. Polarity and position capability are shown automatically \u2014 they aren't editable because they're fixed by the classification itself.</p>
      <fieldset>
        <legend>Filler Metal Specification</legend>
        <p style="font-size:13.5px;color:var(--muted);">Governing specification: <strong>${escapeHtml(proc.spec)}</strong></p>
        <div class="citation">${proc.specCitation}</div>
      </fieldset>
      <fieldset>
        <legend>Usability Designator (Annex U, Table U.4)</legend>
        <div class="field-row">
          ${field({ id: "fillerDesignator", label: "FCAW-S Usability Type", required: true, tag: "select", value: f.electrode, options })}
        </div>
        <div id="designator-detail"></div>
        <div class="citation">${proc.designatorCitation}</div>
      </fieldset>
    `;
  }

  function renderJointStep() {
    const j = state.joint;
    return `
      <h1 class="step-title">Joint, Weld Type &amp; Position</h1>
      <p class="step-desc">Describe the joint geometry and the position this WPS covers.</p>
      <fieldset>
        <legend>Joint &amp; Weld Type</legend>
        <div class="field-row">
          ${field({ id: "jointType", label: "Joint Type", required: true, tag: "select", value: j.jointType, options: JOINT_TYPES.map(t => ({ value: t, label: t })) })}
          ${field({ id: "weldType", label: "Weld Type", required: true, tag: "select", value: j.weldType, options: WELD_TYPES.map(t => ({ value: t, label: t })) })}
        </div>
        <div class="field-row">
          ${field({ id: "penetration", label: "Joint Penetration", required: true, tag: "select", value: j.penetration, options: JOINT_PENETRATION_TYPES.map(t => ({ value: t, label: t })) })}
          ${field({
            id: "position", label: "Welding Position", required: true, tag: "select", value: j.position,
            options: WELDING_POSITIONS.map(p => ({ value: p.code, label: `${p.code} \u2014 ${p.desc}` })),
          })}
        </div>
      </fieldset>
    `;
  }

  function renderPreheatStep() {
    const p = state.preheat;
    const bm = state.baseMetal;
    let suggestion = null;
    if (bm.thicknessIn) {
      const t = parseFloat(bm.thicknessIn);
      suggestion = PREHEAT_CATEGORY_B.find(row => t > row.minIn - 1e-9 ? (t <= row.maxIn) : false)
        || PREHEAT_CATEGORY_B.find(row => t <= row.minIn) || PREHEAT_CATEGORY_B[0];
      if (t <= 0.125) suggestion = PREHEAT_CATEGORY_B[0];
    }
    return `
      <h1 class="step-title">Preheat &amp; Interpass Temperature</h1>
      <p class="step-desc">D1.1 Table 3.3, Category B applies to FCAW on Group I/II base metals. The minimum below is calculated from the thickness you entered in Step 2.</p>
      <fieldset>
        <legend>Table 3.3 Minimum (Category B)</legend>
        <div id="preheatSuggestion"></div>
        <div class="field-row">
          ${field({ id: "preheatOverride", label: "Preheat Temperature Used (\u00b0F)", required: true, type: "number", value: p.overrideTempF, hint: "May be higher than the code minimum, never lower" })}
          ${field({ id: "interpassTemp", label: "Maximum Interpass Temperature (\u00b0F)", required: false, type: "number", value: p.interpassTempF })}
        </div>
        <div class="citation">${PREHEAT_CITATION}</div>
      </fieldset>
      <fieldset>
        <legend>Absolute Floor (Clause 5.4.5)</legend>
        <div class="validation-msg info">${icon("info")}<span>GMAW/FCAW's high heat input means separate preheat is often not required for thinner Group I material \u2014 but welding is prohibited outright below 32\u00b0F [0\u00b0C] base metal temperature, regardless of process.</span></div>
      </fieldset>
    `;
  }

  function renderElectricalStep() {
    const e = state.electrical;
    const proc = PROCESS_LIBRARY[state.process];
    const designator = proc.designators.find(d => d.code === state.filler.electrode);
    return `
      <h1 class="step-title">Electrical Characteristics &amp; Technique</h1>
      <p class="step-desc">Polarity is fixed by the usability designator you chose in Step 3. Amperage, voltage, and technique are the essential variables you set for this specific procedure.</p>
      <fieldset>
        <legend>Electrical Characteristics</legend>
        <div class="field-row">
          <div class="field">
            <label for="polarityDisplay">Polarity (fixed by designator)</label>
            <input type="text" id="polarityDisplay" value="${designator ? escapeHtml(designator.polarity) : 'Select a filler metal in Step 3'}" readonly aria-describedby="polarityDisplay-msg">
            <div id="polarityDisplay-msg"></div>
          </div>
        </div>
        <div class="field-row">
          ${field({ id: "amperageMin", label: "Amperage Range \u2014 Min (A)", required: true, type: "number", value: e.amperageMin })}
          ${field({ id: "amperageMax", label: "Amperage Range \u2014 Max (A)", required: true, type: "number", value: e.amperageMax })}
        </div>
        <div class="field-row">
          ${field({ id: "voltageMin", label: "Voltage Range \u2014 Min (V)", required: true, type: "number", value: e.voltageMin })}
          ${field({ id: "voltageMax", label: "Voltage Range \u2014 Max (V)", required: true, type: "number", value: e.voltageMax })}
        </div>
      </fieldset>
      <fieldset>
        <legend>Technique</legend>
        <div class="field-row">
          ${field({ id: "travelSpeed", label: "Travel Speed (in/min)", required: false, value: e.travelSpeed })}
          ${field({ id: "ctwd", label: "Contact Tip-to-Work Distance (in)", required: false, value: e.ctwd })}
        </div>
        <div class="field-row">
          ${field({ id: "cleaning", label: "Interpass Cleaning Method", required: false, value: e.cleaning, hint: "e.g., chip and wire brush" })}
        </div>
        <div class="field-row">
          ${field({ id: "technique", label: "Additional Technique Notes", required: false, tag: "textarea", value: e.technique, hint: "Weave vs. stringer, multi-pass sequence, etc." })}
        </div>
      </fieldset>
    `;
  }

  function renderReviewStep() {
    return `
      <h1 class="step-title">Review &amp; Print</h1>
      <p class="step-desc">Check the live preview on the right. When everything looks correct, use the Print / Save as PDF button to generate a document you can upload to Canvas.</p>
      <div id="reviewChecklist"></div>
      <div style="margin-top:18px;">
        <button type="button" class="btn btn-primary" id="reviewPrintBtn">Print / Save as PDF</button>
      </div>
    `;
  }

  // ---------------------------------------------------------------------
  // Field wiring: read values into state, run validation, update preview
  // ---------------------------------------------------------------------
  function wireStepInputs(stepId) {
    const content = document.getElementById("stepContent");

    function on(id, evt, handler) {
      const el = content.querySelector("#" + id);
      if (el) el.addEventListener(evt, handler);
    }

    if (stepId === "header") {
      ["org", "wpsNumber", "date", "revision", "preparedBy"].forEach(f => {
        on(f, "input", (e) => { state.header[f] = e.target.value; saveState(); updatePreview(); });
      });
      on("process", "change", (e) => {
        state.process = e.target.value;
        state.filler.electrode = "";
        saveState();
        renderStep(); // process change affects downstream options; re-render current step
      });
    }

    if (stepId === "baseMetal") {
      on("bmGroup", "change", (e) => {
        state.baseMetal.group = e.target.value;
        state.baseMetal.spec = "";
        saveState();
        renderStep();
      });
      on("bmSpec", "change", (e) => { state.baseMetal.spec = e.target.value; saveState(); updatePreview(); validateBaseMetal(); });
      on("bmThickness", "input", (e) => { state.baseMetal.thicknessIn = e.target.value; saveState(); updatePreview(); validateFillerAgainstThickness(); });
      validateBaseMetal();
    }

    if (stepId === "filler") {
      on("fillerDesignator", "change", (e) => {
        state.filler.electrode = e.target.value;
        saveState();
        renderFillerDetail();
        updatePreview();
      });
      renderFillerDetail();
    }

    if (stepId === "joint") {
      ["jointType", "weldType", "penetration", "position"].forEach(f => {
        on(f, "change", (e) => { state.joint[f] = e.target.value; saveState(); updatePreview(); });
      });
    }

    if (stepId === "preheat") {
      renderPreheatSuggestion();
      on("preheatOverride", "input", (e) => { state.preheat.overrideTempF = e.target.value; saveState(); updatePreview(); validatePreheatOverride(); });
      on("interpassTemp", "input", (e) => { state.preheat.interpassTempF = e.target.value; saveState(); updatePreview(); });
      validatePreheatOverride();
    }

    if (stepId === "electrical") {
      ["amperageMin", "amperageMax", "voltageMin", "voltageMax", "travelSpeed", "ctwd", "cleaning", "technique"].forEach(f => {
        on(f, "input", (e) => { state.electrical[f] = e.target.value; saveState(); updatePreview(); });
      });
    }

    if (stepId === "review") {
      renderChecklist();
      on("reviewPrintBtn", "click", () => window.print());
    }
  }

  // ---------------------------------------------------------------------
  // Validation logic (grounded in D1.1 data)
  // ---------------------------------------------------------------------
  function setMsg(id, kind, text) {
    const el = document.getElementById(id + "-msg");
    if (el) el.innerHTML = msgHtml(kind, text);
  }

  function validateBaseMetal() {
    const bm = state.baseMetal;
    if (!bm.group) return;
    const grp = BASE_METAL_GROUPS[bm.group];
    if (!grp.fcawSAllowed) {
      setMsg("bmGroup", "error", `Table 3.2 provides no self-shielded carbon steel FCAW (A5.20) option for Group ${bm.group}. Low-alloy FCAW (A5.29) would be required instead \u2014 this builder currently supports FCAW-S only.`);
    } else {
      setMsg("bmGroup", "success", `Group ${bm.group} accepts self-shielded FCAW-S filler metal per Table 3.2.`);
    }
    validateFillerAgainstThickness();
  }

  function renderFillerDetail() {
    const proc = PROCESS_LIBRARY[state.process];
    const d = proc.designators.find(x => x.code === state.filler.electrode);
    const box = document.getElementById("designator-detail");
    if (!box) return;
    if (!d) { box.innerHTML = ""; return; }
    const excluded = proc.excludedDesignators.includes(d.code);
    const classification = classificationForDesignator(proc, d.code);
    let msg = "";
    if (excluded) {
      msg = msgHtml("error", `${d.code} is excluded from Table 3.2's prequalified list \u2014 it is not approved for multi-pass D1.1 structural work under a prequalified WPS. ${proc.excludedSuffixNote}`);
    } else if (d.code === "T11") {
      msg = msgHtml("warn", proc.t11ThicknessNote);
    } else if (classification) {
      msg = msgHtml("success", `${d.code} (${classification}) is prequalified for Group I and Group II base metals per Table 3.2.`);
    } else {
      msg = msgHtml("info", `${d.code} is not part of Table 3.2's prequalified electrode list.`);
    }
    box.innerHTML = `
      <div class="citation" style="margin-top:0;">
        <strong>${d.code}${classification ? ` &mdash; ${classification}` : ""}</strong><br>
        ${escapeHtml(d.desc)}<br>
        Positions: ${d.positions.join(", ")} &middot; Polarity: <strong>${d.polarity}</strong>
        ${d.singlePassOnly ? "<br><em>Single-pass only (\u201cS\u201d suffix).</em>" : ""}
      </div>
      ${msg}
    `;
    validateFillerAgainstThickness();
  }

  function validateFillerAgainstThickness() {
    const proc = PROCESS_LIBRARY[state.process];
    const d = proc.designators.find(x => x.code === state.filler.electrode);
    const t = parseFloat(state.baseMetal.thicknessIn);
    if (!d || isNaN(t)) return;
    if (d.prequalifiedThicknessLimitIn && t > d.prequalifiedThicknessLimitIn) {
      const box = document.getElementById("designator-detail");
      if (box) {
        box.innerHTML += msgHtml("error", `Entered thickness (${t}") exceeds ${d.code}'s ${d.prequalifiedThicknessLimitIn}" prequalification limit per Table 3.2 \u2014 this designator would be excluded from a prequalified WPS at this thickness.`);
      }
    }
  }

  function renderPreheatSuggestion() {
    const box = document.getElementById("preheatSuggestion");
    if (!box) return;
    const t = parseFloat(state.baseMetal.thicknessIn);
    if (isNaN(t) || !state.baseMetal.thicknessIn) {
      box.innerHTML = msgHtml("info", "Enter a thickness in Step 2 to see the calculated Table 3.3 minimum.");
      return;
    }
    let row = PREHEAT_CATEGORY_B.find(r => t > r.minIn - 1e-9 && t <= r.maxIn);
    if (!row) row = PREHEAT_CATEGORY_B[0];
    box.innerHTML = msgHtml("info", `For ${t}\" thick material (${row.label}): minimum preheat/interpass = <strong>${row.tempF}\u00b0F [${row.tempC}\u00b0C]</strong>.`);
  }

  function validatePreheatOverride() {
    const t = parseFloat(state.baseMetal.thicknessIn);
    const override = parseFloat(state.preheat.overrideTempF);
    if (isNaN(t) || isNaN(override)) return;
    let row = PREHEAT_CATEGORY_B.find(r => t > r.minIn - 1e-9 && t <= r.maxIn) || PREHEAT_CATEGORY_B[0];
    if (override < row.tempF) {
      setMsg("preheatOverride", "error", `This is below the Table 3.3 Category B minimum of ${row.tempF}\u00b0F for this thickness.`);
    } else if (override < PREHEAT_FLOOR_F) {
      setMsg("preheatOverride", "error", `This is below the absolute 32\u00b0F floor set by Clause 5.4.5.`);
    } else {
      setMsg("preheatOverride", "success", `Meets or exceeds the ${row.tempF}\u00b0F Table 3.3 minimum for this thickness.`);
    }
  }

  function renderChecklist() {
    const box = document.getElementById("reviewChecklist");
    if (!box) return;
    const checks = [
      { label: "WPS header information complete", ok: !!(state.header.org && state.header.wpsNumber && state.header.date && state.header.preparedBy) },
      { label: "Base metal group and spec selected", ok: !!(state.baseMetal.group && state.baseMetal.spec && state.baseMetal.thicknessIn) },
      { label: "Filler metal designator selected", ok: !!state.filler.electrode },
      { label: "Joint, weld type, and position selected", ok: !!(state.joint.jointType && state.joint.weldType && state.joint.penetration && state.joint.position) },
      { label: "Preheat temperature entered and meets code minimum", ok: !!state.preheat.overrideTempF },
      { label: "Amperage and voltage ranges entered", ok: !!(state.electrical.amperageMin && state.electrical.amperageMax && state.electrical.voltageMin && state.electrical.voltageMax) },
    ];
    box.innerHTML = checks.map(c => msgHtml(c.ok ? "success" : "warn", c.label)).join("");
  }

  // ---------------------------------------------------------------------
  // Live WPS preview (the document mirror)
  // ---------------------------------------------------------------------
  function updatePreview() {
    const proc = PROCESS_LIBRARY[state.process];
    const d = proc.designators.find(x => x.code === state.filler.electrode);
    const bm = state.baseMetal;
    const j = state.joint;
    const e = state.electrical;
    const p = state.preheat;

    const allComplete = !!(state.header.org && state.header.wpsNumber && state.header.date &&
      bm.group && bm.spec && bm.thicknessIn && state.filler.electrode &&
      j.jointType && j.weldType && j.penetration && j.position &&
      p.overrideTempF && e.amperageMin && e.amperageMax && e.voltageMin && e.voltageMax);

    const row = (label, value, isCode) => `<tr><th scope="row">${label}</th><td class="${isCode ? 'code' : ''} ${value ? '' : 'empty'}">${value ? escapeHtml(value) : 'Not yet specified'}</td></tr>`;

    const html = `
      <span class="watermark ${allComplete ? 'complete' : 'draft'}">${allComplete ? 'COMPLETE' : 'DRAFT'}</span>
      <h3>Welding Procedure Specification</h3>
      <div class="doc-sub">${escapeHtml(state.header.org || 'Organization not entered')} &middot; WPS ${escapeHtml(state.header.wpsNumber || '\u2014')}</div>

      <div class="wps-section-label">Identification</div>
      <table class="wps-table">
        ${row("Date", state.header.date)}
        ${row("Revision", state.header.revision)}
        ${row("Prepared By", state.header.preparedBy)}
        ${row("Welding Process", state.process, true)}
      </table>

      <div class="wps-section-label">Base Metal (Table 3.1)</div>
      <table class="wps-table">
        ${row("Group", bm.group ? `Group ${bm.group}` : "")}
        ${row("Specification", bm.spec)}
        ${row("Thickness", bm.thicknessIn ? bm.thicknessIn + '"' : "")}
      </table>

      <div class="wps-section-label">Filler Metal (${escapeHtml(proc.spec)})</div>
      <table class="wps-table">
        ${row("AWS Classification", d ? (classificationForDesignator(proc, d.code) || d.code) : "", true)}
        ${row("Usability Designator", d ? d.code : "", true)}
        ${row("Polarity", d ? d.polarity : "")}
        ${row("Positions Qualified", d ? d.positions.join(", ") : "")}
      </table>

      <div class="wps-section-label">Joint Design</div>
      <table class="wps-table">
        ${row("Joint Type", j.jointType)}
        ${row("Weld Type", j.weldType)}
        ${row("Joint Penetration", j.penetration)}
        ${row("Welding Position", j.position, true)}
      </table>

      <div class="wps-section-label">Preheat &amp; Interpass (Table 3.3)</div>
      <table class="wps-table">
        ${row("Preheat Temperature", p.overrideTempF ? p.overrideTempF + "\u00b0F" : "")}
        ${row("Max Interpass Temperature", p.interpassTempF ? p.interpassTempF + "\u00b0F" : "")}
      </table>

      <div class="wps-section-label">Electrical Characteristics</div>
      <table class="wps-table">
        ${row("Polarity", d ? d.polarity : "")}
        ${row("Amperage Range", (e.amperageMin && e.amperageMax) ? `${e.amperageMin}\u2013${e.amperageMax} A` : "")}
        ${row("Voltage Range", (e.voltageMin && e.voltageMax) ? `${e.voltageMin}\u2013${e.voltageMax} V` : "")}
        ${row("Travel Speed", e.travelSpeed ? e.travelSpeed + " in/min" : "")}
        ${row("CTWD", e.ctwd ? e.ctwd + '"' : "")}
        ${row("Interpass Cleaning", e.cleaning)}
      </table>

      ${e.technique ? `<div class="wps-section-label">Technique Notes</div><p style="font-size:11.5px;">${escapeHtml(e.technique)}</p>` : ""}

      <p style="font-size:10px;color:var(--muted);margin-top:14px;border-top:1px solid var(--border);padding-top:8px;">
        Generated with the WELD 265 WPS Builder, citing AWS D1.1/D1.1M:2015. Verify against the official code and project WPS before real-world use.
      </p>
    `;
    document.getElementById("wpsDoc").innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Stepper rendering + navigation
  // ---------------------------------------------------------------------
  function renderStepperNav() {
    const list = document.getElementById("stepperList");
    list.innerHTML = STEPS.map((s, i) => `
      <li>
        <button type="button" class="step-btn ${i < currentStep ? 'step-done' : ''}" data-step="${i}"
          aria-current="${i === currentStep ? 'step' : 'false'}">
          <span class="step-num">${i + 1}</span>
          <span>${escapeHtml(s.title)}</span>
        </button>
      </li>
    `).join("");
    list.querySelectorAll(".step-btn").forEach(btn => {
      btn.addEventListener("click", () => goToStep(parseInt(btn.dataset.step, 10)));
    });
  }

  function renderStep() {
    const step = STEPS[currentStep];
    document.getElementById("stepContent").innerHTML = step.render();
    wireStepInputs(step.id);
    updatePreview();
    renderStepperNav();
    document.getElementById("prevBtn").disabled = currentStep === 0;
    const nextBtn = document.getElementById("nextBtn");
    if (currentStep === STEPS.length - 1) {
      nextBtn.textContent = "Done";
      nextBtn.disabled = true;
    } else {
      nextBtn.textContent = "Next \u2192";
      nextBtn.disabled = false;
    }
    document.getElementById("stepPosition").textContent = `Step ${currentStep + 1} of ${STEPS.length}: ${step.title}`;
    document.getElementById("main-content").focus();
  }

  function goToStep(idx) {
    if (idx < 0 || idx >= STEPS.length) return;
    currentStep = idx;
    renderStep();
  }

  // ---------------------------------------------------------------------
  // Global navigation buttons
  // ---------------------------------------------------------------------
  document.getElementById("prevBtn").addEventListener("click", () => goToStep(currentStep - 1));
  document.getElementById("nextBtn").addEventListener("click", () => goToStep(currentStep + 1));
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (window.confirm("Start over? This clears all entered WPS data on this device.")) {
      state = JSON.parse(JSON.stringify(defaultState));
      saveState();
      currentStep = 0;
      renderStep();
    }
  });

  // ---------------------------------------------------------------------
  // Keyboard shortcuts modal
  // ---------------------------------------------------------------------
  const modal = document.getElementById("shortcutsModal");
  const shortcutsBtn = document.getElementById("shortcutsBtn");
  let lastFocusBeforeModal = null;

  function openModal() {
    lastFocusBeforeModal = document.activeElement;
    modal.hidden = false;
    document.getElementById("shortcutsCloseBtn").focus();
    document.addEventListener("keydown", modalKeydownTrap);
  }
  function closeModal() {
    modal.hidden = true;
    document.removeEventListener("keydown", modalKeydownTrap);
    if (lastFocusBeforeModal) lastFocusBeforeModal.focus();
  }
  function modalKeydownTrap(e) {
    if (e.key === "Escape") { closeModal(); return; }
    if (e.key === "Tab") {
      const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  shortcutsBtn.addEventListener("click", openModal);
  document.getElementById("shortcutsCloseBtn").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  // ---------------------------------------------------------------------
  // Global keyboard shortcuts (all require Alt to avoid clashing with
  // assistive technology single-key navigation, per WCAG 2.1.4)
  // ---------------------------------------------------------------------
  document.addEventListener("keydown", (e) => {
    if (!e.altKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); goToStep(currentStep + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goToStep(currentStep - 1); }
    else if (e.key.toLowerCase() === "p") { e.preventDefault(); goToStep(STEPS.length - 1); }
    else if (e.key.toLowerCase() === "k") { e.preventDefault(); openModal(); }
  });

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  renderStep();
})();
