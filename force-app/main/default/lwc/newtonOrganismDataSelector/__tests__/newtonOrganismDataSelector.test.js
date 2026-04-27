import { createElement } from "lwc";
import NewtonOrganismDataSelector from "c/newtonOrganismDataSelector";
import { MANUAL_INPUT_VALUE } from "c/newtonUtilitySelectorDataSources";

function mount(overrides = {}) {
  const el = createElement("c-newton-organism-data-selector", {
    is: NewtonOrganismDataSelector
  });
  Object.assign(el, {
    sourceType: "custom",
    layout: "grid",
    selectionMode: "single",
    required: false,
    ...overrides
  });
  document.body.appendChild(el);
  return el;
}

describe("c-newton-organism-data-selector", () => {
  afterEach(() => {
    while (document.body.firstChild)
      document.body.removeChild(document.body.firstChild);
  });

  it("renders custom items in grid layout", async () => {
    const el = mount({
      customConfig: {
        items: [
          { label: "One", value: "1" },
          { label: "Two", value: "2" }
        ]
      }
    });
    await Promise.resolve();
    await Promise.resolve();
    const group = el.shadowRoot.querySelector(
      "c-newton-molecule-selector-group"
    );
    expect(group).not.toBeNull();
    expect(group.items).toHaveLength(2);
  });

  it("uses standard field label styling instead of the fieldset legend variant", async () => {
    const el = mount({
      label: "Picker",
      customConfig: {
        items: [{ label: "One", value: "1" }]
      }
    });
    await Promise.resolve();
    await Promise.resolve();

    const label = el.shadowRoot.querySelector(".newton-organism__label");
    expect(label).not.toBeNull();
    expect(label.classList.contains("slds-form-element__label")).toBe(true);
    expect(label.classList.contains("slds-form-element__legend")).toBe(false);
  });

  it("hides custom items and overridden source items marked hidden", async () => {
    const el = mount({
      customConfig: {
        items: [
          { label: "One", value: "1" },
          { label: "Two", value: "2", hidden: true },
          { label: "Three", value: "3" }
        ]
      },
      overrides: {
        3: { hidden: true }
      }
    });
    await Promise.resolve();
    await Promise.resolve();

    const group = el.shadowRoot.querySelector(
      "c-newton-molecule-selector-group"
    );
    expect(group.items.map((item) => item.value)).toEqual(["1"]);
  });

  it("shows empty state when no items and not previewing", async () => {
    const el = mount({ customConfig: { items: [] } });
    await Promise.resolve();
    await Promise.resolve();
    const empty = el.shadowRoot.querySelector(".newton-state_empty");
    expect(empty).not.toBeNull();
  });

  it("validate() returns isValid=false when required but nothing selected", async () => {
    const el = mount({
      required: true,
      customConfig: { items: [{ label: "A", value: "a" }] }
    });
    await Promise.resolve();
    const result = el.validate();
    expect(result.isValid).toBe(false);
  });

  it("validate() returns isValid=true when required and single value is set", async () => {
    const el = mount({
      required: true,
      customConfig: { items: [{ label: "A", value: "a" }] }
    });
    el.value = "a";
    await Promise.resolve();
    const result = el.validate();
    expect(result.isValid).toBe(true);
  });

  it("validate() enforces minSelections for multi-select", async () => {
    const el = mount({
      selectionMode: "multi",
      minSelections: 2,
      customConfig: {
        items: [
          { label: "A", value: "a" },
          { label: "B", value: "b" }
        ]
      }
    });
    el.values = ["a"];
    await Promise.resolve();
    const result = el.validate();
    expect(result.isValid).toBe(false);
  });

  it("validate() always passes in preview mode", async () => {
    const el = mount({ required: true, previewMode: true });
    await Promise.resolve();
    expect(el.validate().isValid).toBe(true);
  });

  it("preselects sample values in preview mode so selected-state styling is visible", async () => {
    const el = mount({
      previewMode: true,
      customConfig: {
        items: [
          { label: "None-like", value: "" },
          { label: "A", value: "a" },
          { label: "B", value: "b" }
        ]
      }
    });
    await Promise.resolve();
    await Promise.resolve();

    const group = el.shadowRoot.querySelector(
      "c-newton-molecule-selector-group"
    );
    expect(group.selectedValues).toEqual(["a"]);
  });

  it("preselects multiple sample values in multi-select preview mode", async () => {
    const el = mount({
      previewMode: true,
      selectionMode: "multi",
      maxSelections: 1,
      customConfig: {
        items: [
          { label: "A", value: "a" },
          { label: "B", value: "b" }
        ]
      }
    });
    await Promise.resolve();
    await Promise.resolve();

    const group = el.shadowRoot.querySelector(
      "c-newton-molecule-selector-group"
    );
    expect(group.selectedValues).toEqual(["a"]);
  });

  it("rebuilds preview items when none option settings change after data loads", async () => {
    const el = mount({
      previewMode: true,
      includeNoneOption: true,
      noneOptionLabel: "No choice",
      noneOptionPosition: "start",
      customConfig: {
        items: [
          { label: "A", value: "a" },
          { label: "B", value: "b" }
        ]
      }
    });
    await Promise.resolve();
    await Promise.resolve();

    let group = el.shadowRoot.querySelector("c-newton-molecule-selector-group");
    expect(group.items.map((item) => item.label)).toEqual([
      "No choice",
      "A",
      "B"
    ]);

    el.noneOptionPosition = "end";
    await Promise.resolve();
    await Promise.resolve();

    group = el.shadowRoot.querySelector("c-newton-molecule-selector-group");
    expect(group.items.map((item) => item.label)).toEqual([
      "A",
      "B",
      "No choice"
    ]);

    el.noneOptionLabel = "Skip";
    await Promise.resolve();
    await Promise.resolve();

    group = el.shadowRoot.querySelector("c-newton-molecule-selector-group");
    expect(group.items.map((item) => item.label)).toEqual(["A", "B", "Skip"]);
  });

  it("adds the none option in multi-select mode and clears selected values when picked", async () => {
    const el = mount({
      selectionMode: "multi",
      values: ["a"],
      includeNoneOption: true,
      noneOptionLabel: "No choice",
      customConfig: {
        items: [
          { label: "A", value: "a" },
          { label: "B", value: "b" }
        ]
      }
    });
    const handler = jest.fn();
    el.addEventListener("valuechange", handler);
    await Promise.resolve();
    await Promise.resolve();

    const group = el.shadowRoot.querySelector(
      "c-newton-molecule-selector-group"
    );
    expect(group.items.map((item) => item.label)).toEqual([
      "No choice",
      "A",
      "B"
    ]);

    group.dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: {
          values: [""],
          items: [group.items[0]]
        },
        bubbles: true
      })
    );

    expect(handler.mock.calls[0][0].detail.values).toEqual([]);
    expect(handler.mock.calls[0][0].detail.records).toEqual([]);
  });

  it("returns manual input text through the value output", async () => {
    const el = mount({
      allowManualInput: true,
      manualInputLabel: "Other",
      manualInputMinLength: 3,
      customConfig: {
        items: [{ label: "A", value: "a" }]
      }
    });
    const handler = jest.fn();
    el.addEventListener("valuechange", handler);
    await Promise.resolve();
    await Promise.resolve();

    const group = el.shadowRoot.querySelector(
      "c-newton-molecule-selector-group"
    );
    expect(group.items.map((item) => item.value)).toEqual([
      "a",
      MANUAL_INPUT_VALUE
    ]);

    group.dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: {
          values: [MANUAL_INPUT_VALUE],
          items: [group.items[1]],
          manualValue: "Manual answer"
        },
        bubbles: true
      })
    );

    expect(handler.mock.calls[0][0].detail.value).toBe("Manual answer");
    expect(handler.mock.calls[0][0].detail.label).toBe("Manual answer");
    expect(el.validate().isValid).toBe(true);
  });

  it("validates manual input character limits", async () => {
    const el = mount({
      allowManualInput: true,
      manualInputMinLength: 3,
      manualInputMaxLength: 6,
      customConfig: {
        items: [{ label: "A", value: "a" }]
      }
    });
    await Promise.resolve();
    await Promise.resolve();

    const group = el.shadowRoot.querySelector(
      "c-newton-molecule-selector-group"
    );
    group.dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: {
          values: [MANUAL_INPUT_VALUE],
          items: [group.items[1]],
          manualValue: "No"
        },
        bubbles: true
      })
    );
    expect(el.validate()).toEqual(expect.objectContaining({ isValid: false }));
  });

  it("updates the preview search bar when enableSearch changes after render", async () => {
    const el = mount({
      previewMode: true,
      enableSearch: false,
      customConfig: {
        items: [
          { label: "A", value: "a" },
          { label: "B", value: "b" }
        ]
      }
    });
    await Promise.resolve();
    await Promise.resolve();

    let group = el.shadowRoot.querySelector("c-newton-molecule-selector-group");
    expect(group.enableSearch).toBe(false);
    expect(group.shadowRoot.querySelector(".newton-search-bar")).toBeNull();

    el.enableSearch = true;
    await Promise.resolve();
    await Promise.resolve();

    group = el.shadowRoot.querySelector("c-newton-molecule-selector-group");
    expect(group.enableSearch).toBe(true);
    expect(group.shadowRoot.querySelector(".newton-search-bar")).not.toBeNull();
  });
});
