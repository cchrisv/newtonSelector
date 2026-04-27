import { LightningElement, api } from "lwc";
import { buildTokens } from "c/newtonSelectorFlowCpeUtilitySearchHighlight";

const DEFAULT_PRESENTATION = Object.freeze({
  icon: "circle-question-mark",
  iconTone: "neutral",
  badgeVariant: "neutral"
});

const TYPE_PRESENTATION = Object.freeze({
  actioncalls: {
    icon: "workflow",
    iconTone: "warning",
    badgeVariant: "warning"
  },
  apex: { icon: "code-xml", iconTone: "violet", badgeVariant: "violet" },
  address: { icon: "map-pin", iconTone: "warning", badgeVariant: "warning" },
  boolean: {
    icon: "toggle-left",
    iconTone: "success",
    badgeVariant: "success"
  },
  currency: {
    icon: "badge-dollar-sign",
    iconTone: "success",
    badgeVariant: "success"
  },
  date: { icon: "calendar-days", iconTone: "teal", badgeVariant: "teal" },
  datetime: {
    icon: "calendar-clock",
    iconTone: "teal",
    badgeVariant: "teal"
  },
  double: { icon: "hash", iconTone: "violet", badgeVariant: "violet" },
  email: { icon: "mail", iconTone: "pink", badgeVariant: "pink" },
  int: { icon: "hash", iconTone: "violet", badgeVariant: "violet" },
  integer: { icon: "hash", iconTone: "violet", badgeVariant: "violet" },
  number: { icon: "hash", iconTone: "violet", badgeVariant: "violet" },
  percent: { icon: "hash", iconTone: "violet", badgeVariant: "violet" },
  phone: { icon: "phone", iconTone: "teal", badgeVariant: "teal" },
  picklist: { icon: "list-checks", iconTone: "teal", badgeVariant: "teal" },
  multipicklist: {
    icon: "list-checks",
    iconTone: "teal",
    badgeVariant: "teal"
  },
  reference: { icon: "braces", iconTone: "brand", badgeVariant: "brand" },
  screenaction: {
    icon: "workflow",
    iconTone: "warning",
    badgeVariant: "warning"
  },
  screencomponent: {
    icon: "screen-share",
    iconTone: "pink",
    badgeVariant: "pink"
  },
  sobject: { icon: "database", iconTone: "brand", badgeVariant: "brand" },
  string: {
    icon: "text-cursor-input",
    iconTone: "brand",
    badgeVariant: "brand"
  },
  textarea: { icon: "file-text", iconTone: "brand", badgeVariant: "brand" },
  time: { icon: "clock", iconTone: "teal", badgeVariant: "teal" },
  url: { icon: "link", iconTone: "violet", badgeVariant: "violet" }
});

const GLOBAL_PRESENTATION = Object.freeze({
  $flow: { icon: "workflow", iconTone: "brand", badgeVariant: "brand" },
  $profile: { icon: "settings", iconTone: "neutral", badgeVariant: "neutral" },
  $record: { icon: "database", iconTone: "brand", badgeVariant: "brand" },
  $record__prior: {
    icon: "database",
    iconTone: "warning",
    badgeVariant: "warning"
  },
  $system: { icon: "settings", iconTone: "violet", badgeVariant: "violet" },
  $user: { icon: "user-round", iconTone: "teal", badgeVariant: "teal" },
  $userrole: {
    icon: "building-2",
    iconTone: "teal",
    badgeVariant: "teal"
  }
});

function normalizeType(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export default class NewtonSelectorFlowCpeLookupChoiceOption extends LightningElement {
  /** @type {Record<string, unknown>} */
  @api row = {};

  /** @type {string} */
  @api searchTerm = "";

  /** @type {boolean} */
  @api selected = false;

  /** @type {boolean} */
  @api showChevron = false;

  get optionClass() {
    const base = "newton-visual-lookup-option";
    return this.selected
      ? `${base} newton-visual-lookup-option_selected`
      : base;
  }

  get normalizedRow() {
    return this.row && typeof this.row === "object" ? this.row : {};
  }

  get title() {
    const r = this.normalizedRow;
    const value = r.title || r.label || r.value || "";
    return String(value);
  }

  get subtitle() {
    const r = this.normalizedRow;
    const value = r.subtitle || r.displayType || "";
    return String(value);
  }

  get iconName() {
    return this.resourcePresentation.icon;
  }

  get badge() {
    const r = this.normalizedRow;
    const value = r.badge || r.sObjectType || "";
    return String(value);
  }

  get resourcePresentation() {
    const r = this.normalizedRow;
    if (r.globalVariable) {
      const globalPresentation = GLOBAL_PRESENTATION[normalizeType(r.value)];
      if (globalPresentation) return globalPresentation;
    }

    if (r.isCollection) {
      return {
        icon: r.isObject ? "table-properties" : "square-library",
        iconTone: "teal",
        badgeVariant: "teal"
      };
    }

    if (r.isObject || normalizeType(r.displayType) === "sobject") {
      return TYPE_PRESENTATION.sobject;
    }

    const type =
      TYPE_PRESENTATION[normalizeType(r.type)] ||
      TYPE_PRESENTATION[normalizeType(r.displayType)] ||
      DEFAULT_PRESENTATION;
    const isDefaultType = type === DEFAULT_PRESENTATION;

    return {
      ...type,
      icon: String(
        r.icon || (isDefaultType ? r.optionIcon : type.icon) || type.icon
      )
    };
  }

  get groupName() {
    return `newtonVisualLookup-${this.normalizedRow.groupName || "options"}`;
  }

  get visualItem() {
    const value = String(
      this.normalizedRow.value || this.normalizedRow.id || ""
    );
    return {
      id: String(this.normalizedRow.id || value || this.title),
      value,
      label: this.title,
      sublabel: this.subtitle,
      icon: this.iconName,
      iconDecor: "badge",
      iconStyle: "filled",
      iconShading: "gradient",
      iconTone: this.resourcePresentation.iconTone,
      iconGlyphTone: "contrast",
      badge: this.badge,
      badgeVariant: this.resourcePresentation.badgeVariant,
      disabled: Boolean(this.normalizedRow.disabled)
    };
  }

  get titleTokens() {
    return buildTokens(this.title, String(this.searchTerm || "").toLowerCase());
  }
}
