import { LightningElement, api } from "lwc";
import {
  DEFAULT_ICON_NAME,
  normalizeIconName,
  resolveIconContent
} from "./lucideIconPaths";

const SIZE_ALIASES = {
  "xx-small": "xs",
  "x-small": "sm",
  small: "md",
  medium: "lg",
  large: "xl",
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl"
};

const VALID_VARIANTS = new Set([
  "error",
  "warning",
  "success",
  "brand",
  "inverse"
]);
const VALID_BOXES = new Set(["input", "button", "option", "tile"]);
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export default class NewtonSelectorIcon extends LightningElement {
  @api name = "";
  @api size = "md";
  @api alternativeText = "";
  @api title = "";
  @api box = "";
  /** @type {'error'|'warning'|'success'|'brand'|'inverse'|undefined} */
  @api variant;

  _renderedIconContent;

  renderedCallback() {
    const svg = this.template.querySelector(".newton-selector-icon__svg");
    const iconContent = this.iconContent;
    if (svg && this._renderedIconContent !== iconContent) {
      this.replaceIconNodes(svg, iconContent);
      this._renderedIconContent = iconContent;
    }
  }

  replaceIconNodes(svg, iconContent) {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(
      `<svg xmlns="${SVG_NAMESPACE}">${iconContent}</svg>`,
      "image/svg+xml"
    );
    const nodes = Array.from(parsed.documentElement.childNodes).map((node) =>
      document.importNode(node, true)
    );

    svg.replaceChildren(...nodes);
  }

  get resolvedSize() {
    return SIZE_ALIASES[this.size] || "md";
  }

  get resolvedIconName() {
    return normalizeIconName(this.name || DEFAULT_ICON_NAME);
  }

  get iconContent() {
    return resolveIconContent(this.resolvedIconName);
  }

  get wrapperClass() {
    const cls = [
      "newton-selector-icon",
      `newton-selector-icon_size-${this.resolvedSize}`
    ];
    if (VALID_BOXES.has(this.box)) {
      cls.push(`newton-selector-icon_box-${this.box}`);
    }
    if (VALID_VARIANTS.has(this.variant)) {
      cls.push(`newton-selector-icon_variant-${this.variant}`);
    }
    return cls.join(" ");
  }

  get role() {
    return this.alternativeText ? "img" : null;
  }

  get ariaHidden() {
    return this.alternativeText ? null : "true";
  }
}
