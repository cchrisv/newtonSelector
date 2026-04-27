import { LightningElement, api } from "lwc";

const MODE_SINGLE = "single";
const MODE_MULTI = "multi";

function toBoolean(value) {
  return value === true || value === "true" || value === "";
}

function normalizeValue(value) {
  return value === undefined || value === null ? "" : String(value);
}

export default class NewtonSelectorFlowCpeChoiceControl extends LightningElement {
  /** @type {Array<object>} Finite choice items with label/value/icon metadata. */
  @api items = [];
  /** @type {string} Field label shown above the visual choice control. */
  @api label = "";
  /** @type {string} Optional helper copy below the label. */
  @api description = "";
  /** @type {string} Optional lightning-helptext content. */
  @api fieldLevelHelp = "";
  /** @type {string} Optional event identity forwarded in valuechange detail. */
  @api name = "";
  /** @type {string} Selected value for single-select controls. */
  @api value = "";
  /** @type {Array<string>} Selected values for multi-select controls. */
  @api values = [];
  /** @type {'single'|'multi'} Selection mode. */
  @api selectionMode = MODE_SINGLE;
  /** @type {string} Visual selector group variant. */
  @api variant = "picklist";
  /** @type {string} Form label variant. Use label-hidden for dense rows. */
  @api formVariant = "";
  /** @type {boolean|string} Marks the control required for assistive tech. */
  @api required = false;
  /** @type {boolean|string} Prevents interaction through preview mode. */
  @api disabled = false;
  /** @type {boolean|string} Enables local filtering when supported by the group. */
  @api enableSearch = false;
  /** @type {boolean|string} Enables select-all toolbar in multi mode. */
  @api showSelectAll = false;
  /** @type {number|string} Minimum selected values. */
  @api minSelections = 0;
  /** @type {number|string} Maximum selected values. */
  @api maxSelections;
  /** @type {string} Tile size forwarded to the Newton selector group. */
  @api size = "small";
  /** @type {string} Tile aspect ratio forwarded to the Newton selector group. */
  @api aspectRatio = "1:1";
  /** @type {string} Icon size forwarded to the Newton selector group. */
  @api iconSize = "small";
  /** @type {string} Default icon used when finite choices are text-only. */
  @api defaultIcon = "circle";
  /** @type {string} Visual selected-state indicator. */
  @api selectionIndicator = "checkmark";
  /** @type {string} Visual elevation treatment. */
  @api elevation = "outlined";
  /** @type {string} Visual pattern treatment. */
  @api pattern = "none";
  /** @type {string} Visual surface style. */
  @api surfaceStyle = "solid";
  /** @type {string} Visual surface tone. */
  @api surfaceTone = "neutral";
  /** @type {string} Visual icon decorator treatment. */
  @api iconDecor = "square";
  /** @type {string} Visual icon surface treatment. */
  @api iconStyle = "soft";
  /** @type {string} Visual icon shading treatment. */
  @api iconShading = "flat";
  /** @type {string} Visual icon tone treatment. */
  @api iconTone = "brand";
  /** @type {string|undefined} Visual icon glyph tone override. */
  @api iconGlyphTone;
  /** @type {string} Badge position forwarded to visual tiles. */
  @api badgePosition = "bottom-inline";
  /** @type {string} Badge variant forwarded to visual tiles. */
  @api badgeVariant = "neutral";
  /** @type {string} Badge shape forwarded to visual tiles. */
  @api badgeShape = "pill";
  /** @type {boolean|string|undefined} Show or hide item icons. */
  @api showIcons;
  /** @type {boolean|string|undefined} Show or hide item badges. */
  @api showBadges;

  get hasLabel() {
    return Boolean(this.label);
  }

  get formElementClass() {
    return this.disabled
      ? "slds-form-element newton-studio-choice newton-studio-choice_disabled"
      : "slds-form-element newton-studio-choice";
  }

  get legendClass() {
    const base = "slds-form-element__legend slds-form-element__label";
    return this.formVariant === "label-hidden"
      ? `${base} slds-assistive-text`
      : base;
  }

  get isMulti() {
    return this.selectionMode === MODE_MULTI;
  }

  get selectedValues() {
    if (this.isMulti) {
      return Array.isArray(this.values)
        ? this.values.map((item) => normalizeValue(item))
        : [];
    }
    const value = normalizeValue(this.value);
    return value ? [value] : [];
  }

  get normalizedItems() {
    const selected = new Set(this.selectedValues);
    const controlDisabled = toBoolean(this.disabled);
    return (Array.isArray(this.items) ? this.items : []).map((item) => {
      const value = normalizeValue(item?.value);
      const disabled = controlDisabled || toBoolean(item?.disabled);
      return {
        ...item,
        id: item?.id || value,
        value,
        label: item?.label || value,
        icon: item?.icon || this.defaultIcon || "",
        _selected: selected.has(value),
        disabled,
        _disabled: disabled
      };
    });
  }

  handleSelectionChange(event) {
    event.stopPropagation();
    const values = Array.isArray(event.detail?.values)
      ? event.detail.values.map((item) => normalizeValue(item))
      : [];
    const value = this.isMulti ? values : values[0] || "";
    const item = this.normalizedItems.find((option) => option.value === value);
    this.dispatchEvent(
      new CustomEvent("valuechange", {
        detail: {
          name: this.name,
          value,
          values,
          item,
          items: event.detail?.items || []
        },
        bubbles: true,
        composed: false
      })
    );
  }
}
