import { createElement } from "lwc";
import NewtonSelectorFlowCpeResourceSelector from "c/newtonSelectorFlowCpeResourceSelector";

function mount(props = {}) {
  const el = createElement("c-newton-selector-flow-cpe-resource-selector", {
    is: NewtonSelectorFlowCpeResourceSelector
  });
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("c-newton-selector-flow-cpe-resource-selector", () => {
  beforeAll(() => {
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = function () {};
    }
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  // ── Rendering ───────────────────────────────────────────

  describe("rendering", () => {
    it("renders without throwing", () => {
      expect(() => mount({ name: "test", label: "Value" })).not.toThrow();
    });

    it("renders a lightning-input inside for the search field", () => {
      const el = mount({ name: "n", label: "Label" });
      const li = el.shadowRoot.querySelector("lightning-input");
      expect(li).not.toBeNull();
    });

    it("renders a visible label by default (variant=standard)", () => {
      const el = mount({ label: "Value" });
      const lbl = el.shadowRoot.querySelector("label");
      expect(lbl).not.toBeNull();
      expect(lbl.className).toContain("slds-form-element__label");
      expect(lbl.className).not.toContain("slds-assistive-text");
    });

    it("applies slds-assistive-text when variant=label-hidden", () => {
      const el = mount({ label: "Value", variant: "label-hidden" });
      const lbl = el.shadowRoot.querySelector("label");
      expect(lbl).not.toBeNull();
      expect(lbl.className).toContain("slds-assistive-text");
    });

    it("applies max-width style when maxWidth is set", () => {
      const el = mount({ maxWidth: 280 });
      const wrapper = el.shadowRoot.querySelector("div[style]");
      expect(wrapper).not.toBeNull();
      expect(wrapper.getAttribute("style")).toContain("max-width: 280px");
    });

    it("does not apply a style attribute when maxWidth is not set", () => {
      const el = mount({});
      const wrapper = el.shadowRoot.querySelector("div");
      // Top-level wrapper: style is either missing or empty
      const style = wrapper.getAttribute("style");
      expect(style == null || style === "").toBe(true);
    });
  });

  // ── Value setter: reference detection ───────────────────

  describe("value setter", () => {
    it("treats a {!...} value as a reference and strips the wrapping", () => {
      const el = mount({});
      el.value = "{!myVar}";
      expect(el.value).toBe("myVar");
      expect(el.valueType).toBe("reference");
    });

    it("treats a plain literal as a string value", () => {
      const el = mount({});
      el.value = "hello world";
      expect(el.value).toBe("hello world");
      // _dataType unchanged when not a reference (starts as default/undefined)
    });

    it("detects dotted reference paths", () => {
      const el = mount({});
      el.value = "{!Account.Name}";
      expect(el.value).toBe("Account.Name");
      expect(el.valueType).toBe("reference");
    });

    it("does NOT treat non-wrapped merge-like text as a reference", () => {
      const el = mount({});
      el.value = "{!incomplete";
      expect(el.value).toBe("{!incomplete");
    });

    it("handles empty string without crashing", () => {
      const el = mount({});
      expect(() => {
        el.value = "";
      }).not.toThrow();
      expect(el.value).toBe("");
    });

    it("handles null without crashing", () => {
      const el = mount({});
      expect(() => {
        el.value = null;
      }).not.toThrow();
    });

    it("round-trips reassigning the same reference", () => {
      const el = mount({});
      el.value = "{!myVar}";
      el.value = "{!myVar}";
      expect(el.value).toBe("myVar");
    });

    it("switches from reference to literal correctly", () => {
      const el = mount({});
      el.value = "{!ref}";
      expect(el.valueType).toBe("reference");
      el.value = "now a literal";
      expect(el.value).toBe("now a literal");
    });
  });

  // ── valueType setter ────────────────────────────────────

  describe("valueType setter", () => {
    it("stores the first-assigned dataType", () => {
      const el = mount({});
      el.valueType = "reference";
      expect(el.valueType).toBe("reference");
    });

    it("defaults to String when given a falsy value and no prior type", () => {
      const el = mount({});
      el.valueType = "";
      expect(el.valueType).toBe("String");
    });

    it("does not overwrite an existing non-empty dataType", () => {
      const el = mount({});
      el.valueType = "reference";
      el.valueType = "String"; // should be ignored per setter guard
      expect(el.valueType).toBe("reference");
    });
  });

  // ── allowHardCodeReference ──────────────────────────────

  describe("allowHardCodeReference", () => {
    it("defaults to false", () => {
      const el = mount({});
      expect(el.allowHardCodeReference).toBeFalsy();
    });

    it("sets placeholderText when enabled", async () => {
      const el = mount({});
      el.allowHardCodeReference = true;
      await flush();
      const li = el.shadowRoot.querySelector("lightning-input");
      expect(li).not.toBeNull();
      expect(li.placeholder).toMatch(/merge field|literal/i);
    });

    it("clears placeholderText when disabled", async () => {
      const el = mount({ allowHardCodeReference: true });
      el.allowHardCodeReference = false;
      await flush();
      const li = el.shadowRoot.querySelector("lightning-input");
      expect(li.placeholder === "" || li.placeholder == null).toBe(true);
    });

    it("persists the setting across reads", () => {
      const el = mount({});
      el.allowHardCodeReference = true;
      expect(el.allowHardCodeReference).toBe(true);
    });
  });

  // ── displayPill (internal state influence) ──────────────

  describe("displayPill behavior", () => {
    it("switches to pill mode when value is a reference", async () => {
      const el = mount({});
      el.value = "{!myVar}";
      await flush();
      const pill = el.shadowRoot.querySelector("lightning-pill");
      expect(pill).not.toBeNull();
    });

    it("stays in input mode for plain literal values", async () => {
      const el = mount({});
      el.value = "plain literal";
      await flush();
      const pill = el.shadowRoot.querySelector("lightning-pill");
      expect(pill).toBeNull();
    });

    it("returns to input mode after reset via resetData", async () => {
      const el = mount({});
      el.value = "{!myVar}";
      await flush();
      expect(el.shadowRoot.querySelector("lightning-pill")).not.toBeNull();
      // pill remove dispatches 'remove' → calls resetData
      const pill = el.shadowRoot.querySelector("lightning-pill");
      pill.dispatchEvent(new CustomEvent("remove"));
      await flush();
      expect(el.shadowRoot.querySelector("lightning-pill")).toBeNull();
    });
  });

  // ── valuechanged event ──────────────────────────────────

  describe("valuechanged event", () => {
    it("fires valuechanged when pill is removed (reset flow)", async () => {
      const el = mount({ name: "myField" });
      el.value = "{!someVar}";
      await flush();
      const handler = jest.fn();
      el.addEventListener("valuechanged", handler);
      const pill = el.shadowRoot.querySelector("lightning-pill");
      pill.dispatchEvent(new CustomEvent("remove"));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual(
        expect.objectContaining({ id: "myField", newValue: "" })
      );
    });

    it("detail carries id=name, newValue=current value, newValueDataType", async () => {
      const el = mount({ name: "f1" });
      el.value = "{!ref}";
      await flush();
      const handler = jest.fn();
      el.addEventListener("valuechanged", handler);
      const pill = el.shadowRoot.querySelector("lightning-pill");
      pill.dispatchEvent(new CustomEvent("remove"));
      const d = handler.mock.calls[0][0].detail;
      expect(d.id).toBe("f1");
      expect(d).toHaveProperty("newValue");
      expect(d).toHaveProperty("newValueDataType");
    });
  });

  // ── reportValidity ──────────────────────────────────────

  describe("reportValidity", () => {
    it("returns true by default (no error)", () => {
      const el = mount({});
      expect(el.reportValidity()).toBe(true);
    });

    it("returns true after a literal value is set", () => {
      const el = mount({});
      el.value = "safe literal";
      expect(el.reportValidity()).toBe(true);
    });

    it("returns true for a valid reference with allowHardCodeReference", () => {
      const el = mount({ allowHardCodeReference: true });
      el.value = "{!someRef}";
      expect(el.reportValidity()).toBe(true);
    });
  });

  // ── disabled state ──────────────────────────────────────

  describe("disabled prop", () => {
    it("passes disabled through to lightning-input", async () => {
      const el = mount({ disabled: true });
      await flush();
      const li = el.shadowRoot.querySelector("lightning-input");
      expect(li).not.toBeNull();
      expect(li.disabled).toBe(true);
    });

    it("is not disabled by default", async () => {
      const el = mount({});
      await flush();
      const li = el.shadowRoot.querySelector("lightning-input");
      expect(li.disabled).toBeFalsy();
    });
  });

  // ── required state ──────────────────────────────────────

  describe("required prop", () => {
    it("passes required through to lightning-input", async () => {
      const el = mount({ required: true });
      await flush();
      const li = el.shadowRoot.querySelector("lightning-input");
      expect(li.required).toBe(true);
    });

    it("is not required by default", async () => {
      const el = mount({});
      await flush();
      const li = el.shadowRoot.querySelector("lightning-input");
      expect(li.required).toBeFalsy();
    });
  });

  // ── formElementClass — error styling ────────────────────

  describe("formElementClass / error styling", () => {
    it("does not include slds-has-error by default", () => {
      const el = mount({});
      const control = el.shadowRoot.querySelector(".slds-form-element");
      expect(control).not.toBeNull();
      expect(control.className).not.toContain("slds-has-error");
    });
  });

  // ── label prop ──────────────────────────────────────────

  describe("label prop", () => {
    it("renders the label text", async () => {
      const el = mount({ label: "My Label" });
      await flush();
      const lbl = el.shadowRoot.querySelector("label");
      expect(lbl.textContent.trim()).toBe("My Label");
    });

    it("renders an assistive label when variant=label-hidden", async () => {
      const el = mount({ label: "Hidden Label", variant: "label-hidden" });
      await flush();
      const lbl = el.shadowRoot.querySelector("label.slds-assistive-text");
      expect(lbl).not.toBeNull();
      expect(lbl.textContent.trim()).toBe("Hidden Label");
    });
  });

  // ── fieldLevelHelp ──────────────────────────────────────

  describe("fieldLevelHelp", () => {
    it("renders help text below the label when provided", async () => {
      const el = mount({ fieldLevelHelp: "This is help." });
      await flush();
      const help = el.shadowRoot.querySelector(".slds-form-element__help");
      expect(help).not.toBeNull();
      expect(help.textContent.trim()).toBe("This is help.");
    });

    it("does not render help text when fieldLevelHelp is empty", async () => {
      const el = mount({});
      await flush();
      expect(
        el.shadowRoot.querySelector(".slds-form-element__help")
      ).toBeNull();
    });
  });

  // ── Pill label echoes stripped reference path ───────────

  describe("pill label", () => {
    it("shows the reference path as the pill's label", async () => {
      const el = mount({});
      el.value = "{!Account.Name}";
      await flush();
      const pill = el.shadowRoot.querySelector("lightning-pill");
      expect(pill).not.toBeNull();
      expect(pill.label).toBe("Account.Name");
    });
  });

  // ── Disconnect cleanup ──────────────────────────────────

  describe("disconnect cleanup", () => {
    it("does not throw when removed from the DOM", () => {
      const el = mount({});
      el.value = "{!ref}";
      expect(() => document.body.removeChild(el)).not.toThrow();
    });

    it("removes the exact document listeners it registered", () => {
      const addSpy = jest.spyOn(document, "addEventListener");
      const removeSpy = jest.spyOn(document, "removeEventListener");
      const el = mount({});

      const clickAdd = addSpy.mock.calls.find(([type]) => type === "click");
      const blurAdd = addSpy.mock.calls.find(([type]) => type === "blur");
      expect(clickAdd).toBeTruthy();
      expect(blurAdd).toBeTruthy();

      document.body.removeChild(el);

      expect(removeSpy).toHaveBeenCalledWith("click", clickAdd[1]);
      expect(removeSpy).toHaveBeenCalledWith("blur", blurAdd[1]);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  // ── Multiple instances isolation ────────────────────────

  describe("instance isolation", () => {
    it("two instances track their own values independently", () => {
      const a = mount({ name: "A" });
      const b = mount({ name: "B" });
      a.value = "{!refA}";
      b.value = "literalB";
      expect(a.value).toBe("refA");
      expect(b.value).toBe("literalB");
      expect(a.valueType).toBe("reference");
    });
  });

  // ── Autocomplete prop ──────────────────────────────────

  describe("autocomplete prop", () => {
    it('defaults to "off"', async () => {
      const el = mount({});
      await flush();
      const li = el.shadowRoot.querySelector("lightning-input");
      expect(li.autocomplete).toBe("off");
    });

    it("can be overridden", async () => {
      const el = mount({ autocomplete: "on" });
      await flush();
      const li = el.shadowRoot.querySelector("lightning-input");
      expect(li.autocomplete).toBe("on");
    });
  });
});
