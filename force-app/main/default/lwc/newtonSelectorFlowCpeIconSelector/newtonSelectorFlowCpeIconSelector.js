import { LightningElement, api, track } from "lwc";
import {
  ICON_SETS,
  iconsForSet,
  filterIcons,
  findIconByName
} from "./iconCatalog";

const MODE_COMBOBOX = "combobox";
const MODE_TABS = "tabs";
const ICON_PAGE_SIZE = 80;

export default class NewtonSelectorFlowCpeIconSelector extends LightningElement {
  @api label = "Icon";
  @api fieldLevelHelp = "";
  @api required = false;
  @api disabled = false;
  @api mode = MODE_COMBOBOX;

  _value = "";
  _allowedSets = [...ICON_SETS];
  @track _searchTerm = "";
  @track _activeSet = ICON_SETS[0];
  @track _isOpen = false;
  @track _visibleLimit = ICON_PAGE_SIZE;
  _closeTimer;

  disconnectedCallback() {
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = undefined;
    }
  }

  @api
  get value() {
    return this._value;
  }
  set value(v) {
    this._value = v || "";
    const match = findIconByName(this._value);
    if (match) this._activeSet = match.set;
  }

  @api
  get allowedSets() {
    return this._allowedSets;
  }
  set allowedSets(v) {
    if (Array.isArray(v) && v.length > 0) {
      const supportedSets = v.filter((s) => ICON_SETS.includes(s));
      if (supportedSets.length === 0) return;
      this._allowedSets = supportedSets;
      if (!this._allowedSets.includes(this._activeSet)) {
        this._activeSet = this._allowedSets[0];
      }
    }
  }

  get isCombobox() {
    return this.mode === MODE_COMBOBOX;
  }
  get isTabs() {
    return this.mode === MODE_TABS;
  }

  get setTabs() {
    return this._allowedSets.map((s) => ({
      key: s,
      label: s.charAt(0).toUpperCase() + s.slice(1),
      active: s === this._activeSet,
      buttonClass:
        s === this._activeSet
          ? "slds-tabs_default__link slds-is-active"
          : "slds-tabs_default__link",
      liClass:
        s === this._activeSet
          ? "slds-tabs_default__item slds-is-active"
          : "slds-tabs_default__item",
      ariaSelected: String(s === this._activeSet),
      tabIndex: s === this._activeSet ? 0 : -1
    }));
  }

  get visibleIcons() {
    const selectedEntry = this.selectedEntry;
    const selectedIconName = selectedEntry?.iconName || "";
    const selectedInFilteredSet = selectedEntry?.set === this._activeSet;
    let visible = this.filteredIcons.slice(0, this._visibleLimit);
    if (
      selectedInFilteredSet &&
      selectedIconName &&
      !visible.some((entry) => entry.iconName === selectedIconName)
    ) {
      visible = [selectedEntry, ...visible.slice(0, ICON_PAGE_SIZE - 1)];
    }
    return visible.map((entry) => ({
      ...entry,
      displayLabel: entry.humanLabel || entry.name,
      assistiveLabel: `Select ${entry.humanLabel || entry.iconName} icon`,
      selected: entry.iconName === this._value,
      buttonClass:
        entry.iconName === this._value
          ? "newton-selector-icon-cell newton-selector-icon-cell_selected"
          : "newton-selector-icon-cell"
    }));
  }

  get filteredIcons() {
    const base = iconsForSet(this._activeSet);
    return filterIcons(base, this._searchTerm);
  }
  get hasVisibleIcons() {
    return this.filteredIcons.length > 0;
  }
  get hasNoVisibleIcons() {
    return !this.hasVisibleIcons;
  }
  get hasMoreIcons() {
    return this.visibleIcons.length < this.filteredIcons.length;
  }
  get showMoreLabel() {
    const remaining = this.filteredIcons.length - this.visibleIcons.length;
    const nextCount = Math.min(remaining, ICON_PAGE_SIZE);
    return `Show ${nextCount} more`;
  }
  get resultCountLabel() {
    return `${this.visibleIcons.length} of ${this.filteredIcons.length} icons`;
  }
  get shouldRenderComboboxPanel() {
    return this.isCombobox && this._isOpen;
  }

  get selectedEntry() {
    return findIconByName(this._value);
  }

  get selectedLabel() {
    const e = this.selectedEntry;
    return e ? e.iconName : this._value;
  }

  get placeholderLabel() {
    return this.selectedLabel || "Select an icon...";
  }

  get hasSelection() {
    return Boolean(this._value);
  }
  get selectorClass() {
    return this._isOpen
      ? "newton-selector-icon-selector newton-selector-icon-selector_open"
      : "newton-selector-icon-selector";
  }
  get comboboxPanelClass() {
    return this._isOpen
      ? "newton-combobox__panel newton-combobox__panel_open"
      : "newton-combobox__panel";
  }

  handleTabClick(event) {
    const key = event.currentTarget.dataset.set;
    if (key) {
      this._activeSet = key;
      this._visibleLimit = ICON_PAGE_SIZE;
    }
  }

  handleTabKeydown(event) {
    const { key } = event;
    if (
      key !== "ArrowLeft" &&
      key !== "ArrowRight" &&
      key !== "Home" &&
      key !== "End"
    )
      return;
    event.preventDefault();
    const sets = this._allowedSets;
    const current = sets.indexOf(this._activeSet);
    let next = current;
    if (key === "ArrowLeft") next = (current - 1 + sets.length) % sets.length;
    else if (key === "ArrowRight") next = (current + 1) % sets.length;
    else if (key === "Home") next = 0;
    else if (key === "End") next = sets.length - 1;
    this._activeSet = sets[next];
    this._visibleLimit = ICON_PAGE_SIZE;
  }

  handleSearchInput(event) {
    this._searchTerm = event.target.value || "";
    this._visibleLimit = ICON_PAGE_SIZE;
  }

  handleIconClick(event) {
    const iconName = event.currentTarget.dataset.icon;
    this.selectIcon(iconName);
  }

  handleIconKeydown(event) {
    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "Spacebar"
    ) {
      event.preventDefault();
      const iconName = event.currentTarget.dataset.icon;
      this.selectIcon(iconName);
    }
  }

  handleOpen() {
    if (this.disabled) return;
    this._isOpen = !this._isOpen;
    if (this._isOpen) {
      this._visibleLimit = ICON_PAGE_SIZE;
    }
  }

  handleShowMore() {
    this._visibleLimit += ICON_PAGE_SIZE;
  }

  handleBlur() {
    this._closeTimer = setTimeout(() => {
      this._isOpen = false;
      this._closeTimer = undefined;
    }, 150);
  }

  handleClear(event) {
    event.stopPropagation();
    this.selectIcon("");
  }

  selectIcon(iconName) {
    this._value = iconName || "";
    this._isOpen = false;
    this.dispatchEvent(
      new CustomEvent("iconselect", {
        detail: { iconName: this._value },
        bubbles: true,
        composed: true
      })
    );
  }

  @api
  focus() {
    const trigger = this.template.querySelector(".newton-combobox__trigger");
    if (trigger) trigger.focus();
  }

  @api
  reportValidity() {
    if (!this.required) return true;
    return Boolean(this._value);
  }
}
