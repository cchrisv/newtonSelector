# LWC Testing Reference

## Test File Structure

```
componentName/
  __tests__/
    componentName.test.js
```

Every component gets a `__tests__` folder with at least one `.test.js` file.

## Test Scaffold

```javascript
import { createElement } from 'lwc';
import ComponentUnderTest from 'c/componentName';

function mount(props = {}) {
    const el = createElement('c-component-name', { is: ComponentUnderTest });
    Object.assign(el, props);
    document.body.appendChild(el);
    return el;
}

// Wait for async DOM updates
function flushPromises() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

describe('c-component-name', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    // Tests go here
});
```

## Test Focus by Level

### Atom Tests

Test rendering and event emission. No mocks needed.

```javascript
describe('c-newton-atom-checkbox', () => {
    it('renders with provided label', () => {
        const el = mount({ label: 'Show Border' });
        const input = el.shadowRoot.querySelector('lightning-input');
        expect(input).not.toBeNull();
        expect(input.label).toBe('Show Border');
    });

    it('emits checkboxchanged on toggle', () => {
        const el = mount({ label: 'Test', value: false });
        const handler = jest.fn();
        el.addEventListener('checkboxchanged', handler);

        const input = el.shadowRoot.querySelector('lightning-input');
        input.dispatchEvent(new CustomEvent('change', {
            detail: { checked: true }
        }));

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.newValue).toBe(true);
    });

    it('renders disabled state', () => {
        const el = mount({ label: 'Test', disabled: true });
        const input = el.shadowRoot.querySelector('lightning-input');
        expect(input.disabled).toBe(true);
    });
});
```

### Molecule Tests

Test coordination and event transformation.

```javascript
describe('c-newton-molecule-field-selector', () => {
    const MOCK_ITEMS = [
        { id: '1', label: 'Name', value: 'Name' },
        { id: '2', label: 'Email', value: 'Email' },
        { id: '3', label: 'Phone', value: 'Phone' }
    ];

    it('filters items by search term', async () => {
        const el = mount({ items: MOCK_ITEMS });
        await flushPromises();

        // Simulate search input
        const search = el.shadowRoot.querySelector('lightning-input');
        search.dispatchEvent(new CustomEvent('change', {
            detail: { value: 'email' }
        }));
        await flushPromises();

        const cards = el.shadowRoot.querySelectorAll('c-newton-atom-picker-card');
        expect(cards.length).toBe(1);
    });

    it('transforms child select into fieldselect event', async () => {
        const el = mount({ items: MOCK_ITEMS });
        await flushPromises();

        const handler = jest.fn();
        el.addEventListener('fieldselect', handler);

        const card = el.shadowRoot.querySelector('c-newton-atom-picker-card');
        card.dispatchEvent(new CustomEvent('select', {
            detail: { value: 'Email' }
        }));

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.fieldApiName).toBe('Email');
    });
});
```

### Organism Tests

Test business logic, Apex mocking, and all UI states.

```javascript
import queryItems from '@salesforce/apex/NewtonSelectorController.queryItems';

// Mock Apex
jest.mock('@salesforce/apex/NewtonSelectorController.queryItems',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

describe('c-newton-organism-data-selector', () => {
    it('shows loading spinner initially', () => {
        queryItems.mockResolvedValue([]);
        const el = mount();
        const spinner = el.shadowRoot.querySelector('lightning-spinner');
        expect(spinner).not.toBeNull();
    });

    it('renders items after data loads', async () => {
        queryItems.mockResolvedValue([
            { Id: '001', Name: 'Test Account', Industry: 'Tech' }
        ]);
        const el = mount();
        await flushPromises();

        const cards = el.shadowRoot.querySelectorAll('c-newton-atom-picker-card');
        expect(cards.length).toBe(1);
        expect(el.shadowRoot.querySelector('lightning-spinner')).toBeNull();
    });

    it('shows error state on Apex failure', async () => {
        queryItems.mockRejectedValue({ body: { message: 'Access denied' } });
        const el = mount();
        await flushPromises();

        const error = el.shadowRoot.querySelector('[data-error]');
        expect(error).not.toBeNull();
    });

    it('shows empty state when no results', async () => {
        queryItems.mockResolvedValue([]);
        const el = mount();
        await flushPromises();

        const empty = el.shadowRoot.querySelector('[data-empty-state]');
        expect(empty).not.toBeNull();
    });
});
```

### Utility Tests

Pure function input/output testing.

```javascript
import { normalizePicklist, filterByParent } from 'c/newtonUtilitySelectorDataSources';

describe('normalizePicklist', () => {
    it('transforms picklist values to unified shape', () => {
        const input = { values: [
            { label: 'Active', value: 'Active' },
            { label: 'Inactive', value: 'Inactive' }
        ]};
        const result = normalizePicklist(input);
        expect(result).toEqual([
            expect.objectContaining({ id: 'Active', label: 'Active', value: 'Active' }),
            expect.objectContaining({ id: 'Inactive', label: 'Inactive', value: 'Inactive' })
        ]);
    });
});

describe('filterByParent', () => {
    it('returns items matching parent value', () => {
        const items = [
            { id: '1', parentId: 'A' },
            { id: '2', parentId: 'B' },
            { id: '3', parentId: 'A' }
        ];
        expect(filterByParent(items, 'parentId', 'A')).toHaveLength(2);
    });

    it('returns all items when no parent filter', () => {
        const items = [{ id: '1' }, { id: '2' }];
        expect(filterByParent(items, null, null)).toHaveLength(2);
    });
});
```

### Flow Component Tests

Test Flow-specific integration.

```javascript
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';

jest.mock('lightning/flowSupport', () => ({
    FlowAttributeChangeEvent: jest.fn(),
    FlowNavigationNextEvent: jest.fn()
}), { virtual: true });

describe('c-newton-flow-selector', () => {
    it('dispatches FlowAttributeChangeEvent on selection', async () => {
        const el = mount({ value: '' });
        await flushPromises();

        const handler = jest.fn();
        el.addEventListener('FlowAttributeChangeEvent', handler);

        // Trigger selection in composed organism
        const organism = el.shadowRoot.querySelector('c-newton-organism-data-selector');
        organism.dispatchEvent(new CustomEvent('select', {
            detail: { value: 'selected-id' }
        }));

        expect(FlowAttributeChangeEvent).toHaveBeenCalledWith('value', 'selected-id');
    });

    it('validate returns error when no selection', () => {
        const el = mount({ value: '' });
        const result = el.validate();
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBeTruthy();
    });

    it('validate passes with selection', () => {
        const el = mount({ value: 'some-value' });
        const result = el.validate();
        expect(result.isValid).toBe(true);
    });
});
```

## Mock Data Factory Pattern

Create reusable mock factories for each data domain:

```javascript
// __tests__/data/mockFactories.js

export const createMockAccount = (overrides = {}) => ({
    Id: '001xx000003EXAMPLE',
    Name: 'Test Account',
    Industry: 'Technology',
    CustomerTier__c: 'Silver',
    ...overrides
});

export const createMockPickerItem = (overrides = {}) => ({
    id: 'item-001',
    label: 'Test Item',
    sublabel: 'Description',
    icon: 'standard:account',
    imageUrl: null,
    badge: null,
    helpText: null,
    value: 'test-value',
    disabled: false,
    ...overrides
});

export const createMockPickerItems = (count, overridesFn = (i) => ({})) =>
    Array.from({ length: count }, (_, i) => createMockPickerItem({
        id: `item-${i}`,
        label: `Item ${i}`,
        value: `value-${i}`,
        ...overridesFn(i)
    }));
```

## Tips

- **Always flush promises** after mount and after triggering async operations
- **Clean up DOM** in `afterEach` to prevent test leakage
- **Mock at module boundary** — mock Apex imports, not internal methods
- **Test realistic volumes** — include tests with 100+ items for performance-sensitive components
- **Test empty/null inputs** — components should handle gracefully
