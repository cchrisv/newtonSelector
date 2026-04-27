import { createElement } from "lwc";
import NewtonSelectorGroup from "c/newtonSelectorGroup";
import { MANUAL_INPUT_VALUE } from "c/newtonSelectorUtilityDataSources";

const ITEMS = [
  {
    id: "1",
    label: "Alpha",
    sublabel: "",
    icon: "",
    badge: "",
    helpText: "",
    value: "a",
    disabled: false
  },
  {
    id: "2",
    label: "Beta",
    sublabel: "",
    icon: "",
    badge: "",
    helpText: "",
    value: "b",
    disabled: false
  },
  {
    id: "3",
    label: "Gamma",
    sublabel: "",
    icon: "",
    badge: "",
    helpText: "",
    value: "c",
    disabled: false
  }
];

function mount(overrides = {}) {
  const el = createElement("c-newton-selector-group", {
    is: NewtonSelectorGroup
  });
  el.items = overrides.items || ITEMS;
  el.variant = overrides.variant || "grid";
  el.selectionMode = overrides.selectionMode || "single";
  el.selectedValues = overrides.selectedValues || [];
  el.minSelections = overrides.minSelections || 0;
  el.maxSelections = overrides.maxSelections;
  el.showSelectAll = overrides.showSelectAll || false;
  el.enableSearch = overrides.enableSearch || false;
  if ("manualInputLabel" in overrides) {
    el.manualInputLabel = overrides.manualInputLabel;
  }
  if ("manualInputMinLength" in overrides) {
    el.manualInputMinLength = overrides.manualInputMinLength;
  }
  if ("manualInputMaxLength" in overrides) {
    el.manualInputMaxLength = overrides.manualInputMaxLength;
  }
  if ("pattern" in overrides) el.pattern = overrides.pattern;
  if ("patternSelectedTone" in overrides) {
    el.patternSelectedTone = overrides.patternSelectedTone;
  }
  if ("surfaceHoverTone" in overrides) {
    el.surfaceHoverTone = overrides.surfaceHoverTone;
  }
  if ("surfaceSelectedToneHex" in overrides) {
    el.surfaceSelectedToneHex = overrides.surfaceSelectedToneHex;
  }
  if ("iconDecor" in overrides) el.iconDecor = overrides.iconDecor;
  if ("iconStyle" in overrides) el.iconStyle = overrides.iconStyle;
  if ("selectionIndicator" in overrides) {
    el.selectionIndicator = overrides.selectionIndicator;
  }
  if ("manualInputLabel" in overrides) {
    el.manualInputLabel = overrides.manualInputLabel;
  }
  if ("manualInputMinLength" in overrides) {
    el.manualInputMinLength = overrides.manualInputMinLength;
  }
  if ("manualInputMaxLength" in overrides) {
    el.manualInputMaxLength = overrides.manualInputMaxLength;
  }
  document.body.appendChild(el);
  return el;
}

function dispatchCardSelect(hostEl, value) {
  const card = hostEl.shadowRoot.querySelector("c-newton-selector-choice-tile");
  dispatchCardSelectFrom(card, value);
}

function dispatchCardSelectFrom(card, value) {
  card.dispatchEvent(
    new CustomEvent("cardselect", {
      detail: { value },
      bubbles: true
    })
  );
}

describe("c-newton-selector-group", () => {
  afterEach(() => {
    while (document.body.firstChild)
      document.body.removeChild(document.body.firstChild);
  });

  it("renders one tile per item", async () => {
    const el = mount();
    await Promise.resolve();
    const cards = el.shadowRoot.querySelectorAll(
      "c-newton-selector-choice-tile"
    );
    expect(cards).toHaveLength(3);
  });

  it("emits selectionchange with a single value in single-select mode", async () => {
    const el = mount();
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();
    dispatchCardSelect(el, "b");
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.values).toEqual(["b"]);
  });

  it("toggles values in multi-select mode", async () => {
    const el = mount({ selectionMode: "multi" });
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();
    dispatchCardSelect(el, "a");
    dispatchCardSelect(el, "b");
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[1][0].detail.values).toEqual(["a", "b"]);
    dispatchCardSelect(el, "a");
    expect(handler.mock.calls[2][0].detail.values).toEqual(["b"]);
  });

  it("respects maxSelections", async () => {
    const el = mount({ selectionMode: "multi", maxSelections: 1 });
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();
    dispatchCardSelect(el, "a");
    dispatchCardSelect(el, "b");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.values).toEqual(["a"]);
  });

  it("shows Select all / Clear all toolbar in multi with showSelectAll", async () => {
    const el = mount({ selectionMode: "multi", showSelectAll: true });
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();
    const buttons = el.shadowRoot.querySelectorAll(".newton-toolbar__btn");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    buttons[0].click();
    await Promise.resolve();
    expect(handler.mock.calls[0][0].detail.values).toEqual(["a", "b", "c"]);

    buttons[1].click();
    await Promise.resolve();
    expect(handler.mock.calls[1][0].detail.values).toEqual([]);
  });

  it("does not render selected-count helper text in multi layouts", async () => {
    const el = mount({
      selectionMode: "multi",
      selectedValues: ["a", "b"],
      showSelectAll: true
    });
    await Promise.resolve();

    expect(el.shadowRoot.querySelector(".newton-toolbar__counter")).toBeNull();
    expect(el.shadowRoot.textContent).not.toContain("selected");
  });

  it("does not render a toolbar when only the selected-count helper would show", async () => {
    const el = mount({
      selectionMode: "multi",
      selectedValues: ["a", "b"]
    });
    await Promise.resolve();

    expect(el.shadowRoot.querySelector(".newton-toolbar")).toBeNull();
  });

  it("applies Select all / Clear all toolbar to the Salesforce-style multi-select layout", async () => {
    const el = mount({
      variant: "dualListbox",
      selectionMode: "multi",
      selectedValues: ["b"],
      showSelectAll: true
    });
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();

    const buttons = el.shadowRoot.querySelectorAll(".newton-toolbar__btn");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    buttons[0].click();
    await Promise.resolve();
    expect(handler.mock.calls[0][0].detail.values).toEqual(["a", "b", "c"]);

    buttons[1].click();
    await Promise.resolve();
    expect(handler.mock.calls[1][0].detail.values).toEqual([]);
  });

  it("ignores events in preview mode", async () => {
    const el = mount();
    el.previewMode = true;
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();
    dispatchCardSelect(el, "b");
    expect(handler).not.toHaveBeenCalled();
  });

  it("renders picklist options as customizable cards", async () => {
    const el = mount({
      variant: "picklist",
      selectedValues: ["b"],
      pattern: "dots",
      patternSelectedTone: "pink",
      surfaceHoverTone: "teal",
      surfaceSelectedToneHex: "#123456",
      iconDecor: "ring"
    });
    await Promise.resolve();

    const trigger = el.shadowRoot.querySelector(
      ".newton-picklist__combobox .slds-combobox__form-element"
    );
    expect(trigger).not.toBeNull();
    expect(trigger.querySelector("c-newton-selector-choice-tile")).toBeNull();
    expect(el.shadowRoot.querySelector(".slds-combobox__input").value).toBe(
      "Beta"
    );
    trigger.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true })
    );
    await Promise.resolve();

    const cards = el.shadowRoot.querySelectorAll(
      ".newton-picklist__menu c-newton-selector-choice-tile"
    );
    expect(cards).toHaveLength(3);
    expect(cards[0].variant).toBe("list");
    expect(cards[0].pattern).toBe("dots");
    expect(cards[0].patternSelectedTone).toBe("pink");
    expect(cards[0].surfaceHoverTone).toBe("teal");
    expect(cards[0].surfaceSelectedToneHex).toBe("#123456");
    expect(cards[0].iconDecor).toBe("ring");
    expect(cards[0].selectionMode).toBe("single");
  });

  it("uses native SLDS combobox input classes for the closed picklist trigger", async () => {
    const el = mount({
      variant: "picklist"
    });
    await Promise.resolve();

    const trigger = el.shadowRoot.querySelector(
      ".newton-picklist__combobox .slds-combobox__form-element"
    );
    const input = el.shadowRoot.querySelector(".slds-combobox__input");

    expect(trigger.classList.contains("slds-input-has-icon_right")).toBe(true);
    expect(trigger.classList.contains("slds-input-has-icon_left-right")).toBe(
      false
    );
    expect(input.classList.contains("slds-input")).toBe(true);
    expect(input.classList.contains("slds-combobox__input")).toBe(true);
    expect(input.classList.contains("newton-picklist__input-value")).toBe(
      false
    );
  });

  it("uses native SLDS entity input classes when the selected picklist option has an icon", async () => {
    const el = mount({
      variant: "picklist",
      selectedValues: ["b"],
      items: ITEMS.map((item) => {
        return item.value === "b" ? { ...item, icon: "account" } : item;
      })
    });
    await Promise.resolve();

    const trigger = el.shadowRoot.querySelector(
      ".newton-picklist__combobox .slds-combobox__form-element"
    );
    const input = el.shadowRoot.querySelector(".slds-combobox__input");

    expect(trigger.classList.contains("slds-input-has-icon_left-right")).toBe(
      true
    );
    expect(input.classList.contains("slds-combobox__input-value")).toBe(true);
    expect(input.classList.contains("newton-picklist__input-value")).toBe(
      false
    );
  });

  it("keeps multiselect picklist open and toggles card options", async () => {
    const el = mount({
      variant: "picklist",
      selectionMode: "multi",
      selectedValues: ["a"],
      enableSearch: true
    });
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();

    el.shadowRoot
      .querySelector(".newton-picklist__combobox .slds-combobox__form-element")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();

    expect(el.shadowRoot.querySelector(".newton-search-bar")).toBeNull();
    expect(
      el.shadowRoot.querySelector(".newton-picklist__search")
    ).not.toBeNull();
    const cards = el.shadowRoot.querySelectorAll(
      ".newton-picklist__menu c-newton-selector-choice-tile"
    );
    expect(cards[0].selectionMode).toBe("multi");
    dispatchCardSelectFrom(cards[1], "b");
    await Promise.resolve();

    expect(handler.mock.calls[0][0].detail.values).toEqual(["a", "b"]);
    expect(
      el.shadowRoot.querySelector(".newton-picklist__menu")
    ).not.toBeNull();
  });

  it("renders radio as card-backed radio rows", async () => {
    const el = mount({
      variant: "radio",
      selectedValues: ["a"],
      selectionIndicator: "frame"
    });
    await Promise.resolve();

    expect(el.shadowRoot.querySelector(".newton-group_radio")).not.toBeNull();
    expect(el.shadowRoot.querySelectorAll(".newton-radio-card")).toHaveLength(
      3
    );
    const card = el.shadowRoot.querySelector("c-newton-selector-choice-tile");
    expect(card.variant).toBe("list");
    expect(card.selectionMode).toBe("single");
    expect(card.selectionIndicator).toBe("frame");
  });

  it("renders radio layout with checkbox affordances in multiselect mode", async () => {
    const el = mount({
      variant: "radio",
      selectionMode: "multi",
      selectedValues: ["a", "b"]
    });
    await Promise.resolve();

    expect(
      el.shadowRoot.querySelectorAll(".newton-radio-card_multi")
    ).toHaveLength(3);
    const card = el.shadowRoot.querySelector("c-newton-selector-choice-tile");
    expect(card.selectionMode).toBe("multi");
  });

  it("renders drag/drop columns with available and selected card panels", async () => {
    const el = mount({
      variant: "columns",
      selectionMode: "multi",
      selectedValues: ["b"]
    });
    await Promise.resolve();

    expect(
      el.shadowRoot.querySelector(".newton-transfer_columns")
    ).not.toBeNull();
    const available = el.shadowRoot.querySelector(
      'section[aria-label="Available card column"]'
    );
    const selected = el.shadowRoot.querySelector(
      'section[aria-label="Selected card column"]'
    );
    expect(
      available.querySelectorAll("c-newton-selector-choice-tile")
    ).toHaveLength(2);
    expect(
      selected.querySelector("c-newton-selector-choice-tile").item.value
    ).toBe("b");
  });

  it("moves cards with controls in the Salesforce-style multi-select layout", async () => {
    const el = mount({
      variant: "dualListbox",
      selectionMode: "multi",
      selectedValues: ["b"]
    });
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();

    const available = el.shadowRoot.querySelector(
      'section[aria-label="Available options"]'
    );
    const selected = el.shadowRoot.querySelector(
      'section[aria-label="Chosen options"]'
    );

    dispatchCardSelectFrom(
      available.querySelector("c-newton-selector-choice-tile"),
      "a"
    );
    await Promise.resolve();
    el.shadowRoot.querySelector('[title="Move selected to chosen"]').click();
    await Promise.resolve();
    expect(handler.mock.calls[0][0].detail.values).toEqual(["b", "a"]);

    dispatchCardSelectFrom(
      selected.querySelector("c-newton-selector-choice-tile"),
      "b"
    );
    await Promise.resolve();
    el.shadowRoot.querySelector('[title="Remove selected"]').click();
    await Promise.resolve();
    expect(handler.mock.calls[1][0].detail.values).toEqual(["a"]);
  });

  it("supports single-select transfer layouts without forcing multiselect", async () => {
    const el = mount({
      variant: "columns",
      selectionMode: "single",
      selectedValues: ["b"]
    });
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();

    const available = el.shadowRoot.querySelector(
      'section[aria-label="Available card column"]'
    );
    dispatchCardSelectFrom(
      available.querySelector("c-newton-selector-choice-tile"),
      "a"
    );
    expect(handler.mock.calls[0][0].detail.values).toEqual(["a"]);
  });

  it("filters transfer layouts from the available panel", async () => {
    const el = mount({
      variant: "dualListbox",
      selectionMode: "multi",
      enableSearch: true
    });
    await Promise.resolve();

    expect(el.shadowRoot.querySelector(".newton-search-bar")).toBeNull();
    const search = el.shadowRoot.querySelector(
      ".newton-transfer__search input"
    );
    search.value = "Gamma";
    search.dispatchEvent(new CustomEvent("input", { bubbles: true }));
    await Promise.resolve();

    const available = el.shadowRoot.querySelector(
      'section[aria-label="Available options"]'
    );
    expect(
      available.querySelectorAll("c-newton-selector-choice-tile")
    ).toHaveLength(1);
    expect(
      available.querySelector("c-newton-selector-choice-tile").item.value
    ).toBe("c");
  });

  it("treats the none option as a clear action in every layout", async () => {
    const noneItem = {
      id: "__none__",
      label: "None",
      value: "",
      disabled: false
    };
    const el = mount({
      variant: "grid",
      selectionMode: "multi",
      selectedValues: ["a", "b"],
      items: [noneItem, ...ITEMS]
    });
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();

    dispatchCardSelectFrom(
      el.shadowRoot.querySelector("c-newton-selector-choice-tile"),
      ""
    );
    expect(handler.mock.calls[0][0].detail.values).toEqual([]);
  });

  it("shows manual input after the manual option is selected", async () => {
    const manualItem = {
      id: MANUAL_INPUT_VALUE,
      label: "Other",
      value: MANUAL_INPUT_VALUE,
      disabled: false,
      manualInput: true
    };
    const el = mount({
      items: [...ITEMS, manualItem],
      manualInputLabel: "Other response",
      manualInputMinLength: 2,
      manualInputMaxLength: 10
    });
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();

    const cards = el.shadowRoot.querySelectorAll(
      "c-newton-selector-choice-tile"
    );
    dispatchCardSelectFrom(cards[cards.length - 1], MANUAL_INPUT_VALUE);
    await Promise.resolve();

    const input = el.shadowRoot.querySelector(".newton-manual-input__control");
    expect(input).not.toBeNull();
    expect(input.getAttribute("minlength")).toBe("2");
    expect(input.getAttribute("maxlength")).toBe("10");
    input.value = "Manual";
    input.dispatchEvent(new CustomEvent("input", { bubbles: true }));

    expect(handler.mock.calls.at(-1)[0].detail.values).toEqual([
      MANUAL_INPUT_VALUE
    ]);
    expect(handler.mock.calls.at(-1)[0].detail.manualValue).toBe("Manual");
  });

  it("supports dragging cards between transfer columns", async () => {
    const el = mount({ variant: "columns", selectionMode: "multi" });
    const handler = jest.fn();
    el.addEventListener("selectionchange", handler);
    await Promise.resolve();

    const availableItem = el.shadowRoot.querySelector(".newton-transfer__item");
    const dragData = {};
    const dragStart = new CustomEvent("dragstart", { bubbles: true });
    Object.defineProperty(dragStart, "dataTransfer", {
      value: {
        setData: jest.fn((type, value) => {
          dragData[type] = value;
        })
      }
    });
    availableItem.dispatchEvent(dragStart);

    const selectedPanel = el.shadowRoot.querySelector(
      'section[aria-label="Selected card column"]'
    );
    const drop = new CustomEvent("drop", { bubbles: true });
    Object.defineProperty(drop, "dataTransfer", {
      value: {
        getData: jest.fn((type) => dragData[type])
      }
    });
    selectedPanel.dispatchEvent(drop);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.values).toEqual(["a"]);
  });
});
