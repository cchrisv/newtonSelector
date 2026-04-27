import { createElement } from "lwc";
import NewtonSelectorFlowCpeIconSelector from "c/newtonSelectorFlowCpeIconSelector";

function mount(overrides = {}) {
  const el = createElement("c-newton-selector-flow-cpe-icon-selector", {
    is: NewtonSelectorFlowCpeIconSelector
  });
  el.mode = overrides.mode || "tabs";
  el.value = overrides.value || "";
  document.body.appendChild(el);
  return el;
}

describe("c-newton-selector-flow-cpe-icon-selector", () => {
  afterEach(() => {
    while (document.body.firstChild)
      document.body.removeChild(document.body.firstChild);
  });

  it("renders the Lucide tab in tabs mode", async () => {
    const el = mount();
    await Promise.resolve();
    const tabs = el.shadowRoot.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(1);
    expect(tabs[0].textContent).toContain("Lucide");
  });

  it("does not render the combobox icon grid until opened", async () => {
    const el = mount({ mode: "combobox" });
    await Promise.resolve();

    expect(el.shadowRoot.querySelector(".newton-combobox__panel")).toBeNull();
    expect(
      el.shadowRoot.querySelectorAll(".newton-selector-icon-cell")
    ).toHaveLength(0);

    el.shadowRoot.querySelector(".newton-combobox__trigger").click();
    await Promise.resolve();

    expect(
      el.shadowRoot.querySelector(".newton-combobox__panel")
    ).not.toBeNull();
    expect(
      el.shadowRoot.querySelectorAll(".newton-selector-icon-cell").length
    ).toBe(80);
  });

  it("fires iconselect with type:name format when an icon is clicked", async () => {
    const el = mount();
    const handler = jest.fn();
    el.addEventListener("iconselect", handler);
    await Promise.resolve();
    const firstIcon = el.shadowRoot.querySelector(".newton-selector-icon-cell");
    expect(firstIcon).not.toBeNull();
    firstIcon.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.iconName).toMatch(/^[a-z0-9-]+$/);
  });

  it("filters icons by search term", async () => {
    const el = mount();
    await Promise.resolve();
    const before = el.shadowRoot.querySelectorAll(
      ".newton-selector-icon-cell"
    ).length;
    const searchInput = el.shadowRoot.querySelector(".newton-search__input");
    searchInput.value = "settings";
    searchInput.dispatchEvent(new CustomEvent("input"));
    await Promise.resolve();
    const after = el.shadowRoot.querySelectorAll(
      ".newton-selector-icon-cell"
    ).length;
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  it("pre-selects the matching entry when value is set", async () => {
    const el = mount({ value: "settings" });
    await Promise.resolve();
    const selected = el.shadowRoot.querySelector(
      ".newton-selector-icon-cell_selected"
    );
    expect(selected).not.toBeNull();
    expect(selected.getAttribute("aria-label")).toBe("Select settings icon");
  });

  it("loads additional icon pages on request", async () => {
    const el = mount();
    await Promise.resolve();

    expect(
      el.shadowRoot.querySelectorAll(".newton-selector-icon-cell")
    ).toHaveLength(80);
    el.shadowRoot.querySelector("lightning-button").click();
    await Promise.resolve();

    expect(
      el.shadowRoot.querySelectorAll(".newton-selector-icon-cell")
    ).toHaveLength(160);
  });
});
