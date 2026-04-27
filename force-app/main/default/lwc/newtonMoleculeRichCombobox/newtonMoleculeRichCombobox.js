import { LightningElement, api, track } from "lwc";
import { filterItems } from "c/newtonUtilitySelectorDataSources";
import { buildTokens } from "c/newtonUtilitySearchHighlight";

const DEFAULT_PLACEHOLDER = "Select an option";
const VALID_BADGE_VARIANTS = new Set([
  "neutral",
  "brand",
  "success",
  "warning",
  "error",
  "inverse"
]);
const VALID_BADGE_SHAPES = new Set(["pill", "square"]);

function toSafeString(value) {
  return value === undefined || value === null ? "" : String(value);
}

function getShapeStyle(shape) {
  if (!shape) return "";
  const parts = [];
  if (shape.width) parts.push(`width:${shape.width}`);
  if (shape.height) parts.push(`height:${shape.height}`);
  return parts.join(";");
}

function normalizeItem(item, index, badgeVariant, badgeShape) {
  const normalizedBadgeVariant = VALID_BADGE_VARIANTS.has(item?.badgeVariant)
    ? item.badgeVariant
    : VALID_BADGE_VARIANTS.has(badgeVariant)
      ? badgeVariant
      : "neutral";
  const normalizedBadgeShape = VALID_BADGE_SHAPES.has(badgeShape)
    ? badgeShape
    : "pill";

  return {
    ...item,
    id: toSafeString(item?.id || `option-${index}`),
    label: toSafeString(item?.label ?? item?.value),
    sublabel: toSafeString(item?.sublabel),
    icon: toSafeString(item?.icon),
    badge: toSafeString(item?.badge),
    helpText: toSafeString(item?.helpText),
    value: toSafeString(item?.value ?? index),
    disabled: Boolean(item?.disabled),
    _shapeStyle: getShapeStyle(item?.shape),
    _badgeClass: [
      "newton-rich-combobox__badge",
      `newton-rich-combobox__badge_variant-${normalizedBadgeVariant}`,
      `newton-rich-combobox__badge_shape-${normalizedBadgeShape}`
    ].join(" ")
  };
}

export default class NewtonMoleculeRichCombobox extends LightningElement {
  static _seq = 0;

  @api items = [];
  @api disabled = false;
  @api enableSearch = false;
  @api placeholder = DEFAULT_PLACEHOLDER;
  @api badgeVariant = "neutral";
  @api badgeShape = "pill";

  @track _searchTerm = "";
  @track _open = false;

  _value = "";
  _activeIndex = -1;
  _listboxId;
  _inputId;

  constructor() {
    super();
    const seq = NewtonMoleculeRichCombobox._seq;
    this._listboxId = `rich-combobox-listbox-${seq}`;
    this._inputId = `rich-combobox-input-${seq}`;
    NewtonMoleculeRichCombobox._seq += 1;
  }

  @api
  get value() {
    return this._value;
  }

  set value(next) {
    this._value = toSafeString(next);
  }

  get inputId() {
    return this._inputId;
  }

  get normalizedItems() {
    const source = Array.isArray(this.items) ? this.items : [];
    return source.map((item, index) =>
      normalizeItem(item, index, this.badgeVariant, this.badgeShape)
    );
  }

  get selectedItem() {
    const selectedValue = this._value;
    return (
      this.normalizedItems.find((item) => item.value === selectedValue) || null
    );
  }

  get filteredItems() {
    const base = this.normalizedItems;
    if (!this.enableSearch) return base;
    if (!toSafeString(this._searchTerm).trim()) return base;
    return filterItems(base, this._searchTerm);
  }

  get displayedItems() {
    const selectedValue = this._value;
    return this.filteredItems.map((item, index) => ({
      ...item,
      optionId: `${this._listboxId}-opt-${index}`,
      isActive: index === this._activeIndex,
      isSelected: item.value === selectedValue,
      ariaSelected: item.value === selectedValue ? "true" : "false",
      secondaryText: item.sublabel || item.helpText,
      titleTokens: buildTokens(
        item.label,
        this.enableSearch ? this._searchTerm : ""
      )
    }));
  }

  get comboboxClass() {
    const base =
      "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click newton-rich-combobox__combobox";
    return this._open ? `${base} slds-is-open` : base;
  }

  get ariaExpanded() {
    return this._open ? "true" : "false";
  }

  get activeOptionId() {
    const active = this.displayedItems[this._activeIndex];
    return active ? active.optionId : null;
  }

  get inputReadonly() {
    return !this.enableSearch;
  }

  get inputClass() {
    const base = "slds-input slds-combobox__input";
    if (this.showSelectedIcon || this.showSelectedShape) {
      return `${base} slds-combobox__input-value newton-rich-combobox__input-value`;
    }
    return base;
  }

  get inputValue() {
    if (this.enableSearch && this._open) {
      return this._searchTerm;
    }
    return this.selectedItem?.label || "";
  }

  get showSelectedIcon() {
    return Boolean(this.selectedItem?.icon);
  }

  get showSelectedShape() {
    return Boolean(this.selectedItem?.shape && this.selectedItem?._shapeStyle);
  }

  get selectedShapeStyle() {
    return this.selectedItem?._shapeStyle || "";
  }

  get selectedIconName() {
    return this.selectedItem?.icon || "";
  }

  get computedPlaceholder() {
    if (this.selectedItem) return "";
    return this.placeholder || DEFAULT_PLACEHOLDER;
  }

  get hasResults() {
    return this.displayedItems.length > 0;
  }

  get noResultsMessage() {
    if (this.enableSearch && toSafeString(this._searchTerm).trim()) {
      return "No matches found.";
    }
    return "No options available.";
  }

  get inputContainerClass() {
    const base = "slds-combobox__form-element slds-input-has-icon";
    if (this.showSelectedIcon || this.showSelectedShape) {
      return `${base} slds-input-has-icon_left-right`;
    }
    return base;
  }

  handleInput(event) {
    if (!this.enableSearch) return;
    this._searchTerm = event.target.value || "";
    this.openDropdown();
    this.resetActiveIndex();
  }

  handleFocus() {
    this.openDropdown();
  }

  handleClick() {
    this.openDropdown();
  }

  handleBlur() {
    this.closeDropdown();
  }

  handleOptionPointerDown(event) {
    event.preventDefault();
  }

  handleOptionSelect(event) {
    const value = event.currentTarget.dataset.value;
    const item = this.displayedItems.find((row) => row.value === value);
    if (!item || item.disabled) return;

    this._value = item.value;
    this._searchTerm = "";
    this.closeDropdown();
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: {
          value: item.value,
          item
        }
      })
    );
  }

  handleKeydown(event) {
    if (this.disabled) return;

    if (event.key === "Tab") {
      this.closeDropdown();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!this._open) {
        this.openDropdown();
        return;
      }
      this.moveActiveIndex(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!this._open) {
        this.openDropdown();
        return;
      }
      this.moveActiveIndex(-1);
      return;
    }

    if (event.key === "Home" && this._open) {
      event.preventDefault();
      this._activeIndex = this.findNextEnabledIndex(0, 1);
      this.scrollActiveIntoView();
      return;
    }

    if (event.key === "End" && this._open) {
      event.preventDefault();
      this._activeIndex = this.findNextEnabledIndex(
        this.displayedItems.length - 1,
        -1
      );
      this.scrollActiveIntoView();
      return;
    }

    if (event.key === "Enter") {
      if (!this._open) {
        event.preventDefault();
        this.openDropdown();
        return;
      }
      event.preventDefault();
      const active = this.displayedItems[this._activeIndex];
      if (active && !active.disabled) {
        this._value = active.value;
        this._searchTerm = "";
        this.closeDropdown();
        this.dispatchEvent(
          new CustomEvent("change", {
            detail: {
              value: active.value,
              item: active
            }
          })
        );
      }
      return;
    }

    if (event.key === "Escape") {
      this.closeDropdown();
    }
  }

  openDropdown() {
    if (this.disabled) return;
    this._open = true;
    this.resetActiveIndex();
  }

  closeDropdown() {
    this._open = false;
    this._activeIndex = -1;
    this._searchTerm = "";
  }

  resetActiveIndex() {
    const items = this.displayedItems;
    if (!items.length) {
      this._activeIndex = -1;
      return;
    }

    const selectedValue = this._value;
    const selectedIndex = items.findIndex(
      (item) => item.value === selectedValue && !item.disabled
    );
    if (selectedIndex >= 0) {
      this._activeIndex = selectedIndex;
      return;
    }
    this._activeIndex = this.findNextEnabledIndex(0, 1);
  }

  moveActiveIndex(direction) {
    const items = this.displayedItems;
    if (!items.length) {
      this._activeIndex = -1;
      return;
    }

    const start =
      this._activeIndex < 0
        ? direction > 0
          ? 0
          : items.length - 1
        : this._activeIndex + direction;
    this._activeIndex = this.findNextEnabledIndex(start, direction);
    this.scrollActiveIntoView();
  }

  findNextEnabledIndex(start, direction) {
    const items = this.displayedItems;
    if (!items.length) return -1;

    let index = start;
    for (let count = 0; count < items.length; count += 1) {
      if (index < 0) index = items.length - 1;
      if (index >= items.length) index = 0;
      if (!items[index].disabled) {
        return index;
      }
      index += direction;
    }
    return -1;
  }

  scrollActiveIntoView() {
    const optionId = this.activeOptionId;
    if (!optionId) return;
    Promise.resolve().then(() => {
      const option = this.template.querySelector(`[id="${optionId}"]`);
      if (option?.scrollIntoView) {
        option.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }
}
