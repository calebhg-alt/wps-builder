/* ============================================================================
   WPS & WQTR Builder — Application Logic
   Vanilla JS, no framework, no build step. Fully keyboard operable; see the
   in-app Keyboard Shortcuts panel (Alt+K).
   ============================================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "wps-wqtr-builder-v2";

  function newId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function makeNewWps() {
    return {
      id: newId("wps"),
      createdAt: new Date().toISOString(),
      process: "FCAW-S",
      header: { org: "", wpsNumber: "", date: "", revision: "", preparedBy: "" },
      baseMetal: { group: "", spec: "", thicknessIn: "" },
      filler: { electrode: "" },
      shieldingGas: { type: "", flowRate: "" },
      joint: { jointType: "", weldType: "", penetration: "", position: "" },
      preheat: { overrideTempF: "", interpassTempF: "" },
      electrical: {
        amperageMin: "", amperageMax: "",
        voltageMin: "", voltageMax: "",
        travelSpeed: "", ctwd: "",
        technique: "", cleaning: "",
      },
    };
  }

  function makeNewWqtr() {
    return {
      id: newId("wqtr"),
      createdAt: new Date().toISOString(),
      linkedWpsId: "",
      testId: { name: "", idNumber: "", stampNo: "", company: "", division: "", testDate: "", recordNo: "", stdTestNo: "" },
      variables: { actualThicknessIn: "", rangeQualifiedMinIn: "", rangeQualifiedMaxIn: "", weldJointType: "", progression: "", backing: "", electrodeCount: "Single" },
      testResults: [{ type: "", acceptanceCriteria: "", result: "", remarks: "" }],
      certification: { testConductedBy: "", laboratory: "", testNumber: "", fileNumber: "", manufacturerContractor: "", authorizedBy: "", certDate: "" },
    };
  }

  let appState = loadAppState();
  let appMode = "docs";
  let activeWpsId = null;
  let activeWqtrId = null;
  let wpsStep = 0;
  let wqtrStep = 0;

  function loadAppState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { wpsList: parsed.wpsList || [], wqtrList: parsed.wqtrList || [] };
      }
    } catch (e) { /* ignore corrupt storage */ }
    return { wpsList: [], wqtrList: [] };
  }
  function saveAppState() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState)); }
    catch (e) { /* storage unavailable; app still works this session */ }
  }
  function getActiveWps() { return appState.wpsList.find(w => w.id === activeWpsId) || null; }
  function getActiveWqtr() { return appState.wqtrList.find(w => w.id === activeWqtrId) || null; }
  function getWpsById(id) { return appState.wpsList.find(w => w.id === id) || null; }

  function icon(name) {
    const common = 'width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
    switch (name) {
      case "info": return `<svg ${common}><circle cx="12" cy="12" r="10" fill="#5B7A9E"/><rect x="11" y="10" width="2" height="7" fill="#fff"/><rect x="11" y="6.5" width="2" height="2" fill="#fff"/></svg>`;
      case "success": return `<svg ${common}><circle cx="12" cy="12" r="10" fill="#1F5C38"/><path d="M7 12.5l3 3 7-7" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      case "warn": return `<svg ${common}><path d="M12 2 L23 21 L1 21 Z" fill="#8A6D1D"/><rect x="11" y="9" width="2" height="6" fill="#fff"/><rect x="11" y="16.5" width="2" height="2" fill="#fff"/></svg>`;
      case "error": return `<svg ${common}><circle cx="12" cy="12" r="10" fill="#8f1515"/><line x1="8" y1="8" x2="16" y2="16" stroke="#fff" stroke-width="2.2"/><line x1="16" y1="8" x2="8" y2="16" stroke="#fff" stroke-width="2.2"/></svg>`;
      default: return "";
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
  function msgHtml(kind, text) {
    if (!text) return "";
    return `<div class="validation-msg ${kind}">${icon(kind)}<span>${text}</span></div>`;
  }

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
  function setMsg(id, kind, text) {
    const el = document.getElementById(id + "-msg");
    if (el) el.innerHTML = msgHtml(kind, text);
  }

  // =======================================================================
  // MODE: DOCS
  // =======================================================================
  function renderDocsScreen() {
    document.getElementById("stepperNav").style.display = "none";
    document.getElementById("stepFooter").style.display = "none";
    document.getElementById("previewPane").style.display = "none";
    document.getElementById("main-content").style.gridColumn = "1 / -1";

    const wpsRows = appState.wpsList.map(w => {
      const proc = PROCESS_LIBRARY[w.process];
      return `
        <tr>
          <td>${escapeHtml(w.header.wpsNumber || "(untitled)")}</td>
          <td>${escapeHtml(proc ? proc.label.split(" — ")[0] : w.process)}</td>
          <td>${escapeHtml(w.baseMetal.group ? "Group " + w.baseMetal.group : "\u2014")}</td>
          <td>${escapeHtml(w.joint.position || "\u2014")}</td>
          <td class="doc-actions">
            <button type="button" class="btn btn-secondary" data-action="edit-wps" data-id="${w.id}">Edit</button>
            <button type="button" class="btn btn-secondary" data-action="duplicate-wps" data-id="${w.id}">Duplicate</button>
            <button type="button" class="btn btn-ghost" style="color:#8f1515;border-color:#8f1515;" data-action="delete-wps" data-id="${w.id}">Delete</button>
          </td>
        </tr>
      `;
    }).join("");

    const wqtrRows = appState.wqtrList.map(q => {
      const linkedWps = getWpsById(q.linkedWpsId);
      return `
        <tr>
          <td>${escapeHtml(q.testId.recordNo || "(untitled)")}</td>
          <td>${escapeHtml(q.testId.name || "\u2014")}</td>
          <td>${linkedWps ? escapeHtml(linkedWps.header.wpsNumber || linkedWps.process) : '<em style="color:#8f1515;">WPS deleted</em>'}</td>
          <td class="doc-actions">
            <button type="button" class="btn btn-secondary" data-action="edit-wqtr" data-id="${q.id}">Edit</button>
            <button type="button" class="btn btn-ghost" style="color:#8f1515;border-color:#8f1515;" data-action="delete-wqtr" data-id="${q.id}">Delete</button>
          </td>
        </tr>
      `;
    }).join("");

    document.getElementById("stepContent").innerHTML = `
      <h1 class="step-title">My Documents</h1>
      <p class="step-desc">Create and manage Welding Procedure Specifications (WPS) and Welder Qualification Test Records (WQTR). A WQTR is built from an existing WPS, so create the WPS first.</p>

      <div class="doc-list-toolbar">
        <h2 style="font-family:var(--serif);color:var(--navy);font-size:16px;margin:0;">Welding Procedure Specifications (WPS)</h2>
        <button type="button" class="btn btn-primary" id="newWpsBtn">+ New WPS</button>
      </div>
      ${appState.wpsList.length ? `
        <table class="doc-list">
          <thead><tr><th scope="col">WPS Number</th><th scope="col">Process</th><th scope="col">Base Metal Group</th><th scope="col">Position</th><th scope="col">Actions</th></tr></thead>
          <tbody>${wpsRows}</tbody>
        </table>
      ` : `<div class="empty-state">No WPS documents yet. Click &ldquo;+ New WPS&rdquo; to start one.</div>`}

      <div class="doc-list-toolbar" style="margin-top:32px;">
        <h2 style="font-family:var(--serif);color:var(--navy);font-size:16px;margin:0;">Welder Qualification Test Records (WQTR)</h2>
        <button type="button" class="btn btn-primary" id="newWqtrBtn" ${appState.wpsList.length ? "" : "disabled"}>+ New WQTR</button>
      </div>
      ${appState.wqtrList.length ? `
        <table class="doc-list">
          <thead><tr><th scope="col">Record No.</th><th scope="col">Welder Name</th><th scope="col">Based On (WPS)</th><th scope="col">Actions</th></tr></thead>
          <tbody>${wqtrRows}</tbody>
        </table>
      ` : `<div class="empty-state">${appState.wpsList.length ? 'No WQTR records yet. Click "+ New WQTR" to start one.' : "Create a WPS first \u2014 a WQTR is built from one."}</div>`}
    `;

    document.getElementById("newWpsBtn").addEventListener("click", () => {
      const wps = makeNewWps();
      appState.wpsList.push(wps);
      saveAppState();
      activeWpsId = wps.id;
      wpsStep = 0;
      switchMode("wps");
    });
    document.getElementById("newWqtrBtn").addEventListener("click", () => {
      const wqtr = makeNewWqtr();
      appState.wqtrList.push(wqtr);
      saveAppState();
      activeWqtrId = wqtr.id;
      wqtrStep = 0;
      switchMode("wqtr");
    });
    document.getElementById("stepContent").querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === "edit-wps") { activeWpsId = id; wpsStep = 0; switchMode("wps"); }
        else if (action === "duplicate-wps") {
          const src = getWpsById(id);
          const copy = JSON.parse(JSON.stringify(src));
          copy.id = newId("wps");
          copy.header.wpsNumber = (src.header.wpsNumber || "WPS") + " (copy)";
          copy.createdAt = new Date().toISOString();
          appState.wpsList.push(copy);
          saveAppState();
          renderDocsScreen();
        } else if (action === "delete-wps") {
          if (window.confirm("Delete this WPS? Any WQTR built from it will remain but lose its link.")) {
            appState.wpsList = appState.wpsList.filter(w => w.id !== id);
            saveAppState();
            renderDocsScreen();
          }
        } else if (action === "edit-wqtr") { activeWqtrId = id; wqtrStep = 0; switchMode("wqtr"); }
        else if (action === "delete-wqtr") {
          if (window.confirm("Delete this WQTR?")) {
            appState.wqtrList = appState.wqtrList.filter(q => q.id !== id);
            saveAppState();
            renderDocsScreen();
          }
        }
      });
    });

    document.getElementById("wpsDoc").innerHTML = "";
  }

  // =======================================================================
  // MODE: WPS BUILDER
  // =======================================================================
  const WPS_STEPS = [
    { id: "header", title: "WPS Header Information", render: renderWpsHeaderStep },
    { id: "baseMetal", title: "Base Metal Selection", render: renderWpsBaseMetalStep },
    { id: "filler", title: "Filler Metal Selection", render: renderWpsFillerStep },
    { id: "joint", title: "Joint, Weld Type & Position", render: renderWpsJointStep },
    { id: "preheat", title: "Preheat & Interpass Temperature", render: renderWpsPreheatStep },
    { id: "electrical", title: "Electrical Characteristics & Technique", render: renderWpsElectricalStep },
    { id: "review", title: "Review & Print", render: renderWpsReviewStep },
  ];

  function renderWpsHeaderStep() {
    const wps = getActiveWps();
    const h = wps.header;
    return `
      <h1 class="step-title">WPS Header Information</h1>
      <p class="step-desc">Basic identification for this Welding Procedure Specification.</p>
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
            value: wps.process,
            options: Object.keys(PROCESS_LIBRARY).map(k => ({ value: k, label: PROCESS_LIBRARY[k].label })),
          })}
        </div>
        <div class="citation">
          <strong>${escapeHtml(wps.process)}</strong> &mdash; ${escapeHtml(PROCESS_LIBRARY[wps.process].definition)}<br>
          <em>${escapeHtml(PROCESS_LIBRARY[wps.process].citation)}</em>
        </div>
      </fieldset>
    `;
  }

  function renderWpsBaseMetalStep() {
    const wps = getActiveWps();
    const bm = wps.baseMetal;
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

  function renderWpsFillerStep() {
    const wps = getActiveWps();
    const proc = PROCESS_LIBRARY[wps.process];
    const f = wps.filler;
    const options = proc.designators.map(d => ({
      value: d.code,
      label: wps.process === "SMAW" ? `${d.code} \u2014 ${d.polarity}` : `${d.code} \u2014 ${d.polarity}${d.singlePassOnly ? ", single-pass only" : ""}`,
    }));
    const gasBlock = proc.requiresShieldingGas ? `
      <fieldset>
        <legend>Shielding Gas</legend>
        <div class="field-row">
          ${field({ id: "shieldingGasType", label: "Shielding Gas Composition", required: true, tag: "select", value: wps.shieldingGas.type, options: proc.shieldingGasOptions.map(g => ({ value: g, label: g })) })}
          ${field({ id: "shieldingGasFlow", label: "Flow Rate (CFH)", required: true, type: "number", value: wps.shieldingGas.flowRate })}
        </div>
      </fieldset>
    ` : "";
    return `
      <h1 class="step-title">Filler Metal Selection</h1>
      <p class="step-desc">Choose a usability designator. Polarity and position capability are shown automatically \u2014 they're fixed by the classification itself, not editable.</p>
      <fieldset>
        <legend>Filler Metal Specification</legend>
        <p style="font-size:13.5px;color:var(--muted);">Governing specification: <strong>${escapeHtml(proc.spec)}</strong></p>
        <div class="citation">${proc.specCitation}</div>
      </fieldset>
      <fieldset>
        <legend>Usability Designator${wps.process === "SMAW" ? "" : " (Annex U, Table U.4)"}</legend>
        <div class="field-row">
          ${field({ id: "fillerDesignator", label: `${wps.process} Electrode Classification`, required: true, tag: "select", value: f.electrode, options })}
        </div>
        <div id="designator-detail"></div>
        <div class="citation">${proc.designatorCitation || proc.tableCitation}</div>
      </fieldset>
      ${gasBlock}
    `;
  }

  function renderWpsJointStep() {
    const wps = getActiveWps();
    const j = wps.joint;
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

  function renderWpsPreheatStep() {
    const wps = getActiveWps();
    const p = wps.preheat;
    const cat = getPreheatCategory(wps.process, wps.filler.electrode);
    return `
      <h1 class="step-title">Preheat &amp; Interpass Temperature</h1>
      <p class="step-desc">D1.1 Table 3.3, Category ${cat.name} applies to this process/electrode combination. The minimum below is calculated from the thickness you entered in Step 2.</p>
      <fieldset>
        <legend>Table 3.3 Minimum (Category ${cat.name})</legend>
        <div id="preheatSuggestion"></div>
        <div class="field-row">
          ${field({ id: "preheatOverride", label: "Preheat Temperature Used (\u00b0F)", required: true, type: "number", value: p.overrideTempF, hint: "May be higher than the code minimum, never lower" })}
          ${field({ id: "interpassTemp", label: "Maximum Interpass Temperature (\u00b0F)", required: false, type: "number", value: p.interpassTempF })}
        </div>
        <div class="citation">${cat.citation}</div>
      </fieldset>
      ${wps.process !== "SMAW" ? `
      <fieldset>
        <legend>Absolute Floor (Clause 5.4.5)</legend>
        <div class="validation-msg info">${icon("info")}<span>GMAW/FCAW's high heat input means separate preheat is often not required for thinner Group I material \u2014 but welding is prohibited outright below 32\u00b0F [0\u00b0C] base metal temperature, regardless of process.</span></div>
      </fieldset>` : ""}
    `;
  }

  function renderWpsElectricalStep() {
    const wps = getActiveWps();
    const e = wps.electrical;
    const proc = PROCESS_LIBRARY[wps.process];
    const designator = proc.designators.find(d => d.code === wps.filler.electrode);
    return `
      <h1 class="step-title">Electrical Characteristics &amp; Technique</h1>
      <p class="step-desc">Polarity is fixed by the classification you chose in Step 3 \u2014 Table 3.7 treats any polarity change as requiring a new WPS. Amperage, voltage, and travel speed come from the manufacturer's data sheet or your own qualification test; D1.1's Table 3.7 only governs how far you may later deviate from them (amperage &plusmn;10%, voltage &plusmn;15%, travel speed &plusmn;25%) before a new WPS is required.</p>
      <fieldset>
        <legend>Electrical Characteristics</legend>
        <div class="field-row">
          <div class="field">
            <label for="polarityDisplay">Polarity (fixed by classification)</label>
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
        <div class="citation">AWS D1.1/D1.1M:2015, Clause 3, Table 3.7 (Prequalified WPS Variables): amperage &plusmn;10%, voltage &plusmn;15%, travel speed &plusmn;25% \u2014 exceed these and the WPS needs revision. Polarity change of any kind is an essential variable for all processes.</div>
      </fieldset>
      <fieldset>
        <legend>Technique</legend>
        <div class="field-row">
          ${field({ id: "travelSpeed", label: "Travel Speed (in/min)", required: false, value: e.travelSpeed })}
          ${field({ id: "ctwd", label: wps.process === "SMAW" ? "Arc Length / Electrode Angle Notes" : "Contact Tip-to-Work Distance (in)", required: false, value: e.ctwd })}
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

  function renderWpsReviewStep() {
    return `
      <h1 class="step-title">Review &amp; Print</h1>
      <p class="step-desc">Check the live preview on the right. When everything looks correct, use the Print / Save as PDF button to generate a document you can upload to Canvas.</p>
      <div id="reviewChecklist"></div>
      <div style="margin-top:18px;">
        <button type="button" class="btn btn-primary" id="reviewPrintBtn">Print / Save as PDF</button>
      </div>
    `;
  }

  function wireWpsStepInputs(stepId) {
    const wps = getActiveWps();
    const content = document.getElementById("stepContent");
    function on(id, evt, handler) {
      const el = content.querySelector("#" + id);
      if (el) el.addEventListener(evt, handler);
    }

    if (stepId === "header") {
      ["org", "wpsNumber", "date", "revision", "preparedBy"].forEach(f => {
        on(f, "input", (e) => { wps.header[f] = e.target.value; saveAppState(); updateWpsPreview(); });
      });
      on("process", "change", (e) => {
        wps.process = e.target.value;
        wps.filler.electrode = "";
        wps.baseMetal.group = ""; wps.baseMetal.spec = "";
        saveAppState();
        renderWpsStep();
      });
    }
    if (stepId === "baseMetal") {
      on("bmGroup", "change", (e) => { wps.baseMetal.group = e.target.value; wps.baseMetal.spec = ""; saveAppState(); renderWpsStep(); });
      on("bmSpec", "change", (e) => { wps.baseMetal.spec = e.target.value; saveAppState(); updateWpsPreview(); validateWpsBaseMetal(); });
      on("bmThickness", "input", (e) => { wps.baseMetal.thicknessIn = e.target.value; saveAppState(); updateWpsPreview(); validateWpsFillerAgainstThickness(); });
      validateWpsBaseMetal();
    }
    if (stepId === "filler") {
      on("fillerDesignator", "change", (e) => { wps.filler.electrode = e.target.value; saveAppState(); renderWpsFillerDetail(); updateWpsPreview(); });
      on("shieldingGasType", "change", (e) => { wps.shieldingGas.type = e.target.value; saveAppState(); updateWpsPreview(); });
      on("shieldingGasFlow", "input", (e) => { wps.shieldingGas.flowRate = e.target.value; saveAppState(); updateWpsPreview(); });
      renderWpsFillerDetail();
    }
    if (stepId === "joint") {
      ["jointType", "weldType", "penetration", "position"].forEach(f => {
        on(f, "change", (e) => { wps.joint[f] = e.target.value; saveAppState(); updateWpsPreview(); });
      });
    }
    if (stepId === "preheat") {
      renderWpsPreheatSuggestion();
      on("preheatOverride", "input", (e) => { wps.preheat.overrideTempF = e.target.value; saveAppState(); updateWpsPreview(); validateWpsPreheatOverride(); });
      on("interpassTemp", "input", (e) => { wps.preheat.interpassTempF = e.target.value; saveAppState(); updateWpsPreview(); });
      validateWpsPreheatOverride();
    }
    if (stepId === "electrical") {
      ["amperageMin", "amperageMax", "voltageMin", "voltageMax", "travelSpeed", "ctwd", "cleaning", "technique"].forEach(f => {
        on(f, "input", (e) => { wps.electrical[f] = e.target.value; saveAppState(); updateWpsPreview(); });
      });
    }
    if (stepId === "review") {
      renderWpsChecklist();
      on("reviewPrintBtn", "click", () => window.print());
    }
  }

  function validateWpsBaseMetal() {
    const wps = getActiveWps();
    const bm = wps.baseMetal;
    if (!bm.group) return;
    const proc = PROCESS_LIBRARY[wps.process];
    const allowed = proc.prequalifiedGroups.includes(bm.group);
    if (!allowed) {
      const altNote = proc.groupRequirements && proc.groupRequirements[bm.group] ? ` ${proc.groupRequirements[bm.group]}` : "";
      setMsg("bmGroup", "error", `Table 3.2 provides no prequalified ${wps.process} option for Group ${bm.group}.${altNote}`);
    } else {
      const note = proc.groupRequirements && proc.groupRequirements[bm.group] ? ` ${proc.groupRequirements[bm.group]}` : "";
      setMsg("bmGroup", "success", `Group ${bm.group} accepts ${wps.process} filler metal per Table 3.2.${note}`);
    }
    validateWpsFillerAgainstThickness();
  }

  function renderWpsFillerDetail() {
    const wps = getActiveWps();
    const proc = PROCESS_LIBRARY[wps.process];
    const d = proc.designators.find(x => x.code === wps.filler.electrode);
    const box = document.getElementById("designator-detail");
    if (!box) return;
    if (!d) { box.innerHTML = ""; return; }
    const excluded = (proc.excludedDesignators || []).includes(d.code);
    const classification = classificationForDesignator(proc, d.code);
    let msg = "";
    if (excluded) {
      msg = msgHtml("error", `${d.code} is excluded from Table 3.2's prequalified list \u2014 not approved for multi-pass D1.1 structural work under a prequalified WPS. ${proc.excludedSuffixNote || ""}`);
    } else if (d.code === "T11" && proc.t11ThicknessNote) {
      msg = msgHtml("warn", proc.t11ThicknessNote);
    } else if (wps.process === "SMAW" && d.lowHydrogen === false) {
      msg = msgHtml("warn", `${d.code} is not low-hydrogen \u2014 Table 3.3 Category A applies (higher preheat than low-hydrogen electrodes at the same thickness), and the Clause 5.3.2.1 oven/hermetic storage rule does NOT apply to this electrode.`);
    } else if (wps.process === "SMAW" && d.lowHydrogen === true) {
      msg = msgHtml("success", `${d.code} is low-hydrogen \u2014 Table 3.3 Category B applies, and Clause 5.3.2.1's hermetic-container/oven-baking storage requirement DOES apply to this electrode.`);
    } else if (classification) {
      msg = msgHtml("success", `${d.code}${classification !== d.code ? ` (${classification})` : ""} is prequalified per Table 3.2.`);
    } else {
      msg = msgHtml("info", `${d.code} is not part of Table 3.2's prequalified electrode list.`);
    }
    box.innerHTML = `
      <div class="citation" style="margin-top:0;">
        <strong>${d.code}${classification && classification !== d.code ? ` &mdash; ${classification}` : ""}</strong><br>
        ${escapeHtml(d.desc)}<br>
        Positions: ${d.positions.join(", ")} &middot; Polarity: <strong>${d.polarity}</strong>
        ${d.singlePassOnly ? "<br><em>Single-pass only (\u201cS\u201d suffix).</em>" : ""}
      </div>
      ${msg}
    `;
    validateWpsFillerAgainstThickness();
  }

  function validateWpsFillerAgainstThickness() {
    const wps = getActiveWps();
    const proc = PROCESS_LIBRARY[wps.process];
    const d = proc.designators.find(x => x.code === wps.filler.electrode);
    const t = parseFloat(wps.baseMetal.thicknessIn);
    if (!d || isNaN(t)) return;
    if (d.prequalifiedThicknessLimitIn && t > d.prequalifiedThicknessLimitIn) {
      const box = document.getElementById("designator-detail");
      if (box) box.innerHTML += msgHtml("error", `Entered thickness (${t}") exceeds ${d.code}'s ${d.prequalifiedThicknessLimitIn}" prequalification limit per Table 3.2 \u2014 excluded from a prequalified WPS at this thickness.`);
    }
  }

  function renderWpsPreheatSuggestion() {
    const wps = getActiveWps();
    const box = document.getElementById("preheatSuggestion");
    if (!box) return;
    const t = parseFloat(wps.baseMetal.thicknessIn);
    if (isNaN(t) || !wps.baseMetal.thicknessIn) {
      box.innerHTML = msgHtml("info", "Enter a thickness in Step 2 to see the calculated Table 3.3 minimum.");
      return;
    }
    const cat = getPreheatCategory(wps.process, wps.filler.electrode);
    let row = cat.rows.find(r => t > r.minIn - 1e-9 && t <= r.maxIn) || cat.rows[0];
    box.innerHTML = msgHtml("info", `For ${t}" thick material (${row.label}), Category ${cat.name}: minimum preheat/interpass = <strong>${row.tempF}\u00b0F [${row.tempC}\u00b0C]</strong>.`);
  }

  function validateWpsPreheatOverride() {
    const wps = getActiveWps();
    const t = parseFloat(wps.baseMetal.thicknessIn);
    const override = parseFloat(wps.preheat.overrideTempF);
    if (isNaN(t) || isNaN(override)) return;
    const cat = getPreheatCategory(wps.process, wps.filler.electrode);
    let row = cat.rows.find(r => t > r.minIn - 1e-9 && t <= r.maxIn) || cat.rows[0];
    if (override < row.tempF) {
      setMsg("preheatOverride", "error", `Below the Table 3.3 Category ${cat.name} minimum of ${row.tempF}\u00b0F for this thickness.`);
    } else {
      setMsg("preheatOverride", "success", `Meets or exceeds the ${row.tempF}\u00b0F Table 3.3 Category ${cat.name} minimum for this thickness.`);
    }
  }

  function renderWpsChecklist() {
    const wps = getActiveWps();
    const box = document.getElementById("reviewChecklist");
    if (!box) return;
    const checks = [
      { label: "WPS header information complete", ok: !!(wps.header.org && wps.header.wpsNumber && wps.header.date && wps.header.preparedBy) },
      { label: "Base metal group and spec selected", ok: !!(wps.baseMetal.group && wps.baseMetal.spec && wps.baseMetal.thicknessIn) },
      { label: "Filler metal designator selected", ok: !!wps.filler.electrode },
      { label: "Joint, weld type, and position selected", ok: !!(wps.joint.jointType && wps.joint.weldType && wps.joint.penetration && wps.joint.position) },
      { label: "Preheat temperature entered and meets code minimum", ok: !!wps.preheat.overrideTempF },
      { label: "Amperage and voltage ranges entered", ok: !!(wps.electrical.amperageMin && wps.electrical.amperageMax && wps.electrical.voltageMin && wps.electrical.voltageMax) },
    ];
    box.innerHTML = checks.map(c => msgHtml(c.ok ? "success" : "warn", c.label)).join("");
  }

  function updateWpsPreview() {
    const wps = getActiveWps();
    if (!wps) return;
    const proc = PROCESS_LIBRARY[wps.process];
    const d = proc.designators.find(x => x.code === wps.filler.electrode);
    const bm = wps.baseMetal, j = wps.joint, e = wps.electrical, p = wps.preheat;

    const allComplete = !!(wps.header.org && wps.header.wpsNumber && wps.header.date &&
      bm.group && bm.spec && bm.thicknessIn && wps.filler.electrode &&
      j.jointType && j.weldType && j.penetration && j.position &&
      p.overrideTempF && e.amperageMin && e.amperageMax && e.voltageMin && e.voltageMax);

    const row = (label, value, isCode) => `<tr><th scope="row">${label}</th><td class="${isCode ? 'code' : ''} ${value ? '' : 'empty'}">${value ? escapeHtml(value) : 'Not yet specified'}</td></tr>`;
    const classification = d ? classificationForDesignator(proc, d.code) : null;
    const gasRows = proc.requiresShieldingGas ? row("Shielding Gas", wps.shieldingGas.type + (wps.shieldingGas.flowRate ? ` @ ${wps.shieldingGas.flowRate} CFH` : "")) : "";

    document.getElementById("wpsDoc").innerHTML = `
      <span class="watermark ${allComplete ? 'complete' : 'draft'}">${allComplete ? 'COMPLETE' : 'DRAFT'}</span>
      <h3>Welding Procedure Specification</h3>
      <div class="doc-sub">${escapeHtml(wps.header.org || 'Organization not entered')} &middot; WPS ${escapeHtml(wps.header.wpsNumber || '\u2014')}</div>

      <div class="wps-section-label">Identification</div>
      <table class="wps-table">
        ${row("Date", wps.header.date)}
        ${row("Revision", wps.header.revision)}
        ${row("Prepared By", wps.header.preparedBy)}
        ${row("Welding Process", wps.process, true)}
      </table>

      <div class="wps-section-label">Base Metal (Table 3.1)</div>
      <table class="wps-table">
        ${row("Group", bm.group ? `Group ${bm.group}` : "")}
        ${row("Specification", bm.spec)}
        ${row("Thickness", bm.thicknessIn ? bm.thicknessIn + '"' : "")}
      </table>

      <div class="wps-section-label">Filler Metal (${escapeHtml(proc.spec)})</div>
      <table class="wps-table">
        ${row("AWS Classification", d ? (classification || d.code) : "", true)}
        ${row("Usability Designator", d ? d.code : "", true)}
        ${row("Polarity", d ? d.polarity : "")}
        ${row("Positions Qualified", d ? d.positions.join(", ") : "")}
        ${gasRows}
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
        ${row("CTWD / Notes", e.ctwd)}
        ${row("Interpass Cleaning", e.cleaning)}
      </table>

      ${e.technique ? `<div class="wps-section-label">Technique Notes</div><p style="font-size:11.5px;">${escapeHtml(e.technique)}</p>` : ""}

      <p style="font-size:10px;color:var(--muted);margin-top:14px;border-top:1px solid var(--border);padding-top:8px;">
        Generated with the WELD 265 WPS Builder, citing AWS D1.1/D1.1M:2015. Verify against the official code and project WPS before real-world use.<br>
        <strong>For educational use only &mdash; not for commercial use.</strong>
      </p>
    `;
  }

  function renderWpsStepperNav() {
    const list = document.getElementById("stepperList");
    document.getElementById("stepperHeading").textContent = "WPS Steps";
    list.innerHTML = WPS_STEPS.map((s, i) => `
      <li>
        <button type="button" class="step-btn ${i < wpsStep ? 'step-done' : ''}" data-step="${i}"
          aria-current="${i === wpsStep ? 'step' : 'false'}">
          <span class="step-num">${i + 1}</span>
          <span>${escapeHtml(s.title)}</span>
        </button>
      </li>
    `).join("");
    list.querySelectorAll(".step-btn").forEach(btn => {
      btn.addEventListener("click", () => { wpsStep = parseInt(btn.dataset.step, 10); renderWpsStep(); });
    });
  }

  function renderWpsStep() {
    if (!getActiveWps()) { switchMode("docs"); return; }
    const step = WPS_STEPS[wpsStep];
    document.getElementById("stepContent").innerHTML = step.render();
    wireWpsStepInputs(step.id);
    updateWpsPreview();
    renderWpsStepperNav();
    document.getElementById("prevBtn").disabled = wpsStep === 0;
    const nextBtn = document.getElementById("nextBtn");
    if (wpsStep === WPS_STEPS.length - 1) { nextBtn.textContent = "Done"; nextBtn.disabled = true; }
    else { nextBtn.textContent = "Next \u2192"; nextBtn.disabled = false; }
    document.getElementById("stepPosition").textContent = `Step ${wpsStep + 1} of ${WPS_STEPS.length}: ${step.title}`;
    document.getElementById("main-content").focus();
  }

  // =======================================================================
  // MODE: WQTR BUILDER (Form M-4)
  // =======================================================================
  const WQTR_STEPS = [
    { id: "selectWps", title: "Select Source WPS", render: renderWqtrSelectStep },
    { id: "testId", title: "Welder & Test Identification", render: renderWqtrTestIdStep },
    { id: "variables", title: "Base Metal & Range Qualified", render: renderWqtrVariablesStep },
    { id: "results", title: "Test Results", render: renderWqtrResultsStep },
    { id: "certification", title: "Certification", render: renderWqtrCertificationStep },
    { id: "review", title: "Review & Print", render: renderWqtrReviewStep },
  ];

  function renderWqtrSelectStep() {
    const wqtr = getActiveWqtr();
    const options = appState.wpsList.map(w => ({
      value: w.id,
      label: `${w.header.wpsNumber || "(untitled)"} \u2014 ${PROCESS_LIBRARY[w.process].label.split(" — ")[0]}`,
    }));
    return `
      <h1 class="step-title">Select Source WPS</h1>
      <p class="step-desc">Every WQTR is qualified against a specific WPS. Choose the one this test qualifies the welder to.</p>
      <fieldset>
        <legend>Source Document</legend>
        <div class="field-row">
          ${field({ id: "linkedWpsId", label: "WPS", required: true, tag: "select", value: wqtr.linkedWpsId, options })}
        </div>
        <div id="linkedWpsSummary"></div>
        <div class="citation">${WQTR_FORM_CITATION}</div>
      </fieldset>
    `;
  }

  function renderWqtrTestIdStep() {
    const wqtr = getActiveWqtr();
    const t = wqtr.testId;
    return `
      <h1 class="step-title">Welder &amp; Test Identification</h1>
      <p class="step-desc">Identification fields from Form M-4.</p>
      <fieldset>
        <legend>Welder Identification</legend>
        <div class="field-row">
          ${field({ id: "name", label: "Welder Name", required: true, value: t.name })}
          ${field({ id: "idNumber", label: "ID Number", required: true, value: t.idNumber })}
        </div>
        <div class="field-row">
          ${field({ id: "stampNo", label: "Stamp No.", required: false, value: t.stampNo })}
          ${field({ id: "company", label: "Company", required: true, value: t.company })}
        </div>
        <div class="field-row">
          ${field({ id: "division", label: "Division", required: false, value: t.division })}
        </div>
      </fieldset>
      <fieldset>
        <legend>Test Identification</legend>
        <div class="field-row">
          ${field({ id: "testDate", label: "Test Date", required: true, type: "date", value: t.testDate })}
          ${field({ id: "recordNo", label: "Record No.", required: true, value: t.recordNo })}
        </div>
        <div class="field-row">
          ${field({ id: "stdTestNo", label: "Std. Test No.", required: false, value: t.stdTestNo })}
        </div>
      </fieldset>
    `;
  }

  function renderWqtrVariablesStep() {
    const wqtr = getActiveWqtr();
    const v = wqtr.variables;
    const linkedWps = getWpsById(wqtr.linkedWpsId);
    return `
      <h1 class="step-title">Base Metal &amp; Range Qualified</h1>
      <p class="step-desc">Form M-4 records both the actual test values and the resulting range the welder is qualified for.</p>
      ${linkedWps ? `<div class="citation">Pulled forward from WPS <strong>${escapeHtml(linkedWps.header.wpsNumber)}</strong>: ${escapeHtml(linkedWps.process)}, ${escapeHtml(linkedWps.baseMetal.spec || "base metal not set")}, position ${escapeHtml(linkedWps.joint.position || "not set")}.</div>` : ""}
      <fieldset>
        <legend>Test Variables</legend>
        <div class="field-row">
          ${field({ id: "weldJointType", label: "Type of Weld Joint Tested", required: true, tag: "select", value: v.weldJointType, options: WQTR_TYPE_OF_WELD_JOINT.map(x => ({ value: x, label: x })) })}
          ${field({ id: "progression", label: "Vertical Progression", required: false, tag: "select", value: v.progression, options: WQTR_PROGRESSION_OPTIONS.map(x => ({ value: x, label: x })) })}
        </div>
        <div class="field-row">
          ${field({ id: "actualThicknessIn", label: "Actual Test Plate Thickness (in)", required: true, type: "number", value: v.actualThicknessIn })}
          ${field({ id: "backing", label: "Backing", required: false, value: v.backing, hint: "e.g., none, backing bar" })}
        </div>
      </fieldset>
      <fieldset>
        <legend>Range Qualified</legend>
        <div class="field-row">
          ${field({ id: "rangeQualifiedMinIn", label: "Thickness Range Qualified \u2014 Min (in)", required: true, type: "number", value: v.rangeQualifiedMinIn })}
          ${field({ id: "rangeQualifiedMaxIn", label: "Thickness Range Qualified \u2014 Max (in)", required: true, type: "number", value: v.rangeQualifiedMaxIn })}
        </div>
        <div class="field-row">
          ${field({ id: "electrodeCount", label: "Single or Multiple Electrodes", required: false, tag: "select", value: v.electrodeCount, options: [{ value: "Single", label: "Single" }, { value: "Multiple", label: "Multiple" }] })}
        </div>
      </fieldset>
    `;
  }

  function renderWqtrResultsStep() {
    const wqtr = getActiveWqtr();
    const rows = wqtr.testResults.map((r, i) => `
      <div class="field-row" data-result-row="${i}" style="border:1px solid var(--border);padding:12px;border-radius:4px;margin-bottom:10px;">
        ${field({ id: `resultType_${i}`, label: "Type of Test", required: false, tag: "select", value: r.type, options: WQTR_TEST_TYPES.map(x => ({ value: x, label: x })) })}
        ${field({ id: `resultCriteria_${i}`, label: "Acceptance Criteria", required: false, value: r.acceptanceCriteria })}
        ${field({ id: `resultValue_${i}`, label: "Result", required: false, value: r.result })}
        ${field({ id: `resultRemarks_${i}`, label: "Remarks", required: false, value: r.remarks })}
        ${wqtr.testResults.length > 1 ? `<button type="button" class="btn btn-ghost" style="color:#8f1515;border-color:#8f1515;" data-remove-result="${i}">Remove Row</button>` : ""}
      </div>
    `).join("");
    return `
      <h1 class="step-title">Test Results</h1>
      <p class="step-desc">Add one row per test performed (visual, bend, break, macroetch, RT, etc.).</p>
      <fieldset>
        <legend>Test Results</legend>
        <div id="resultsRows">${rows}</div>
        <button type="button" class="btn btn-secondary" id="addResultRowBtn">+ Add Test Result Row</button>
      </fieldset>
    `;
  }

  function renderWqtrCertificationStep() {
    const wqtr = getActiveWqtr();
    const c = wqtr.certification;
    return `
      <h1 class="step-title">Certification</h1>
      <p class="step-desc">Signature and lab information from Form M-4.</p>
      <fieldset>
        <legend>Test Administration</legend>
        <div class="field-row">
          ${field({ id: "testConductedBy", label: "Test Conducted By", required: true, value: c.testConductedBy })}
          ${field({ id: "laboratory", label: "Laboratory", required: false, value: c.laboratory })}
        </div>
        <div class="field-row">
          ${field({ id: "testNumber", label: "Test Number", required: false, value: c.testNumber })}
          ${field({ id: "fileNumber", label: "File Number", required: false, value: c.fileNumber })}
        </div>
      </fieldset>
      <fieldset>
        <legend>Certification Statement</legend>
        <p style="font-size:13px;color:var(--muted);font-style:italic;">
          &ldquo;We, the undersigned, certify that the statements in this record are correct and that the test welds were prepared, welded, and tested in accordance with the requirements of Clause 4 of AWS D1.1/D1.1M (2015) Structural Welding Code&mdash;Steel.&rdquo;
        </p>
        <div class="field-row">
          ${field({ id: "manufacturerContractor", label: "Manufacturer or Contractor", required: true, value: c.manufacturerContractor })}
          ${field({ id: "authorizedBy", label: "Authorized By", required: true, value: c.authorizedBy })}
        </div>
        <div class="field-row">
          ${field({ id: "certDate", label: "Date", required: true, type: "date", value: c.certDate })}
        </div>
        <div class="citation">${WQTR_FORM_CITATION}</div>
      </fieldset>
    `;
  }

  function renderWqtrReviewStep() {
    return `
      <h1 class="step-title">Review &amp; Print</h1>
      <p class="step-desc">Check the live preview on the right, then print/save as PDF to upload to Canvas.</p>
      <div id="reviewChecklist"></div>
      <div style="margin-top:18px;">
        <button type="button" class="btn btn-primary" id="reviewPrintBtn">Print / Save as PDF</button>
      </div>
    `;
  }

  function wireWqtrStepInputs(stepId) {
    const wqtr = getActiveWqtr();
    const content = document.getElementById("stepContent");
    function on(id, evt, handler) {
      const el = content.querySelector("#" + id);
      if (el) el.addEventListener(evt, handler);
    }

    if (stepId === "selectWps") {
      on("linkedWpsId", "change", (e) => {
        wqtr.linkedWpsId = e.target.value;
        const wps = getWpsById(wqtr.linkedWpsId);
        if (wps) {
          wqtr.variables.weldJointType = wps.joint.weldType && wps.joint.weldType.includes("Fillet") ? "Fillet" : "Groove";
          if (!wqtr.variables.actualThicknessIn) wqtr.variables.actualThicknessIn = wps.baseMetal.thicknessIn;
        }
        saveAppState();
        renderLinkedWpsSummary();
        updateWqtrPreview();
      });
      renderLinkedWpsSummary();
    }
    if (stepId === "testId") {
      ["name", "idNumber", "stampNo", "company", "division", "testDate", "recordNo", "stdTestNo"].forEach(f => {
        on(f, "input", (e) => { wqtr.testId[f] = e.target.value; saveAppState(); updateWqtrPreview(); });
      });
    }
    if (stepId === "variables") {
      ["weldJointType", "progression", "actualThicknessIn", "backing", "rangeQualifiedMinIn", "rangeQualifiedMaxIn", "electrodeCount"].forEach(f => {
        on(f, "input", (e) => { wqtr.variables[f] = e.target.value; saveAppState(); updateWqtrPreview(); });
        on(f, "change", (e) => { wqtr.variables[f] = e.target.value; saveAppState(); updateWqtrPreview(); });
      });
    }
    if (stepId === "results") {
      wqtr.testResults.forEach((r, i) => {
        on(`resultType_${i}`, "change", (e) => { wqtr.testResults[i].type = e.target.value; saveAppState(); updateWqtrPreview(); });
        on(`resultCriteria_${i}`, "input", (e) => { wqtr.testResults[i].acceptanceCriteria = e.target.value; saveAppState(); updateWqtrPreview(); });
        on(`resultValue_${i}`, "input", (e) => { wqtr.testResults[i].result = e.target.value; saveAppState(); updateWqtrPreview(); });
        on(`resultRemarks_${i}`, "input", (e) => { wqtr.testResults[i].remarks = e.target.value; saveAppState(); updateWqtrPreview(); });
      });
      content.querySelectorAll("[data-remove-result]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.removeResult, 10);
          wqtr.testResults.splice(idx, 1);
          saveAppState();
          renderWqtrStep();
        });
      });
      const addBtn = content.querySelector("#addResultRowBtn");
      if (addBtn) addBtn.addEventListener("click", () => {
        wqtr.testResults.push({ type: "", acceptanceCriteria: "", result: "", remarks: "" });
        saveAppState();
        renderWqtrStep();
      });
    }
    if (stepId === "certification") {
      ["testConductedBy", "laboratory", "testNumber", "fileNumber", "manufacturerContractor", "authorizedBy", "certDate"].forEach(f => {
        on(f, "input", (e) => { wqtr.certification[f] = e.target.value; saveAppState(); updateWqtrPreview(); });
      });
    }
    if (stepId === "review") {
      renderWqtrChecklist();
      on("reviewPrintBtn", "click", () => window.print());
    }
  }

  function renderLinkedWpsSummary() {
    const wqtr = getActiveWqtr();
    const box = document.getElementById("linkedWpsSummary");
    if (!box) return;
    const wps = getWpsById(wqtr.linkedWpsId);
    if (!wps) { box.innerHTML = ""; return; }
    const proc = PROCESS_LIBRARY[wps.process];
    const d = proc.designators.find(x => x.code === wps.filler.electrode);
    box.innerHTML = msgHtml("info", `This WPS uses ${wps.process}${d ? `, electrode ${d.code}` : ""}, base metal ${wps.baseMetal.spec || "(not set)"} (Group ${wps.baseMetal.group || "?"}), position ${wps.joint.position || "(not set)"}. These will carry into the WQTR preview.`);
  }

  function renderWqtrChecklist() {
    const wqtr = getActiveWqtr();
    const box = document.getElementById("reviewChecklist");
    if (!box) return;
    const checks = [
      { label: "Source WPS selected", ok: !!wqtr.linkedWpsId },
      { label: "Welder and test identification complete", ok: !!(wqtr.testId.name && wqtr.testId.idNumber && wqtr.testId.company && wqtr.testId.testDate && wqtr.testId.recordNo) },
      { label: "Base metal and range qualified entered", ok: !!(wqtr.variables.weldJointType && wqtr.variables.actualThicknessIn && wqtr.variables.rangeQualifiedMinIn && wqtr.variables.rangeQualifiedMaxIn) },
      { label: "At least one test result recorded", ok: wqtr.testResults.some(r => r.type && r.result) },
      { label: "Certification signatures entered", ok: !!(wqtr.certification.manufacturerContractor && wqtr.certification.authorizedBy && wqtr.certification.certDate) },
    ];
    box.innerHTML = checks.map(c => msgHtml(c.ok ? "success" : "warn", c.label)).join("");
  }

  function updateWqtrPreview() {
    const wqtr = getActiveWqtr();
    if (!wqtr) return;
    const wps = getWpsById(wqtr.linkedWpsId);
    const proc = wps ? PROCESS_LIBRARY[wps.process] : null;
    const d = proc ? proc.designators.find(x => x.code === wps.filler.electrode) : null;
    const t = wqtr.testId, v = wqtr.variables, c = wqtr.certification;

    const row = (label, value, isCode) => `<tr><th scope="row">${label}</th><td class="${isCode ? 'code' : ''} ${value ? '' : 'empty'}">${value ? escapeHtml(value) : 'Not yet specified'}</td></tr>`;

    const allComplete = !!(wqtr.linkedWpsId && t.name && t.idNumber && t.company && t.testDate && t.recordNo &&
      v.weldJointType && v.actualThicknessIn && v.rangeQualifiedMinIn && v.rangeQualifiedMaxIn &&
      wqtr.testResults.some(r => r.type && r.result) &&
      c.manufacturerContractor && c.authorizedBy && c.certDate);

    const resultsRows = wqtr.testResults.filter(r => r.type || r.result).map(r => `
      <tr>
        <td>${escapeHtml(r.type || "\u2014")}</td>
        <td>${escapeHtml(r.acceptanceCriteria || "\u2014")}</td>
        <td>${escapeHtml(r.result || "\u2014")}</td>
        <td>${escapeHtml(r.remarks || "\u2014")}</td>
      </tr>
    `).join("");

    document.getElementById("wpsDoc").innerHTML = `
      <span class="watermark ${allComplete ? 'complete' : 'draft'}">${allComplete ? 'COMPLETE' : 'DRAFT'}</span>
      <h3>Welder Qualification Test Record</h3>
      <div class="doc-sub">Form M-4 style &middot; Record ${escapeHtml(t.recordNo || '\u2014')}</div>

      <div class="wps-section-label">Welder &amp; Test Identification</div>
      <table class="wps-table">
        ${row("Name", t.name)}
        ${row("ID Number", t.idNumber)}
        ${row("Stamp No.", t.stampNo)}
        ${row("Company", t.company)}
        ${row("Division", t.division)}
        ${row("Test Date", t.testDate)}
        ${row("Record No.", t.recordNo)}
        ${row("Std. Test No.", t.stdTestNo)}
        ${row("WPS No.", wps ? wps.header.wpsNumber : "")}
      </table>

      <div class="wps-section-label">Process &amp; Filler Metal (from WPS)</div>
      <table class="wps-table">
        ${row("Welding Process", wps ? wps.process : "", true)}
        ${row("AWS Classification", d ? (classificationForDesignator(proc, d.code) || d.code) : "", true)}
        ${row("Polarity", d ? d.polarity : "")}
      </table>

      <div class="wps-section-label">Test Variables &amp; Range Qualified</div>
      <table class="wps-table">
        ${row("Type of Weld Joint", v.weldJointType)}
        ${row("Vertical Progression", v.progression)}
        ${row("Actual Test Thickness", v.actualThicknessIn ? v.actualThicknessIn + '"' : "")}
        ${row("Backing", v.backing)}
        ${row("Thickness Range Qualified", (v.rangeQualifiedMinIn && v.rangeQualifiedMaxIn) ? `${v.rangeQualifiedMinIn}"\u2013${v.rangeQualifiedMaxIn}"` : "")}
        ${row("Electrodes", v.electrodeCount)}
        ${row("Position Qualified", wps ? wps.joint.position : "", true)}
      </table>

      <div class="wps-section-label">Test Results</div>
      <table class="wps-table">
        <thead><tr><th scope="col">Type of Test</th><th scope="col">Acceptance Criteria</th><th scope="col">Result</th><th scope="col">Remarks</th></tr></thead>
        <tbody>${resultsRows || '<tr><td colspan="4" class="empty">No test results entered yet</td></tr>'}</tbody>
      </table>

      <div class="wps-section-label">Certification</div>
      <table class="wps-table">
        ${row("Test Conducted By", c.testConductedBy)}
        ${row("Laboratory", c.laboratory)}
        ${row("Manufacturer/Contractor", c.manufacturerContractor)}
        ${row("Authorized By", c.authorizedBy)}
        ${row("Date", c.certDate)}
      </table>

      <p style="font-size:10px;color:var(--muted);margin-top:14px;border-top:1px solid var(--border);padding-top:8px;">
        Generated with the WELD 265 WQTR Builder, structured after AWS D1.1/D1.1M:2015 Annex M, Form M-4. Verify against the official code and your governing test program before real-world use.<br>
        <strong>For educational use only &mdash; not for commercial use.</strong>
      </p>
    `;
  }

  function renderWqtrStepperNav() {
    const list = document.getElementById("stepperList");
    document.getElementById("stepperHeading").textContent = "WQTR Steps";
    list.innerHTML = WQTR_STEPS.map((s, i) => `
      <li>
        <button type="button" class="step-btn ${i < wqtrStep ? 'step-done' : ''}" data-step="${i}"
          aria-current="${i === wqtrStep ? 'step' : 'false'}">
          <span class="step-num">${i + 1}</span>
          <span>${escapeHtml(s.title)}</span>
        </button>
      </li>
    `).join("");
    list.querySelectorAll(".step-btn").forEach(btn => {
      btn.addEventListener("click", () => { wqtrStep = parseInt(btn.dataset.step, 10); renderWqtrStep(); });
    });
  }

  function renderWqtrStep() {
    if (!getActiveWqtr()) { switchMode("docs"); return; }
    const step = WQTR_STEPS[wqtrStep];
    document.getElementById("stepContent").innerHTML = step.render();
    wireWqtrStepInputs(step.id);
    updateWqtrPreview();
    renderWqtrStepperNav();
    document.getElementById("prevBtn").disabled = wqtrStep === 0;
    const nextBtn = document.getElementById("nextBtn");
    if (wqtrStep === WQTR_STEPS.length - 1) { nextBtn.textContent = "Done"; nextBtn.disabled = true; }
    else { nextBtn.textContent = "Next \u2192"; nextBtn.disabled = false; }
    document.getElementById("stepPosition").textContent = `Step ${wqtrStep + 1} of ${WQTR_STEPS.length}: ${step.title}`;
    document.getElementById("main-content").focus();
  }

  // =======================================================================
  // Mode switching
  // =======================================================================
  function switchMode(mode) {
    appMode = mode;
    document.querySelectorAll(".mode-tab").forEach(btn => {
      btn.setAttribute("aria-current", btn.dataset.mode === mode ? "true" : "false");
    });
    if (mode === "docs") {
      renderDocsScreen();
    } else if (mode === "wps") {
      document.getElementById("stepperNav").style.display = "";
      document.getElementById("stepFooter").style.display = "";
      document.getElementById("previewPane").style.display = "";
      document.getElementById("main-content").style.gridColumn = "";
      if (!activeWpsId) {
        if (appState.wpsList.length) activeWpsId = appState.wpsList[appState.wpsList.length - 1].id;
        else { const wps = makeNewWps(); appState.wpsList.push(wps); saveAppState(); activeWpsId = wps.id; }
      }
      renderWpsStep();
    } else if (mode === "wqtr") {
      document.getElementById("stepperNav").style.display = "";
      document.getElementById("stepFooter").style.display = "";
      document.getElementById("previewPane").style.display = "";
      document.getElementById("main-content").style.gridColumn = "";
      if (!appState.wpsList.length) {
        window.alert("Create a WPS first \u2014 a WQTR is built from one.");
        switchMode("docs");
        return;
      }
      if (!activeWqtrId) {
        if (appState.wqtrList.length) activeWqtrId = appState.wqtrList[appState.wqtrList.length - 1].id;
        else { const wqtr = makeNewWqtr(); appState.wqtrList.push(wqtr); saveAppState(); activeWqtrId = wqtr.id; }
      }
      renderWqtrStep();
    }
  }

  document.querySelectorAll(".mode-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.mode === "wps") activeWpsId = null;
      if (btn.dataset.mode === "wqtr") activeWqtrId = null;
      switchMode(btn.dataset.mode);
    });
  });

  document.getElementById("prevBtn").addEventListener("click", () => {
    if (appMode === "wps") { wpsStep = Math.max(0, wpsStep - 1); renderWpsStep(); }
    else if (appMode === "wqtr") { wqtrStep = Math.max(0, wqtrStep - 1); renderWqtrStep(); }
  });
  document.getElementById("nextBtn").addEventListener("click", () => {
    if (appMode === "wps") { wpsStep = Math.min(WPS_STEPS.length - 1, wpsStep + 1); renderWpsStep(); }
    else if (appMode === "wqtr") { wqtrStep = Math.min(WQTR_STEPS.length - 1, wqtrStep + 1); renderWqtrStep(); }
  });
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (window.confirm("Clear ALL saved WPS and WQTR documents on this device? This cannot be undone.")) {
      appState = { wpsList: [], wqtrList: [] };
      saveAppState();
      activeWpsId = null; activeWqtrId = null; wpsStep = 0; wqtrStep = 0;
      switchMode("docs");
    }
  });

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

  document.addEventListener("keydown", (e) => {
    if (!e.altKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); document.getElementById("nextBtn").click(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); document.getElementById("prevBtn").click(); }
    else if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      if (appMode === "wps") { wpsStep = WPS_STEPS.length - 1; renderWpsStep(); }
      else if (appMode === "wqtr") { wqtrStep = WQTR_STEPS.length - 1; renderWqtrStep(); }
    }
    else if (e.key.toLowerCase() === "k") { e.preventDefault(); openModal(); }
  });

  switchMode("docs");
})();
