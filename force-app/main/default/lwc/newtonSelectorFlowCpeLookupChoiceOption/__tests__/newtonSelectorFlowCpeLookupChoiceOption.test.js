import { createElement } from "lwc";
import NewtonSelectorFlowCpeLookupChoiceOption from "c/newtonSelectorFlowCpeLookupChoiceOption";

function mount(row = {}) {
  const el = createElement("c-newton-selector-flow-cpe-lookup-choice-option", {
    is: NewtonSelectorFlowCpeLookupChoiceOption
  });
  el.row = row;
  document.body.appendChild(el);
  return el;
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

function getIcon(el) {
  return el.shadowRoot.querySelector("c-newton-selector-icon");
}

function getIconFrame(el) {
  return el.shadowRoot.querySelector(".newton-visual-lookup-option__icon");
}

describe("c-newton-selector-flow-cpe-lookup-choice-option", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("uses distinct text styling for string resources", async () => {
    const el = mount({ type: "String", label: "Account Name", value: "Name" });
    await flush();

    expect(getIcon(el).name).toBe("text-cursor-input");
    expect(getIconFrame(el)).not.toBeNull();
  });

  it("uses record-oriented styling for sObject resources", async () => {
    const el = mount({
      type: "SObject",
      displayType: "Account",
      label: "Account",
      value: "Account",
      isObject: true
    });
    await flush();

    expect(getIcon(el).name).toBe("database");
  });

  it("uses record-oriented styling when an option is tagged with sObjectType", async () => {
    const el = mount({
      sObjectType: "Account",
      label: "Data Action Job Summary",
      value: "DataActionJobSummary"
    });
    await flush();

    expect(getIcon(el).name).toBe("database");
    expect(el.shadowRoot.querySelector(".slds-badge").textContent).toContain(
      "Account"
    );
  });

  it("uses a neutral data icon for unknown option types", async () => {
    const el = mount({
      label: "Unknown row",
      value: "UnknownRow"
    });
    await flush();

    expect(getIcon(el).name).toBe("box");
  });

  it("uses collection styling before scalar type styling", async () => {
    const el = mount({
      type: "String",
      label: "Selected Ids",
      value: "selectedIds",
      isCollection: true
    });
    await flush();

    expect(getIcon(el).name).toBe("square-library");
  });

  it("uses global variable styling for well-known globals", async () => {
    const el = mount({
      type: "String",
      label: "$User",
      value: "$User",
      globalVariable: true
    });
    await flush();

    expect(getIcon(el).name).toBe("user-round");
  });
});
