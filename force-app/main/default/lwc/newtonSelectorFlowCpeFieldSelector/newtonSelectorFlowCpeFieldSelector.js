import { LightningElement, api, track } from "lwc";
import {
  fetchFields,
  fieldsToOptions,
  filterFieldOptions
} from "c/newtonSelectorFlowCpeUtilityHelpers";

/**
 * Newton Selector Flow CPE | Field Selector (single or multi).
 *
 * Renders a searchable list of a given SObject's fields with type icons. Operates in two modes:
 *  - `isMultiEntry = false` (default) — single select. Emits `fieldchange` with { fieldApiName, fieldLabel, fieldType }.
 *  - `isMultiEntry = true`            — multi select with pills; value is a comma-separated list of field API names.
 *    Emits `change` with { value: csv }.
 *
 * Field metadata is fetched through the shared LRU cache in `c/newtonSelectorFlowCpeUtilityHelpers` so selectors on the same
 * page for the same object all share one Apex describe call.
 *
 * @slot none
 * @fires fieldchange — single-select only: `{ detail: { fieldApiName, fieldLabel, fieldType } }`.
 * @fires change      — multi-select only:  `{ detail: { value: string|null } }` (comma-separated API names).
 */
export default class NewtonSelectorFlowCpeFieldSelector extends LightningElement {
  @track _allOptions = [];
  @track _selectedFields = [];
  _loadedObject = "";
  _connected = false;

  /** @type {string} */ @api label = "";
  /** @type {boolean} */ @api required = false;
  /** @type {boolean} */ @api disabled = false;
  /** @type {string} */ @api fieldLevelHelp;
  /** @type {string} */ @api placeholder = "Search fields...";
  /** @type {boolean} Toggle between single-select and multi-select (with pills) behavior. */
  @api isMultiEntry = false;
  /** Comma-separated Schema.DisplayType names to include (e.g. 'PICKLIST,MULTIPICKLIST'). Empty string = all types. */
  @api fieldTypeFilter = "";

  _value = "";
  _objectApiName = "";

  @api
  get value() {
    return this._value;
  }
  set value(v) {
    const next = v == null ? "" : String(v);
    if (next === this._value) return;
    this._value = next;
    if (this.isMultiEntry) this._syncSelectedFromValue();
  }

  @api
  get objectApiName() {
    return this._objectApiName;
  }
  set objectApiName(v) {
    const next = v == null ? "" : String(v).trim();
    if (next === this._objectApiName) return;
    this._objectApiName = next;
    this._allOptions = [];
    this._loadedObject = "";
    if (this._connected && next) this._loadFields();
  }

  // ── Single-select getter ──────────────────────────────────────

  get selection() {
    if (this.isMultiEntry || !this._value) return null;
    const found = this._allOptions.find((o) => o.id === this._value);
    return (
      found || {
        id: this._value,
        title: this._value,
        subtitle: "",
        icon: "type"
      }
    );
  }

  // ── Multi-select getters ─────────────────────────────────────

  get hasSelected() {
    return this.isMultiEntry && this._selectedFields.length > 0;
  }

  get availableOptions() {
    if (!this.isMultiEntry) return this._allOptions;
    const ids = new Set(this._selectedFields.map((f) => f.id));
    return this._allOptions.filter((o) => !ids.has(o.id));
  }

  get lookupVariant() {
    return this.isMultiEntry ? "label-hidden" : "label-stacked";
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  connectedCallback() {
    this._connected = true;
    if (this._objectApiName && !this._loadedObject) this._loadFields();
  }

  disconnectedCallback() {
    this._connected = false;
  }

  // ── Field loading (shared cache) ──────────────────────────────

  _loadFields() {
    const obj = this._objectApiName;
    if (!obj) return;
    fetchFields(obj).then((fields) => {
      if (!this._connected || this._objectApiName !== obj) return;
      const allOpts = fieldsToOptions(fields);
      this._allOptions = this._applyTypeFilter(allOpts);
      this._loadedObject = obj;
      if (this.isMultiEntry) this._syncSelectedFromValue();
      const lu = this.template.querySelector(
        "c-newton-selector-flow-cpe-custom-lookup"
      );
      if (lu && typeof lu.setDefaultResults === "function") {
        const pool = this.isMultiEntry
          ? this.availableOptions
          : this._allOptions;
        lu.setDefaultResults(pool);
      }
    });
  }

  _applyTypeFilter(opts) {
    if (!this.fieldTypeFilter) return opts;
    const allowed = new Set(
      this.fieldTypeFilter
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
    );
    if (!allowed.size) return opts;
    return opts.filter((o) => allowed.has((o.type || "").toUpperCase()));
  }

  _syncSelectedFromValue() {
    if (!this._value) {
      this._selectedFields = [];
      return;
    }
    const names = this._value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    this._selectedFields = names.map((name) => {
      const found = this._allOptions.find((o) => o.id === name);
      return (
        found || {
          id: name,
          title: name,
          subtitle: "",
          icon: "type",
          type: ""
        }
      );
    });
  }

  // ── Event handlers ────────────────────────────────────────────

  handleSearch(event) {
    const lu = event.currentTarget;
    const obj = this._objectApiName;
    if (!obj) {
      if (lu && typeof lu.setSearchResults === "function") {
        lu.setSearchResults([]);
      }
      return;
    }
    // Defensive: trigger a load if connectedCallback hasn't fired yet.
    if (!this._loadedObject && this._connected) this._loadFields();

    const term = (event.detail && event.detail.rawSearchTerm) || "";
    const pool = this.isMultiEntry ? this.availableOptions : this._allOptions;
    const filtered = filterFieldOptions(pool, term);
    if (lu && typeof lu.setSearchResults === "function") {
      lu.setSearchResults(filtered);
    }
  }

  handleSelectionChange(event) {
    const lu = event.currentTarget;
    const sel =
      lu && typeof lu.getSelection === "function" ? lu.getSelection() : null;
    const row = Array.isArray(sel) ? sel[0] : sel;

    if (this.isMultiEntry) {
      if (!row || !row.id) return;
      if (this._selectedFields.some((f) => f.id === row.id)) return;
      this._selectedFields = [...this._selectedFields, row];
      this._emitMultiChange();
      // Clear the lookup selection so user can pick another.

      Promise.resolve().then(() => {
        if (lu) {
          lu.selection = null;
          if (typeof lu.setDefaultResults === "function") {
            lu.setDefaultResults(this.availableOptions);
          }
        }
      });
    } else {
      const fieldApiName = row && row.id ? String(row.id) : "";
      const fieldLabel = row && row.title ? String(row.title) : "";
      const fieldType = row && row.type ? String(row.type) : "";
      this._value = fieldApiName;
      this.dispatchEvent(
        new CustomEvent("fieldchange", {
          detail: { fieldApiName, fieldLabel, fieldType }
        })
      );
    }
  }

  handleRemovePill(event) {
    const name =
      (event.currentTarget && event.currentTarget.name) ||
      (event.detail && event.detail.name);
    this._selectedFields = this._selectedFields.filter((f) => f.id !== name);
    this._emitMultiChange();
  }

  _emitMultiChange() {
    const csv = this._selectedFields.map((f) => f.id).join(",");
    this._value = csv;
    this.dispatchEvent(
      new CustomEvent("change", { detail: { value: csv || null } })
    );
  }
}
