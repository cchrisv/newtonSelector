# Component Levels — Detailed Reference

## Atom

**Format:** `{app}Atom{Name}` | **Data:** Never | **Logic:** Never

Pure presentational. Receives all state via `@api`, communicates out via `CustomEvent`.

**Responsibilities:**
- Render a single UI element or tightly coupled visual group
- Emit semantic events (`checkboxchanged`, `cardselect`)
- Accept style configuration via `@api` properties

**Constraints:**
- No `@wire`, no Apex imports
- No `@track` internal state (derive everything from `@api`)
- No child component imports beyond base Lightning components
- No business logic — not even simple conditionals about data shape

**Example — newtonCheckbox:**
```javascript
import { LightningElement, api } from 'lwc';

export default class NewtonCheckbox extends LightningElement {
    /** @type {string} Label displayed next to the checkbox */
    @api label = '';
    /** @type {boolean} Current checked state */
    @api value = false;
    /** @type {boolean} Disable interaction */
    @api disabled = false;

    handleChange(event) {
        const isOn = event.detail.checked;
        this.dispatchEvent(new CustomEvent('checkboxchanged', {
            detail: { newValue: isOn }
        }));
    }
}
```

---

## Molecule

**Format:** `{app}Molecule{Name}` | **Data:** Never | **Logic:** Coordination

Composes 2-5 atoms/molecules. Adds **local coordination** — search filtering, tab selection, drag reordering — but never fetches data.

**Responsibilities:**
- Compose atoms into a meaningful UI group
- Transform child events into higher-level parent events
- Manage local UI state (expanded/collapsed, selected tab, filter text)

**Constraints:**
- No `@wire`, no Apex imports
- Receives all data via `@api`
- Does not contain business rules (validation logic belongs in organisms)
- Maximum 5 direct child components

**Example — newtonSelectorFlowCpeFieldSelector:**
```javascript
import { LightningElement, api, track } from 'lwc';

export default class NewtonSelectorFlowCpeFieldSelector extends LightningElement {
    /** @type {Array} Available fields to pick from */
    @api items = [];

    @track _searchTerm = '';

    get filteredItems() {
        if (!this._searchTerm) return this.items;
        const term = this._searchTerm.toLowerCase();
        return this.items.filter(i => i.label.toLowerCase().includes(term));
    }

    handleSearch(event) {
        this._searchTerm = event.detail.value;
    }

    handleSelect(event) {
        this.dispatchEvent(new CustomEvent('fieldselect', {
            detail: { fieldApiName: event.detail.value }
        }));
    }
}
```

---

## Organism

**Format:** `{app}Organism{Name}` | **Data:** wire/Apex | **Logic:** Business rules

Owns a **data domain**. Fetches, transforms, validates, and presents data with full state management.

**Responsibilities:**
- Fetch data via `@wire` or imperative Apex
- Apply business rules and data transformations
- Handle ALL states: loading, error, empty, populated
- Enforce FLS/sharing (at Apex layer)
- Support cross-context rendering (desktop, mobile, Experience Cloud)

**Required patterns:**
```javascript
import { LightningElement, api, track, wire } from 'lwc';
import queryItems from '@salesforce/apex/NewtonSelectorRuntimeController.queryItems';

export default class NewtonSelectorDataSelector extends LightningElement {
    @track _items = [];
    @track _loading = true;
    @track _error = null;
    _connected = false;

    connectedCallback() {
        this._connected = true;
        this.loadData();
    }

    disconnectedCallback() {
        this._connected = false;
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
    }

    async loadData() {
        this._loading = true;
        this._error = null;
        try {
            const result = await queryItems({ /* params */ });
            if (this._connected) {
                this._items = this.normalizeResults(result);
            }
        } catch (error) {
            if (this._connected) {
                this._error = error.body?.message || 'An error occurred';
            }
        } finally {
            if (this._connected) {
                this._loading = false;
            }
        }
    }

    get hasItems() { return this._items.length > 0; }
    get showEmptyState() { return !this._loading && !this._error && !this.hasItems; }
}
```

**Template with all states:**
```html
<template>
    <template if:true={_loading}>
        <lightning-spinner alternative-text="Loading"></lightning-spinner>
    </template>
    <template if:true={_error}>
        <c-newton-error-message message={_error}></c-newton-error-message>
    </template>
    <template if:true={showEmptyState}>
        <c-newton-empty-state message="No items found"></c-newton-empty-state>
    </template>
    <template if:true={hasItems}>
        <template for:each={_items} for:item="item">
            <c-newton-picker-card key={item.id} item={item}
                onselect={handleItemSelect}>
            </c-newton-picker-card>
        </template>
    </template>
</template>
```

---

## Template

**Format:** `{app}Template{Name}` | **Data:** Never | **Logic:** Never

Layout-only via `<slot>`. Provides responsive structure. Contains zero content and zero logic.

**Example:**
```html
<template>
    <div class="slds-grid slds-wrap">
        <div class="slds-col slds-size_1-of-1 slds-medium-size_1-of-3">
            <slot name="sidebar"></slot>
        </div>
        <div class="slds-col slds-size_1-of-1 slds-medium-size_2-of-3">
            <slot name="main"></slot>
        </div>
    </div>
</template>
```

---

## Page

**Format:** `{app}Page{Name}` | **Data:** Orchestration | **Logic:** Process

Composes templates and organisms into complete user journeys. Owns navigation and cross-organism coordination.

**Responsibilities:**
- Place organisms into template slots
- Orchestrate data flow between organisms (via events/shared state)
- Handle navigation (`NavigationMixin`)
- Represent a complete user task from entry to exit

---

## Utility

**Format:** `{app}Utility{Name}` | **Data:** Varies | **Logic:** Technical

**Not an LWC component** — pure JS module. Imported by any level.

**Patterns:**
```javascript
// Stateless transforms
export function normalizePicklist(picklistValues) {
    return picklistValues.values.map(v => ({
        id: v.value, label: v.label, value: v.value
    }));
}

// Module-level cache with invalidation
const _cache = new Map();
export function fetchCached(key, fetcher) {
    if (_cache.has(key)) return Promise.resolve(_cache.get(key));
    return fetcher().then(result => { _cache.set(key, result); return result; });
}
export function clearCache() { _cache.clear(); }

// In-flight deduplication
const _inflight = new Map();
export function deduplicatedFetch(key, fetcher) {
    if (_inflight.has(key)) return _inflight.get(key);
    const p = fetcher().finally(() => _inflight.delete(key));
    _inflight.set(key, p);
    return p;
}
```

---

## Flow Component

**Format:** `{app}Flow{Name}` | **Data:** Delegation | **Logic:** Delegation

Thin wrapper that bridges Flow runtime ↔ LWC organisms.

**Required patterns:**
```javascript
import { LightningElement, api } from 'lwc';
import { FlowAttributeChangeEvent, FlowNavigationNextEvent } from 'lightning/flowSupport';

export default class NewtonSelectorFlowScreen extends LightningElement {
    /** @type {string} Flow input — selected value */
    @api value;
    /** @type {Array} Flow input — available actions */
    @api availableActions = [];

    handleSelection(event) {
        this._value = event.detail.value;
        this.dispatchEvent(new FlowAttributeChangeEvent('value', this._value));
    }

    @api
    validate() {
        if (!this._value) {
            return { isValid: false, errorMessage: 'Please select an item.' };
        }
        return { isValid: true };
    }

    handleNext() {
        if (this.availableActions.includes('NEXT')) {
            this.dispatchEvent(new FlowNavigationNextEvent());
        }
    }
}
```

**Key rules:**
- All `@api` properties that Flow sets must dispatch `FlowAttributeChangeEvent` on change
- Always implement `@api validate()` for navigation gates
- Delegate complex UI and data to composed organisms
