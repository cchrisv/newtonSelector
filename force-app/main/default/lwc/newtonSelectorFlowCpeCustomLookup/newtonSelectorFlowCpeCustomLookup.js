import { LightningElement, api, track } from "lwc";

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_MIN_SEARCH = 2;

/** @param {unknown} r @returns {object} */
function normalizeResult(r) {
  if (!r || typeof r !== "object") {
    return {
      id: "",
      sObjectType: "",
      icon: "",
      title: "",
      subtitle: ""
    };
  }
  const o = /** @type {Record<string, unknown>} */ (r);
  const idRaw = o.id != null && String(o.id) !== "" ? o.id : o.value;
  const titleRaw =
    o.title != null && String(o.title) !== "" ? o.title : o.label;
  return {
    id: idRaw == null ? "" : String(idRaw),
    sObjectType: String(o.sObjectType || ""),
    icon: String(o.icon || ""),
    title: titleRaw == null ? "" : String(titleRaw),
    subtitle: o.subtitle == null ? "" : String(o.subtitle)
  };
}

export default class NewtonSelectorFlowCpeCustomLookup extends LightningElement {
  @track _selection = [];

  @track _options = [];

  @track _defaultOptions = [];

  @track _dropdownOpen = false;

  @track _loading = false;

  @track _inputValue = "";

  _searchTerm = "";

  _debounceTimer;

  _activeIndex = -1;

  _customValidity = "";

  _closeTimer;

  _listboxId;

  _errorId;

  _inputId;

  static _seq = 0;

  constructor() {
    super();
    const seq = NewtonSelectorFlowCpeCustomLookup._seq;
    this._listboxId = `lookup-lb-${seq}`;
    this._errorId = `lookup-err-${seq}`;
    this._inputId = `lookup-input-${seq}`;
    NewtonSelectorFlowCpeCustomLookup._seq += 1;
  }

  get inputId() {
    return this._inputId;
  }

  disconnectedCallback() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = undefined;
    }
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = undefined;
    }
  }

  /** @type {string} */
  @api label = "Search";

  /** @type {string} */
  @api placeholder = "";

  /** @type {string} */
  @api variant = "label-stacked";

  @api required = false;

  @api disabled = false;

  @api isMultiEntry = false;

  @api minSearchTermLength = DEFAULT_MIN_SEARCH;

  /** @type {number|null} */
  @api scrollAfterNItems = null;

  @api messageWhenValueMissing = "A selection is required.";

  /** @type {string} */
  @api fieldLevelHelp;

  /** @type {{ id: string, message: string }[]} */
  @api errors = [];

  /** @type {{ value: string, label: string, defaults?: string }[]} */
  @api newRecordOptions = [];

  get hasLookupErrors() {
    return Array.isArray(this.errors) && this.errors.length > 0;
  }

  /** Stacked label + help live outside the input so they stay visible when the search row is replaced by pills (CPE). */
  get showExternalLabel() {
    return this.variant === "label-stacked";
  }

  get inputVariant() {
    return this.showExternalLabel ? "label-hidden" : this.variant;
  }

  /** @param {unknown} v */
  @api
  set selection(v) {
    if (v == null) {
      if (this._selection.length) {
        this._selection = [];
      }
      return;
    }
    let incoming;
    if (Array.isArray(v)) {
      incoming = v.map(normalizeResult).filter((r) => r.id);
    } else {
      const one = normalizeResult(v);
      incoming = one.id ? [one] : [];
    }
    // Skip overwrite when IDs match — the child's existing selection has
    // richer data (display names, icons from search results) than the
    // parent's computed selection (which may only have raw IDs).
    const curIds = this._selection.map((s) => s.id).join("\u0001");
    const newIds = incoming.map((s) => s.id).join("\u0001");
    if (curIds === newIds && curIds !== "") {
      return;
    }
    this._selection = incoming;
  }

  get selection() {
    return this.isMultiEntry
      ? [...this._selection]
      : this._selection[0] || null;
  }

  get selectedIds() {
    return this._selection.map((s) => s.id);
  }

  get pillItems() {
    return this._selection;
  }

  get hasSelection() {
    return this._selection.length > 0;
  }

  get isSingleEntry() {
    return !this.isMultiEntry;
  }

  /** Single-select: icon of the selected record, shown inside the input area. */
  get selectedIconName() {
    if (!this.isSingleEntry || !this.hasSelection) {
      return null;
    }
    return this._selection[0].icon || null;
  }

  /** Single-select: show the selected title in the input; multi: show search term. */
  get inputDisplayValue() {
    if (this.isSingleEntry && this.hasSelection) {
      return this._selection[0].title || "";
    }
    return this._inputValue;
  }

  /** Single-select with selection: input is readonly so user must clear first. */
  get isInputReadonly() {
    return this.isSingleEntry && this.hasSelection;
  }

  /** Show the X button for single-select when there is a selection. */
  get showClearButton() {
    return this.isSingleEntry && this.hasSelection && !this.disabled;
  }

  /** CSS class for the input wrapper — adds entity styling when single-select has a selection. */
  get inputContainerClass() {
    const base = "slds-combobox__form-element slds-input-has-icon";
    if (this.isSingleEntry && this.hasSelection) {
      return `${base} slds-input-has-icon_left-right`;
    }
    return `${base} slds-input-has-icon_right`;
  }

  get inputClass() {
    const base = "slds-input slds-combobox__input";
    if (this.isSingleEntry && this.hasSelection) {
      return `${base} slds-combobox__input-value`;
    }
    return base;
  }

  get showSearchIcon() {
    return !(this.isSingleEntry && this.hasSelection);
  }

  get requiredAria() {
    return this.required ? "true" : "false";
  }

  get listboxClass() {
    const base = "slds-listbox slds-listbox_vertical";
    const scroll = this.scrollableClass;
    return scroll ? `${base} ${scroll}` : base;
  }

  get listboxActiveOptionId() {
    const row = this.displayedOptions[this._activeIndex];
    return row ? row.optionId : null;
  }

  get displayedOptions() {
    const term = this._dropdownOpen
      ? this._searchTerm.trim().toLowerCase()
      : "";
    return this._options.map((r, i) => ({
      key: r.id + i,
      id: r.id,
      sObjectType: r.sObjectType,
      icon: r.icon,
      title: r.title,
      subtitle: r.subtitle,
      optionId: `${this._listboxId}-opt-${i}`,
      searchTerm: term,
      isActive: i === this._activeIndex,
      ariaSelected: i === this._activeIndex ? "true" : "false"
    }));
  }

  get scrollableClass() {
    const n = this.scrollAfterNItems;
    if (n != null) {
      const num = Number(n);
      if (num === 5 || num === 7 || num === 10) {
        return `slds-dropdown_length-with-icon-${num}`;
      }
    }
    return "";
  }

  /** Min chars before search; `0` means allow empty / browse (recent-first) queries. `Number(x) || default` wrongly turns 0 into default. */
  get effectiveMinSearchLength() {
    const v = this.minSearchTermLength;
    if (v === null || v === undefined || v === "") {
      return DEFAULT_MIN_SEARCH;
    }
    const n = Number(v);
    if (Number.isNaN(n)) {
      return DEFAULT_MIN_SEARCH;
    }
    return Math.max(0, Math.floor(n));
  }

  get inlineErrorMessage() {
    if (this.hasLookupErrors) {
      return this.errors.map((e) => e.message).join(" ");
    }
    return "";
  }

  // ── ARIA getters ──────────────────────────────────────────────

  get comboboxExpanded() {
    return this._dropdownOpen ? "true" : "false";
  }

  get comboboxClass() {
    const base =
      "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click cc-lookup__combobox";
    return this._dropdownOpen ? `${base} slds-is-open` : base;
  }

  get ariaInvalidValue() {
    return this.hasLookupErrors ? "true" : undefined;
  }

  get ariaBusyValue() {
    return this._loading ? "true" : "false";
  }

  get errorDescribedById() {
    return this.inlineErrorMessage ? this._errorId : undefined;
  }

  get computedPlaceholder() {
    if (this.placeholder) {
      return this.placeholder;
    }
    return "Search...";
  }

  get noResultsMessage() {
    const term = (this._searchTerm || "").trim();
    if (!term) {
      return "No options available.";
    }
    return "No results found.";
  }

  // ── Public API methods ────────────────────────────────────────

  @api
  setSearchResults(results) {
    this._loading = false;
    const arr = Array.isArray(results) ? results : [];
    this._options = arr.map(normalizeResult);
    this._activeIndex = this._options.length ? 0 : -1;
  }

  @api
  setDefaultResults(results) {
    const arr = Array.isArray(results) ? results : [];
    this._defaultOptions = arr.map(normalizeResult);
  }

  @api
  getSelection() {
    return this._selection.map((s) => ({ ...s }));
  }

  @api
  focus() {
    const input = this.refs?.searchinput;
    if (input) {
      if (!(this.isSingleEntry && this.hasSelection)) {
        this._dropdownOpen = true;
      }
      input.focus();
    }
  }

  @api
  blur() {
    const input = this.refs?.searchinput;
    if (input) {
      input.blur();
    }
    this.closeDropdown();
  }

  @api
  checkValidity() {
    if (this.hasLookupErrors) {
      return false;
    }
    if (!this.required) {
      return true;
    }
    return this._selection.length > 0;
  }

  @api
  reportValidity() {
    return this.checkValidity();
  }

  @api
  setCustomValidity(message) {
    this._customValidity = message == null ? "" : String(message);
  }

  // ── Event handlers ────────────────────────────────────────────

  handleNativeInput(event) {
    this._inputValue = event.target.value;
    const raw = this._inputValue || "";
    this._searchTerm = raw;
    this.openDropdown();
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = window.setTimeout(
      () => this.fireSearch(raw),
      DEFAULT_DEBOUNCE_MS
    );
  }

  fireSearch(raw) {
    const sanitized = raw.trim().toLowerCase();
    const min = this.effectiveMinSearchLength;
    if (sanitized.length < min) {
      this._options = this._defaultOptions.length
        ? [...this._defaultOptions]
        : [];
      this._activeIndex = this._options.length ? 0 : -1;
      this._loading = false;
      return;
    }
    this._loading = true;
    this.dispatchEvent(
      new CustomEvent("search", {
        detail: {
          searchTerm: sanitized,
          rawSearchTerm: raw,
          selectedIds: this.selectedIds
        }
      })
    );
  }

  handleClearSelection() {
    this._selection = [];
    this._searchTerm = "";
    this._inputValue = "";
    this.dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: { selectedIds: [] }
      })
    );

    Promise.resolve().then(() => {
      const input = this.refs.searchinput;
      if (input) {
        input.focus();
      }
    });
  }

  handleFocus() {
    // Single-select with selection: input is readonly, don't open dropdown
    if (this.isSingleEntry && this.hasSelection) {
      return;
    }
    this.openDropdown();
    if (this.disabled) {
      return;
    }
    const min = this.effectiveMinSearchLength;
    if (min === 0 && !String(this._inputValue || "").trim() && !this._loading) {
      this.fireSearch("");
      return;
    }
    if (!this._inputValue && this._defaultOptions.length) {
      this._options = [...this._defaultOptions];
      this._activeIndex = this._options.length ? 0 : -1;
      this._loading = false;
    }
  }

  handleBlur() {
    this._closeTimer = window.setTimeout(() => {
      this.closeDropdown();
    }, 200);
  }

  handlePointerDownOption(event) {
    event.preventDefault();
  }

  openDropdown() {
    if (this.disabled) {
      return;
    }
    this._dropdownOpen = true;
  }

  closeDropdown() {
    this._dropdownOpen = false;
    this._activeIndex = -1;
  }

  handleSelect(event) {
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
    }
    const id = event.currentTarget.dataset.id;
    const row = this._options.find((o) => o.id === id);
    if (!row) {
      return;
    }
    this.applySelection(row);
  }

  /** @param {ReturnType<typeof normalizeResult>} row */
  applySelection(row) {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = undefined;
    }
    if (this.isMultiEntry) {
      if (!this._selection.some((s) => s.id === row.id)) {
        this._selection = [...this._selection, row];
      }
    } else {
      this._selection = [row];
    }
    this._searchTerm = "";
    this._inputValue = "";
    this._options = [];
    this.closeDropdown();
    this.dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: {
          selectedIds: this.selectedIds
        }
      })
    );
    if (this.isMultiEntry) {
      Promise.resolve().then(() => this.refs.searchinput?.focus());
    }
  }

  handleRemovePill(event) {
    const id = event.currentTarget.name;
    this._selection = this._selection.filter((s) => s.id !== id);
    this.dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: {
          selectedIds: this.selectedIds
        }
      })
    );

    Promise.resolve().then(() => this.refs.searchinput?.focus());
  }

  handleKeydown(event) {
    if (event.key === "Tab") {
      this.closeDropdown();
      return;
    }
    if (
      !this._dropdownOpen &&
      (event.key === "ArrowDown" || event.key === "Enter")
    ) {
      this.openDropdown();
    }
    if (!this._options.length) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this._activeIndex = (this._activeIndex + 1) % this._options.length;
      this._scrollActiveIntoView();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this._activeIndex =
        (this._activeIndex - 1 + this._options.length) % this._options.length;
      this._scrollActiveIntoView();
    } else if (event.key === "Home") {
      event.preventDefault();
      this._activeIndex = 0;
      this._scrollActiveIntoView();
    } else if (event.key === "End") {
      event.preventDefault();
      this._activeIndex = Math.max(this._options.length - 1, 0);
      this._scrollActiveIntoView();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = this._options[this._activeIndex];
      if (row) {
        this.applySelection(row);
      }
    } else if (event.key === "Escape") {
      this.closeDropdown();
    }
  }

  handleNewRecord(event) {
    const type = event.currentTarget.dataset.object;
    this.dispatchEvent(
      new CustomEvent("newrecord", {
        detail: {
          objectApiName: type
        }
      })
    );
  }

  // ── Private helpers ───────────────────────────────────────────

  _scrollActiveIntoView() {
    const optId = this.listboxActiveOptionId;
    if (!optId) {
      return;
    }

    Promise.resolve().then(() => {
      const el = this.template.querySelector(`[id="${optId}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }
}
