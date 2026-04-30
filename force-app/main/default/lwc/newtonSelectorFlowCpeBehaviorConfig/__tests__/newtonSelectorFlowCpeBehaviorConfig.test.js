import { createElement } from "lwc";
import NewtonSelectorFlowCpeBehaviorConfig from "c/newtonSelectorFlowCpeBehaviorConfig";

const BASE_CONFIG = {
  dataSource: "custom",
  selectionMode: "single",
  layout: "grid",
  required: false,
  autoAdvance: true,
  includeNoneOption: true,
  noneOptionLabel: "--None--",
  noneOptionPosition: "start",
  manualInput: {
    enabled: false,
    label: "Other",
    minLength: 0,
    maxLength: null
  },
  enableSearch: false,
  showSelectAll: false,
  minSelections: 0,
  maxSelections: null,
  customErrorMessage: ""
};

function mount(config = BASE_CONFIG) {
  const element = createElement("c-newton-selector-flow-cpe-behavior-config", {
    is: NewtonSelectorFlowCpeBehaviorConfig
  });
  element.config = config;
  document.body.appendChild(element);
  return element;
}

function collect(element) {
  const events = [];
  element.addEventListener("configpatch", (event) => events.push(event.detail));
  return events;
}

function cardSelect(node, value) {
  node.dispatchEvent(
    new CustomEvent("cardselect", {
      detail: { value },
      bubbles: true,
      composed: true
    })
  );
}

function toggle(node, checked) {
  node.checked = checked;
  node.dispatchEvent(
    new CustomEvent("toggle", {
      detail: { checked },
      bubbles: true,
      composed: true
    })
  );
}

function toggleWithStaleTarget(node, currentChecked, nextChecked) {
  node.checked = currentChecked;
  node.dispatchEvent(
    new CustomEvent("toggle", {
      detail: { checked: nextChecked },
      bubbles: true,
      composed: true
    })
  );
}

function inputChange(node, value) {
  node.value = value;
  node.dispatchEvent(
    new CustomEvent("change", { bubbles: true, composed: true })
  );
}

function valueChanged(node, newValue) {
  node.dispatchEvent(
    new CustomEvent("valuechanged", {
      detail: { newValue },
      bubbles: true,
      composed: true
    })
  );
}

function byLabel(root, selector, label) {
  return [...root.querySelectorAll(selector)].find(
    (node) => node.label === label || node.getAttribute("label") === label
  );
}

describe("c-newton-selector-flow-cpe-behavior-config events", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("emits multi-select patch from the Mode toggle without changing compatible layout options", () => {
    const element = mount();
    const patches = collect(element);

    toggle(
      byLabel(
        element.shadowRoot,
        "c-newton-selector-flow-cpe-toggle",
        "Selection mode"
      ),
      true
    );

    expect(patches[0].path).toEqual([]);
    expect(patches[0].value).toMatchObject({
      selectionMode: "multi",
      autoAdvance: false,
      includeNoneOption: true,
      layout: "grid"
    });
  });

  it("preserves the selected layout when selection mode changes", () => {
    const radio = mount({ ...BASE_CONFIG, layout: "radio" });
    const radioPatches = collect(radio);

    toggle(
      byLabel(
        radio.shadowRoot,
        "c-newton-selector-flow-cpe-toggle",
        "Selection mode"
      ),
      true
    );

    expect(radioPatches[0].value).toMatchObject({
      selectionMode: "multi",
      layout: "radio"
    });

    const transfer = mount({
      ...BASE_CONFIG,
      layout: "dualListbox",
      selectionMode: "multi"
    });
    const transferPatches = collect(transfer);

    toggle(
      byLabel(
        transfer.shadowRoot,
        "c-newton-selector-flow-cpe-toggle",
        "Selection mode"
      ),
      false
    );

    expect(transferPatches[0].value).toMatchObject({
      selectionMode: "single",
      layout: "dualListbox"
    });
  });

  it("emits required, auto nav, search, and error message patches", () => {
    const element = mount({
      ...BASE_CONFIG,
      required: true,
      selectionMode: "single"
    });
    const patches = collect(element);

    toggle(
      element.shadowRoot.querySelector(
        'c-newton-selector-flow-cpe-toggle[data-key="required"]'
      ),
      true
    );
    toggle(
      element.shadowRoot.querySelector(
        'c-newton-selector-flow-cpe-toggle[data-key="enableSearch"]'
      ),
      true
    );
    toggle(
      element.shadowRoot.querySelector(
        'c-newton-selector-flow-cpe-toggle[data-key="autoAdvance"]'
      ),
      false
    );
    valueChanged(
      element.shadowRoot.querySelector(
        "c-newton-selector-flow-cpe-resource-selector"
      ),
      "Pick one"
    );

    expect(patches.at(-4).value.required).toBe(true);
    expect(patches.at(-3).value.enableSearch).toBe(true);
    expect(patches.at(-2).value.autoAdvance).toBe(false);
    expect(patches.at(-1).value.customErrorMessage).toBe("Pick one");
  });

  it("renders Mode, Required, Auto Nav, and Search as separate focused sections", () => {
    const element = mount();
    const cards = [
      ...element.shadowRoot.querySelectorAll(".newton-studio__card")
    ];
    const modeCard = cards.find((card) =>
      card
        .querySelector(".slds-card__header-title")
        ?.textContent.includes("Mode")
    );
    const requiredCard = cards.find((card) =>
      card
        .querySelector(".slds-card__header-title")
        ?.textContent.includes("Required")
    );

    expect(element.shadowRoot.textContent).toContain("Mode");
    expect(element.shadowRoot.textContent).toContain("Required");
    expect(element.shadowRoot.textContent).toContain("Auto navigation");
    expect(element.shadowRoot.textContent).toContain("Search");
    expect(modeCard).not.toBeUndefined();
    expect(
      byLabel(modeCard, "c-newton-selector-flow-cpe-toggle", "Selection mode")
    ).not.toBeUndefined();
    expect(requiredCard).not.toBeUndefined();
    expect(
      requiredCard.querySelector(".newton-card__glyph c-newton-selector-icon")
        .name
    ).toBe("asterisk");
    expect(
      element.shadowRoot.querySelector(".newton-studio__axis-title")
    ).toBeNull();
    expect(
      element.shadowRoot.querySelector('[aria-label="Selection mode"]')
    ).toBeNull();
    expect(element.shadowRoot.textContent).not.toContain("Search & toolbar");
    expect(element.shadowRoot.textContent).not.toContain("bulk-select");
    expect(element.shadowRoot.textContent).not.toContain("Minimum selections");
    expect(element.shadowRoot.textContent).not.toContain("Maximum selections");
    expect(
      byLabel(
        element.shadowRoot,
        "c-newton-selector-flow-cpe-toggle",
        "Show Select all / Clear all toolbar"
      )
    ).toBeUndefined();
  });

  it("does not render empty card bodies for off-state toggle sections", () => {
    const element = mount({
      ...BASE_CONFIG,
      required: false,
      includeNoneOption: false,
      manualInput: {
        ...BASE_CONFIG.manualInput,
        enabled: false
      },
      enableSearch: false
    });

    const emptyBodies = [
      ...element.shadowRoot.querySelectorAll(".slds-card__body_inner")
    ].filter((body) => !body.textContent.trim());

    expect(emptyBodies).toHaveLength(0);
    expect(
      byLabel(
        element.shadowRoot,
        "c-newton-selector-flow-cpe-toggle",
        "Required"
      ).closest(".newton-studio__card")
    ).not.toBeNull();
  });

  it("hides Auto Nav when selection mode is multi", () => {
    const element = mount({
      ...BASE_CONFIG,
      selectionMode: "multi",
      autoAdvance: false
    });

    expect(element.shadowRoot.textContent).not.toContain("Auto Nav");
    expect(
      element.shadowRoot.querySelector(
        'c-newton-selector-flow-cpe-toggle[data-key="autoAdvance"]'
      )
    ).toBeNull();
  });

  it("uses toggle event detail when the component target still has the old checked value", () => {
    const element = mount({
      ...BASE_CONFIG,
      required: true,
      enableSearch: true
    });
    const patches = collect(element);

    toggleWithStaleTarget(
      element.shadowRoot.querySelector(
        'c-newton-selector-flow-cpe-toggle[data-key="required"]'
      ),
      true,
      false
    );
    toggleWithStaleTarget(
      element.shadowRoot.querySelector(
        'c-newton-selector-flow-cpe-toggle[data-key="enableSearch"]'
      ),
      true,
      false
    );

    expect(patches.at(-2).value.required).toBe(false);
    expect(patches.at(-1).value.enableSearch).toBe(false);
  });

  it("emits none option patches only for valid position changes", () => {
    const element = mount();
    const patches = collect(element);

    inputChange(
      byLabel(element.shadowRoot, "lightning-input", "None option label"),
      "No choice"
    );
    const positionGroup = element.shadowRoot.querySelector(
      '.newton-studio__selectorgroup[aria-label="None option position"]'
    );
    cardSelect(positionGroup, "end");
    cardSelect(positionGroup, "middle");

    expect(patches).toHaveLength(2);
    expect(patches[0].value.noneOptionLabel).toBe("No choice");
    expect(patches[1].value.noneOptionPosition).toBe("end");
  });

  it("emits manual input patches", () => {
    const element = mount({
      ...BASE_CONFIG,
      manualInput: {
        enabled: true,
        label: "Other",
        minLength: 0,
        maxLength: null
      }
    });
    const patches = collect(element);

    toggle(
      byLabel(
        element.shadowRoot,
        "c-newton-selector-flow-cpe-toggle",
        "Allow manual input"
      ),
      false
    );
    inputChange(
      byLabel(element.shadowRoot, "lightning-input", "Manual option label"),
      "Something else"
    );
    inputChange(
      byLabel(element.shadowRoot, "lightning-input", "Minimum characters"),
      "3"
    );
    inputChange(
      byLabel(element.shadowRoot, "lightning-input", "Maximum characters"),
      "30"
    );

    expect(patches[0].value.manualInput.enabled).toBe(false);
    expect(patches[1].value.manualInput.label).toBe("Something else");
    expect(patches[2].value.manualInput.minLength).toBe(3);
    expect(patches[3].value.manualInput.maxLength).toBe(30);
  });
});
