import { createElement } from "lwc";
import NewtonSelectorFlowCpeToggle from "c/newtonSelectorFlowCpeToggle";

function mount(props = {}) {
  const el = createElement("c-newton-selector-flow-cpe-toggle", {
    is: NewtonSelectorFlowCpeToggle
  });
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

function choice(el, checked) {
  return el.shadowRoot.querySelector(`button[data-checked="${checked}"]`);
}

describe("c-newton-selector-flow-cpe-toggle", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("renders a two-state selector with the provided label", () => {
    const el = mount({ label: "Show Border", name: "showBorder" });
    const group = el.shadowRoot.querySelector('[role="radiogroup"]');

    expect(group).not.toBeNull();
    expect(group.getAttribute("aria-label")).toBe("Show Border");
    expect(choice(el, "false").textContent).toContain("Off");
    expect(choice(el, "true").textContent).toContain("On");
  });

  describe("isChecked value coercion", () => {
    it("treats boolean true as checked", () => {
      expect(mount({ checked: true }).isChecked).toBe(true);
    });

    it("treats string 'true' as checked", () => {
      expect(mount({ checked: "true" }).isChecked).toBe(true);
    });

    it("treats the CB_TRUE sentinel as checked", () => {
      expect(mount({ checked: "CB_TRUE" }).isChecked).toBe(true);
    });

    it("treats false / undefined / empty / CB_FALSE as unchecked", () => {
      expect(mount({ checked: false }).isChecked).toBe(false);
      expect(mount({}).isChecked).toBe(false);
      expect(mount({ checked: "" }).isChecked).toBe(false);
      expect(mount({ checked: "CB_FALSE" }).isChecked).toBe(false);
    });
  });

  describe('wireFormat = "boolean" (default)', () => {
    it("fires toggle with {name, checked:true} when the input turns on", () => {
      const el = mount({ name: "enableThing" });
      const handler = jest.fn();
      el.addEventListener("toggle", handler);

      choice(el, "true").click();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        name: "enableThing",
        checked: true
      });
    });

    it("fires toggle with {name, checked:false} when the input turns off", () => {
      const el = mount({ name: "enableThing", checked: true });
      const handler = jest.fn();
      el.addEventListener("toggle", handler);

      choice(el, "false").click();

      expect(handler.mock.calls[0][0].detail).toEqual({
        name: "enableThing",
        checked: false
      });
    });
  });

  describe('wireFormat = "cb-sentinel" (legacy Flow CPE)', () => {
    it("fires toggle with CB_TRUE sentinel when the input turns on", () => {
      const el = mount({ name: "enableThing", wireFormat: "cb-sentinel" });
      const handler = jest.fn();
      el.addEventListener("toggle", handler);

      choice(el, "true").click();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        id: "enableThing",
        newValue: true,
        newValueDataType: "Boolean",
        newStringValue: "CB_TRUE"
      });
    });

    it("fires toggle with CB_FALSE sentinel when the input turns off", () => {
      const el = mount({
        name: "enableThing",
        checked: true,
        wireFormat: "cb-sentinel"
      });
      const handler = jest.fn();
      el.addEventListener("toggle", handler);

      choice(el, "false").click();

      expect(handler.mock.calls[0][0].detail.newStringValue).toBe("CB_FALSE");
    });
  });

  it("renders fieldLevelHelp as a help tooltip beside the visible label", () => {
    const help = "Toggle to enable the border";
    const el = mount({ label: "Show border", fieldLevelHelp: help });
    return Promise.resolve().then(() => {
      const helptext = el.shadowRoot.querySelector("lightning-helptext");
      expect(helptext).not.toBeNull();
      expect(helptext.content).toBe(help);
    });
  });

  it("respects the disabled prop", () => {
    const el = mount({ disabled: true });
    return Promise.resolve().then(() => {
      expect(choice(el, "false").disabled).toBe(true);
      expect(choice(el, "true").disabled).toBe(true);
    });
  });

  it("uses short active and inactive labels when provided", () => {
    const el = mount({
      label: "Required",
      activeLabel: "Required",
      inactiveLabel: "Optional"
    });

    expect(choice(el, "false").textContent).toContain("Optional");
    expect(choice(el, "true").textContent).toContain("Required");
  });

  it("does not fire duplicate events when the selected option is clicked", () => {
    const el = mount({ checked: true });
    const handler = jest.fn();
    el.addEventListener("toggle", handler);

    choice(el, "true").click();

    expect(handler).not.toHaveBeenCalled();
  });
});
