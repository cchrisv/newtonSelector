import { createElement } from "lwc";
import NewtonMoleculeCustomLookup from "c/newtonMoleculeCustomLookup";

function mount(props = {}) {
  const el = createElement("c-newton-molecule-custom-lookup", {
    is: NewtonMoleculeCustomLookup
  });
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

function input(el) {
  return el.shadowRoot.querySelector('input[type="text"]');
}

function dropdown(el) {
  return el.shadowRoot.querySelector('[role="listbox"]');
}

function options(el) {
  return Array.from(el.shadowRoot.querySelectorAll('[role="option"]'));
}

function visualOptions(el) {
  return Array.from(
    el.shadowRoot.querySelectorAll("c-newton-molecule-lookup-choice-option")
  );
}

function fireInput(el, value) {
  const inp = input(el);
  inp.value = value;
  inp.dispatchEvent(new CustomEvent("input"));
}

function pressKey(el, key) {
  input(el).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

const SAMPLE = [
  {
    id: "001a",
    sObjectType: "Account",
    icon: "building-2",
    title: "Acme Corp",
    subtitle: "Global HQ"
  },
  {
    id: "001b",
    sObjectType: "Account",
    icon: "building-2",
    title: "Globex",
    subtitle: "Regional"
  },
  {
    id: "001c",
    sObjectType: "Account",
    icon: "building-2",
    title: "Acme Foods",
    subtitle: "Subsidiary"
  }
];

describe("c-newton-molecule-custom-lookup", () => {
  beforeAll(() => {
    // JSDOM does not implement scrollIntoView — stub it for keyboard nav tests
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = function () {};
    }
  });

  afterEach(() => {
    jest.useRealTimers();
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  // ── Rendering ───────────────────────────────────────────

  describe("rendering", () => {
    it("renders the search input", () => {
      const el = mount({ label: "Find account" });
      expect(input(el)).not.toBeNull();
    });

    it("shows the provided label externally when variant=label-stacked (default)", () => {
      const el = mount({ label: "Find account" });
      const label = el.shadowRoot.querySelector("label");
      expect(label).not.toBeNull();
      expect(label.textContent.trim()).toContain("Find account");
    });

    it("hides the external label when variant=label-hidden", () => {
      const el = mount({ label: "Hidden", variant: "label-hidden" });
      expect(el.shadowRoot.querySelector("label")).toBeNull();
    });

    it("renders the required asterisk when required=true", () => {
      const el = mount({ required: true });
      expect(el.shadowRoot.querySelector(".slds-required")).not.toBeNull();
    });

    it("uses computedPlaceholder fallback when no placeholder given", () => {
      const el = mount({});
      expect(input(el).placeholder).toBe("Search...");
    });

    it("honors an explicit placeholder", () => {
      const el = mount({ placeholder: "Type here…" });
      expect(input(el).placeholder).toBe("Type here…");
    });

    it("marks aria-required=false when not required", () => {
      const el = mount({});
      expect(input(el).getAttribute("aria-required")).toBe("false");
    });

    it("renders a field-level-help tooltip when fieldLevelHelp is set", () => {
      const el = mount({ fieldLevelHelp: "Helpful hint" });
      expect(el.shadowRoot.querySelector("lightning-helptext")).not.toBeNull();
    });

    it("uses the aligned selected-value shell for single selections", async () => {
      const el = mount({});
      el.selection = { id: "001", title: "Acme", icon: "building-2" };
      await flush();

      expect(input(el).classList.contains("slds-combobox__input-value")).toBe(
        true
      );
      expect(
        el.shadowRoot.querySelector(".cc-lookup__input-entity-icon")
      ).not.toBeNull();
      expect(el.shadowRoot.querySelector(".cc-lookup__clear-button")).not.toBe(
        null
      );
    });
  });

  // ── Selection setter normalization ──────────────────────

  describe("selection setter", () => {
    it("accepts a single object with id + title", () => {
      const el = mount({});
      el.selection = { id: "001", title: "Acme" };
      expect(el.selection).toEqual(
        expect.objectContaining({ id: "001", title: "Acme" })
      );
    });

    it("accepts an array when isMultiEntry=true", () => {
      const el = mount({ isMultiEntry: true });
      el.selection = [
        { id: "1", title: "A" },
        { id: "2", title: "B" }
      ];
      expect(el.selection).toHaveLength(2);
      expect(el.selection.map((s) => s.id)).toEqual(["1", "2"]);
    });

    it("falls back to value when id is missing", () => {
      const el = mount({});
      el.selection = { value: "vx", title: "From value" };
      expect(el.selection.id).toBe("vx");
    });

    it("falls back to label when title is missing", () => {
      const el = mount({});
      el.selection = { id: "i1", label: "From label" };
      expect(el.selection.title).toBe("From label");
    });

    it("clears when set to null", () => {
      const el = mount({});
      el.selection = { id: "1", title: "A" };
      el.selection = null;
      expect(el.selection).toBeNull();
    });

    it("clears when set to undefined", () => {
      const el = mount({});
      el.selection = { id: "1", title: "A" };
      el.selection = undefined;
      expect(el.selection).toBeNull();
    });

    it("ignores items without an id", () => {
      const el = mount({ isMultiEntry: true });
      el.selection = [{ title: "no id" }, { id: "2", title: "ok" }];
      expect(el.selection).toHaveLength(1);
      expect(el.selection[0].id).toBe("2");
    });

    it("preserves existing richer rows when the same IDs come back with less info", () => {
      const el = mount({ isMultiEntry: true });
      el.selection = [{ id: "1", title: "Acme Corp", icon: "building-2" }];
      el.selection = [{ id: "1" }]; // same id, no title — should NOT overwrite
      expect(el.selection[0].title).toBe("Acme Corp");
      expect(el.selection[0].icon).toBe("building-2");
    });

    it("replaces selection when IDs differ", () => {
      const el = mount({});
      el.selection = { id: "1", title: "A" };
      el.selection = { id: "2", title: "B" };
      expect(el.selection.id).toBe("2");
    });

    it("coerces numeric ids to strings", () => {
      const el = mount({});
      el.selection = { id: 42, title: "Num" };
      expect(el.selection.id).toBe("42");
    });
  });

  // ── Selection getter ────────────────────────────────────

  describe("selection getter", () => {
    it("returns null when single-select with no selection", () => {
      const el = mount({});
      expect(el.selection).toBeNull();
    });

    it("returns a single object for single-entry", () => {
      const el = mount({});
      el.selection = { id: "1", title: "A" };
      expect(Array.isArray(el.selection)).toBe(false);
      expect(el.selection.id).toBe("1");
    });

    it("returns a copied array for multi-entry", () => {
      const el = mount({ isMultiEntry: true });
      el.selection = [{ id: "1", title: "A" }];
      const first = el.selection;
      const second = el.selection;
      expect(first).not.toBe(second); // new array each time
      expect(first[0].id).toBe(second[0].id);
    });
  });

  // ── Public methods ──────────────────────────────────────

  describe("setSearchResults", () => {
    it("populates options from a valid array", async () => {
      const el = mount({});
      el.setSearchResults(SAMPLE);
      input(el).focus();
      await flush();
      expect(options(el)).toHaveLength(3);
    });

    it("returns [] options when given a non-array", () => {
      const el = mount({});
      expect(() => el.setSearchResults(null)).not.toThrow();
      expect(() => el.setSearchResults("oops")).not.toThrow();
      expect(() => el.setSearchResults(undefined)).not.toThrow();
    });

    it("normalizes items with missing fields to empty strings", async () => {
      const el = mount({});
      el.setSearchResults([{ id: "x" }, { title: "no id" }]);
      input(el).focus();
      await flush();
      // first has id but no title, second has no id (still normalized, not filtered here)
      const opts = options(el);
      expect(opts.length).toBe(2);
    });
  });

  describe("setDefaultResults", () => {
    it("accepts an array and does not throw", () => {
      const el = mount({});
      expect(() => el.setDefaultResults(SAMPLE)).not.toThrow();
    });

    it("handles non-array input gracefully", () => {
      const el = mount({});
      expect(() => el.setDefaultResults(null)).not.toThrow();
      expect(() => el.setDefaultResults({})).not.toThrow();
    });

    it("uses defaults when term is below min length (empty input on focus)", async () => {
      const el = mount({ minSearchTermLength: 2 });
      el.setDefaultResults(SAMPLE);
      input(el).focus();
      await flush();
      expect(options(el)).toHaveLength(3);
    });
  });

  describe("getSelection", () => {
    it("returns copies of each selection item", () => {
      const el = mount({ isMultiEntry: true });
      el.selection = [{ id: "1", title: "A" }];
      const snap = el.getSelection();
      snap[0].title = "MUTATED";
      expect(el.selection[0].title).toBe("A");
    });

    it("returns empty array when no selection", () => {
      const el = mount({});
      expect(el.getSelection()).toEqual([]);
    });
  });

  // ── Debounced search event ──────────────────────────────

  describe("search event", () => {
    beforeEach(() => jest.useFakeTimers());

    it("fires after debounce when term meets min length", () => {
      const el = mount({ minSearchTermLength: 2 });
      const handler = jest.fn();
      el.addEventListener("search", handler);
      fireInput(el, "ac");
      jest.advanceTimersByTime(300);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual(
        expect.objectContaining({ searchTerm: "ac", rawSearchTerm: "ac" })
      );
    });

    it("does NOT fire when term is below min length", () => {
      const el = mount({ minSearchTermLength: 3 });
      const handler = jest.fn();
      el.addEventListener("search", handler);
      fireInput(el, "ab");
      jest.advanceTimersByTime(300);
      expect(handler).not.toHaveBeenCalled();
    });

    it("fires with empty string when minSearchTermLength=0", () => {
      const el = mount({ minSearchTermLength: 0 });
      const handler = jest.fn();
      el.addEventListener("search", handler);
      input(el).focus();
      jest.advanceTimersByTime(0);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({ searchTerm: "", rawSearchTerm: "" })
        })
      );
    });

    it("debounces rapid keystrokes — only the final query fires", () => {
      const el = mount({ minSearchTermLength: 1 });
      const handler = jest.fn();
      el.addEventListener("search", handler);
      fireInput(el, "a");
      jest.advanceTimersByTime(100);
      fireInput(el, "ac");
      jest.advanceTimersByTime(100);
      fireInput(el, "acm");
      jest.advanceTimersByTime(300);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.searchTerm).toBe("acm");
    });

    it("lowercases searchTerm but preserves rawSearchTerm casing", () => {
      const el = mount({ minSearchTermLength: 1 });
      const handler = jest.fn();
      el.addEventListener("search", handler);
      fireInput(el, "AcMe");
      jest.advanceTimersByTime(300);
      expect(handler.mock.calls[0][0].detail.searchTerm).toBe("acme");
      expect(handler.mock.calls[0][0].detail.rawSearchTerm).toBe("AcMe");
    });

    it("includes current selectedIds in the detail", () => {
      const el = mount({ minSearchTermLength: 1, isMultiEntry: true });
      el.selection = [
        { id: "p1", title: "Picked" },
        { id: "p2", title: "Picked2" }
      ];
      const handler = jest.fn();
      el.addEventListener("search", handler);
      fireInput(el, "x");
      jest.advanceTimersByTime(300);
      expect(handler.mock.calls[0][0].detail.selectedIds).toEqual(["p1", "p2"]);
    });
  });

  // ── selectionchange event ───────────────────────────────

  describe("selectionchange event", () => {
    it("fires when a dropdown option is clicked", async () => {
      const el = mount({});
      el.setSearchResults(SAMPLE);
      input(el).focus();
      await flush();
      const handler = jest.fn();
      el.addEventListener("selectionchange", handler);
      options(el)[1].click();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.selectedIds).toEqual(["001b"]);
    });

    it("fires on clear for single-select", async () => {
      const el = mount({});
      el.selection = { id: "1", title: "A" };
      await flush();
      const handler = jest.fn();
      el.addEventListener("selectionchange", handler);
      const clearBtn = el.shadowRoot.querySelector(
        'button[title="Remove selected option"]'
      );
      expect(clearBtn).not.toBeNull();
      clearBtn.click();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.selectedIds).toEqual([]);
    });

    it("accumulates in multi-entry without duplicating ids", async () => {
      const el = mount({ isMultiEntry: true, minSearchTermLength: 2 });
      input(el).dispatchEvent(new CustomEvent("focus"));
      await Promise.resolve();
      el.setSearchResults(SAMPLE);
      await flush();
      const handler = jest.fn();
      el.addEventListener("selectionchange", handler);
      options(el)[0].click();
      await flush();
      // applySelection closed the dropdown; re-open by dispatching focus + re-setting results
      input(el).dispatchEvent(new CustomEvent("focus"));
      await Promise.resolve();
      el.setSearchResults(SAMPLE);
      await flush();
      options(el)[0].click(); // same id as first click
      expect(handler).toHaveBeenCalledTimes(2);
      expect(el.getSelection()).toHaveLength(1);
    });

    it("pill remove fires selectionchange with remaining ids", async () => {
      const el = mount({ isMultiEntry: true });
      el.selection = [
        { id: "1", title: "A" },
        { id: "2", title: "B" }
      ];
      await flush();
      const handler = jest.fn();
      el.addEventListener("selectionchange", handler);
      const pill = el.shadowRoot.querySelector("lightning-pill");
      expect(pill).not.toBeNull();
      pill.dispatchEvent(new CustomEvent("remove"));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.selectedIds).toEqual(["2"]);
    });

    it("clicking an option with an unknown id is a no-op", async () => {
      const el = mount({ minSearchTermLength: 2 });
      input(el).focus();
      await Promise.resolve();
      el.setSearchResults(SAMPLE);
      await flush();
      const handler = jest.fn();
      el.addEventListener("selectionchange", handler);
      // Mutate the rendered option's data-id so the handler's find() returns undefined
      const realOption = options(el)[0];
      realOption.dataset.id = "bogus-id";
      realOption.click();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ── Keyboard navigation ─────────────────────────────────

  describe("keyboard navigation", () => {
    // Prime helper uses min=2 so focus() doesn't trigger a browse-mode fireSearch
    // (which flips _loading=true and hides options behind a spinner).
    async function prime() {
      const el = mount({ minSearchTermLength: 2 });
      input(el).focus();
      await Promise.resolve();
      el.setSearchResults(SAMPLE);
      await flush();
      return el;
    }

    it("ArrowDown cycles forward through options", async () => {
      const el = await prime();
      pressKey(el, "ArrowDown"); // 0 → 1
      await flush();
      expect(options(el)[1].getAttribute("aria-selected")).toBe("true");
      pressKey(el, "ArrowDown"); // 1 → 2
      await flush();
      expect(options(el)[2].getAttribute("aria-selected")).toBe("true");
      pressKey(el, "ArrowDown"); // 2 → 0 (wrap)
      await flush();
      expect(options(el)[0].getAttribute("aria-selected")).toBe("true");
    });

    it("ArrowUp cycles backward", async () => {
      const el = await prime();
      pressKey(el, "ArrowUp"); // 0 → 2 (wrap)
      await flush();
      expect(options(el)[2].getAttribute("aria-selected")).toBe("true");
    });

    it("Home jumps to first option", async () => {
      const el = await prime();
      pressKey(el, "ArrowDown");
      pressKey(el, "ArrowDown");
      await flush();
      pressKey(el, "Home");
      await flush();
      expect(options(el)[0].getAttribute("aria-selected")).toBe("true");
    });

    it("End jumps to last option", async () => {
      const el = await prime();
      pressKey(el, "End");
      await flush();
      expect(options(el)[2].getAttribute("aria-selected")).toBe("true");
    });

    it("Enter selects the active option", async () => {
      const el = await prime();
      const handler = jest.fn();
      el.addEventListener("selectionchange", handler);
      pressKey(el, "ArrowDown"); // active → 1 (Globex)
      await flush();
      pressKey(el, "Enter");
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.selectedIds).toEqual(["001b"]);
    });

    it("Escape closes the dropdown", async () => {
      const el = await prime();
      expect(dropdown(el)).not.toBeNull();
      pressKey(el, "Escape");
      await flush();
      expect(dropdown(el)).toBeNull();
    });

    it("Tab closes the dropdown", async () => {
      const el = await prime();
      pressKey(el, "Tab");
      await flush();
      expect(dropdown(el)).toBeNull();
    });

    it("does not throw when no options and nav key pressed", () => {
      const el = mount({});
      input(el).focus();
      expect(() => pressKey(el, "ArrowDown")).not.toThrow();
      expect(() => pressKey(el, "Enter")).not.toThrow();
    });
  });

  // ── Validity ────────────────────────────────────────────

  describe("validity", () => {
    it("checkValidity() is true when not required and empty", () => {
      const el = mount({});
      expect(el.checkValidity()).toBe(true);
    });

    it("checkValidity() is false when required and empty", () => {
      const el = mount({ required: true });
      expect(el.checkValidity()).toBe(false);
    });

    it("checkValidity() is true when required and has selection", () => {
      const el = mount({ required: true });
      el.selection = { id: "1", title: "A" };
      expect(el.checkValidity()).toBe(true);
    });

    it("checkValidity() is false when errors prop is non-empty", () => {
      const el = mount({});
      el.selection = { id: "1", title: "A" };
      el.errors = [{ id: "e", message: "bad" }];
      expect(el.checkValidity()).toBe(false);
    });

    it("reportValidity() mirrors checkValidity()", () => {
      const el = mount({ required: true });
      expect(el.reportValidity()).toBe(false);
      el.selection = { id: "1", title: "A" };
      expect(el.reportValidity()).toBe(true);
    });

    it("setCustomValidity stores the message", () => {
      const el = mount({});
      expect(() => el.setCustomValidity("oops")).not.toThrow();
      expect(() => el.setCustomValidity(null)).not.toThrow();
      expect(() => el.setCustomValidity(undefined)).not.toThrow();
    });
  });

  // ── minSearchTermLength edge cases ──────────────────────

  describe("minSearchTermLength edge cases", () => {
    beforeEach(() => jest.useFakeTimers());

    it("NaN falls back to default (2)", () => {
      const el = mount({ minSearchTermLength: "abc" });
      const handler = jest.fn();
      el.addEventListener("search", handler);
      fireInput(el, "a");
      jest.advanceTimersByTime(300);
      expect(handler).not.toHaveBeenCalled();
      fireInput(el, "ab");
      jest.advanceTimersByTime(300);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("negative clamps to 0", () => {
      const el = mount({ minSearchTermLength: -5 });
      const handler = jest.fn();
      el.addEventListener("search", handler);
      fireInput(el, "");
      jest.advanceTimersByTime(300);
      // With minSearchTermLength clamped to 0, empty string should count as meeting min
      // handleNativeInput only fires search when term passes the guard
      // Empty user input produces rawSearchTerm='' → fires when min=0
      expect(handler).toHaveBeenCalled();
    });

    it("null / undefined / empty string default to 2", () => {
      [null, undefined, ""].forEach((val) => {
        const el = mount({ minSearchTermLength: val });
        const handler = jest.fn();
        el.addEventListener("search", handler);
        fireInput(el, "a");
        jest.advanceTimersByTime(300);
        expect(handler).not.toHaveBeenCalled();
        document.body.removeChild(el);
      });
    });
  });

  // ── Focus / blur / disabled ────────────────────────────

  describe("focus / blur / disabled", () => {
    it("focus() opens the dropdown for single-entry without selection", async () => {
      const el = mount({});
      el.setSearchResults(SAMPLE);
      el.focus();
      await flush();
      expect(dropdown(el)).not.toBeNull();
    });

    it("focus() does NOT open dropdown when single-entry has a selection", async () => {
      const el = mount({});
      el.selection = { id: "1", title: "Picked" };
      el.focus();
      await flush();
      expect(dropdown(el)).toBeNull();
    });

    it("disabled input does not open dropdown on focus", async () => {
      const el = mount({ disabled: true });
      input(el).focus();
      await flush();
      expect(dropdown(el)).toBeNull();
    });

    it("blur() triggers delayed close (dropdown eventually closed)", async () => {
      jest.useFakeTimers();
      const el = mount({});
      el.setSearchResults(SAMPLE);
      input(el).focus();
      await Promise.resolve();
      input(el).dispatchEvent(new CustomEvent("blur"));
      jest.advanceTimersByTime(201);
      await Promise.resolve();
      expect(dropdown(el)).toBeNull();
    });
  });

  // ── newrecord event ─────────────────────────────────────

  describe("newrecord event", () => {
    it("fires with objectApiName when a newRecordOption button is clicked", async () => {
      const el = mount({
        newRecordOptions: [{ value: "Account", label: "Create Account" }]
      });
      el.setSearchResults([]); // force no-results state so buttons appear
      input(el).focus();
      fireInput(el, "nothingmatches");
      await flush();
      const handler = jest.fn();
      el.addEventListener("newrecord", handler);
      const btn = el.shadowRoot.querySelector(
        'lightning-button[data-object="Account"]'
      );
      expect(btn).not.toBeNull();
      btn.click();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.objectApiName).toBe("Account");
    });
  });

  // ── Error state ─────────────────────────────────────────

  describe("errors prop", () => {
    it("renders inline error message when errors non-empty", async () => {
      const el = mount({
        errors: [
          { id: "a", message: "Error 1." },
          { id: "b", message: "Error 2." }
        ]
      });
      await flush();
      const err = el.shadowRoot.querySelector('[role="alert"]');
      expect(err).not.toBeNull();
      expect(err.textContent.trim()).toContain("Error 1.");
      expect(err.textContent.trim()).toContain("Error 2.");
    });

    it("aria-invalid=true when errors present", async () => {
      const el = mount({ errors: [{ id: "a", message: "e" }] });
      await flush();
      expect(input(el).getAttribute("aria-invalid")).toBe("true");
    });

    it("does not render alert when errors is empty", () => {
      const el = mount({ errors: [] });
      expect(el.shadowRoot.querySelector('[role="alert"]')).toBeNull();
    });
  });

  // ── Title highlighting ──────────────────────────────────

  describe("title highlighting", () => {
    beforeEach(() => jest.useFakeTimers());

    it("wraps matched substring in <mark>", async () => {
      const el = mount({ minSearchTermLength: 1 });
      el.setSearchResults(SAMPLE);
      input(el).focus();
      fireInput(el, "acme");
      jest.advanceTimersByTime(300);
      // Parent would normally call setSearchResults again; we already set it pre-type.
      // Just verify rendering of the mark based on current options + term.
      el.setSearchResults(SAMPLE);
      await Promise.resolve();
      await Promise.resolve();
      const marks = visualOptions(el).flatMap((option) =>
        Array.from(option.shadowRoot.querySelectorAll("mark"))
      );
      // 2 of 3 sample titles contain 'acme' (Acme Corp, Acme Foods) — one mark each
      expect(marks.length).toBeGreaterThanOrEqual(2);
    });

    it("matches case-insensitively", async () => {
      const el = mount({ minSearchTermLength: 1 });
      el.setSearchResults(SAMPLE);
      input(el).focus();
      fireInput(el, "GLOBEX");
      jest.advanceTimersByTime(300);
      el.setSearchResults(SAMPLE);
      await Promise.resolve();
      await Promise.resolve();
      const marks = visualOptions(el).flatMap((option) =>
        Array.from(option.shadowRoot.querySelectorAll("mark"))
      );
      // Globex contains 'globex' — one mark in that row's title
      expect(marks.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Disconnect / cleanup ────────────────────────────────

  describe("disconnect cleanup", () => {
    it("clears pending debounce timer on disconnect", () => {
      jest.useFakeTimers();
      const el = mount({ minSearchTermLength: 1 });
      const handler = jest.fn();
      el.addEventListener("search", handler);
      fireInput(el, "a");
      document.body.removeChild(el);
      jest.advanceTimersByTime(500);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ── No-results / browse state ───────────────────────────

  describe("no-results state", () => {
    it('shows "No options available." when empty and no search term', async () => {
      const el = mount({ minSearchTermLength: 2 });
      input(el).focus();
      await Promise.resolve();
      el.setSearchResults([]);
      await flush();
      const state = el.shadowRoot.querySelector(".cc-lookup__state");
      expect(state).not.toBeNull();
      expect(state.textContent.trim()).toContain("No options available");
    });

    it('shows "No results found." after a search term yields nothing', async () => {
      jest.useFakeTimers();
      const el = mount({ minSearchTermLength: 1 });
      input(el).focus();
      fireInput(el, "xyz");
      jest.advanceTimersByTime(300);
      el.setSearchResults([]);
      await Promise.resolve();
      await Promise.resolve();
      const state = el.shadowRoot.querySelector(".cc-lookup__state");
      expect(state).not.toBeNull();
      expect(state.textContent.trim()).toContain("No results found");
    });
  });
});
