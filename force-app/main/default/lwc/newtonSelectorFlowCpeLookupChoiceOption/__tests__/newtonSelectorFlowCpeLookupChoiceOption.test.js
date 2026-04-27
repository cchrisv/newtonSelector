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

function getRenderedItem(el) {
  return el.shadowRoot.querySelector("c-newton-selector-choice-tile")?.item;
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

    expect(getRenderedItem(el)).toEqual(
      expect.objectContaining({
        icon: "text-cursor-input",
        iconTone: "brand",
        badgeVariant: "brand"
      })
    );
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

    expect(getRenderedItem(el)).toEqual(
      expect.objectContaining({
        icon: "database",
        iconTone: "brand",
        badgeVariant: "brand"
      })
    );
  });

  it("uses collection styling before scalar type styling", async () => {
    const el = mount({
      type: "String",
      label: "Selected Ids",
      value: "selectedIds",
      isCollection: true
    });
    await flush();

    expect(getRenderedItem(el)).toEqual(
      expect.objectContaining({
        icon: "square-library",
        iconTone: "teal",
        badgeVariant: "teal"
      })
    );
  });

  it("uses global variable styling for well-known globals", async () => {
    const el = mount({
      type: "String",
      label: "$User",
      value: "$User",
      globalVariable: true
    });
    await flush();

    expect(getRenderedItem(el)).toEqual(
      expect.objectContaining({
        icon: "user-round",
        iconTone: "teal",
        badgeVariant: "teal"
      })
    );
  });
});
