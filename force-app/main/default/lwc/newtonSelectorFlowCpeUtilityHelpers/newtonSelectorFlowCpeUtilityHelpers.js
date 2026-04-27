/**
 * Newton Selector Flow CPE | Helpers
 *
 * Merged utility module for the CPE Toolkit. Three logical sections:
 *   1. Field metadata cache  — stateful LRU cache around getObjectFields
 *   2. Merge-field helpers   — pure functions for {!...} reference detection and formatting
 *   3. Data source helpers   — pure transforms for the six data-source modes
 *
 * Usage:
 *   import {
 *       fetchFields, iconForFieldType, isReference, formattedValue, normalizeInputMode
 *   } from 'c/newtonSelectorFlowCpeUtilityHelpers';
 *
 * Attribution: merge-field helpers adapted from UnofficialSF fsc_flowComboboxUtils
 * (Apache-2.0). See repo LICENSE and NOTICE.
 */

import getObjectFields from "@salesforce/apex/NewtonSelectorFlowCpeController.getObjectFields";

// ═════════════════════════════════════════════════════════════════
// 1. FIELD METADATA CACHE
// ═════════════════════════════════════════════════════════════════

const MAX_CACHE_SIZE = 10;

/** @type {Map<string, {name:string, label:string, type:string, relationshipName:string}[]>} */
const _fieldCache = new Map();

/** @type {Map<string, Promise>} */
const _fieldInflight = new Map();

/** @type {string[]} LRU order — most-recent at end */
const _fieldLru = [];

function touchLru(key) {
  const idx = _fieldLru.indexOf(key);
  if (idx > -1) {
    _fieldLru.splice(idx, 1);
  }
  _fieldLru.push(key);
  while (_fieldLru.length > MAX_CACHE_SIZE) {
    const evict = _fieldLru.shift();
    _fieldCache.delete(evict);
  }
}

/**
 * Fetch fields for an SObject, returning cached results when available.
 * Dedupes concurrent callers by returning the same in-flight Promise.
 * @param {string} objectApiName
 * @returns {Promise<{name:string, label:string, type:string, relationshipName:string}[]>}
 */
export function fetchFields(objectApiName) {
  if (!objectApiName) {
    return Promise.resolve([]);
  }
  const key = objectApiName.trim().toLowerCase();
  if (_fieldCache.has(key)) {
    touchLru(key);
    return Promise.resolve(_fieldCache.get(key));
  }
  if (_fieldInflight.has(key)) {
    return _fieldInflight.get(key);
  }
  const p = getObjectFields({ objectName: objectApiName.trim() })
    .then((fields) => {
      const result = Array.isArray(fields) ? fields : [];
      _fieldCache.set(key, result);
      touchLru(key);
      _fieldInflight.delete(key);
      return result;
    })
    .catch(() => {
      _fieldInflight.delete(key);
      return [];
    });
  _fieldInflight.set(key, p);
  return p;
}

/** Clear all cached field metadata. */
export function clearFieldCache() {
  _fieldCache.clear();
  _fieldInflight.clear();
  _fieldLru.length = 0;
}

/** Clear cache for a specific object (useful when a custom field is added mid-session). */
export function clearFieldCacheFor(objectApiName) {
  if (!objectApiName) return;
  const key = objectApiName.trim().toLowerCase();
  _fieldCache.delete(key);
  _fieldInflight.delete(key);
  const idx = _fieldLru.indexOf(key);
  if (idx > -1) _fieldLru.splice(idx, 1);
}

/** Diagnostics for tests/debugging. */
export function getFieldCacheStats() {
  return {
    size: _fieldCache.size,
    inflight: _fieldInflight.size,
    lru: [..._fieldLru]
  };
}

// ── Field type → SLDS icon mapping ────────────────────────────────

const TYPE_ICON_MAP = Object.freeze({
  STRING: "type",
  TEXTAREA: "typearea",
  INTEGER: "hash",
  LONG: "hash",
  DOUBLE: "hash",
  CURRENCY: "dollar-sign",
  PERCENT: "percent",
  BOOLEAN: "check",
  DATE: "calendar-days",
  DATETIME: "calendar-clock",
  TIME: "clock",
  PICKLIST: "list_type",
  COMBOBOX: "list_type",
  MULTIPICKLIST: "list-checks",
  REFERENCE: "circle_lookup",
  EMAIL: "mail",
  PHONE: "smartphone",
  URL: "link",
  ID: "key-round",
  ADDRESS: "map-pin",
  LOCATION: "map-pin",
  ENCRYPTEDSTRING: "lock",
  BASE64: "image"
});

const FALLBACK_ICON = "type";

/**
 * Return the SLDS utility icon name for a Salesforce field type.
 * @param {string} fieldType — Schema.DisplayType name (e.g. "STRING", "CURRENCY")
 * @returns {string}
 */
export function iconForFieldType(fieldType) {
  if (!fieldType) return FALLBACK_ICON;
  return TYPE_ICON_MAP[fieldType.toUpperCase()] || FALLBACK_ICON;
}

/**
 * Format a field type for display (title case).
 * @param {string} fieldType — e.g. "MULTIPICKLIST" → "Multi-Picklist"
 * @returns {string}
 */
export function formatFieldType(fieldType) {
  if (!fieldType) return "";
  const map = {
    MULTIPICKLIST: "Multi-Picklist",
    ENCRYPTEDSTRING: "Encrypted Text",
    TEXTAREA: "Text Area",
    DATETIME: "Date/Time",
    COMBOBOX: "Combobox",
    BOOLEAN: "Checkbox",
    REFERENCE: "Lookup",
    INTEGER: "Number",
    DOUBLE: "Number",
    LONG: "Number",
    BASE64: "Base64"
  };
  const upper = fieldType.toUpperCase();
  if (map[upper]) return map[upper];
  return upper.charAt(0) + upper.slice(1).toLowerCase();
}

/**
 * Transform raw Field[] from Apex into lookup-compatible option objects.
 * @param {Array} fields — from getObjectFields
 * @returns {{id:string, title:string, subtitle:string, icon:string, type:string, relationshipName:string}[]}
 */
export function fieldsToOptions(fields) {
  if (!Array.isArray(fields)) return [];
  return fields.map((f) => ({
    id: f.name || "",
    title: f.label || f.name || "",
    subtitle: `${f.name || ""} — ${formatFieldType(f.type)}`,
    icon: iconForFieldType(f.type),
    type: f.type || "",
    relationshipName: f.relationshipName || ""
  }));
}

/**
 * Filter field options by search term (matches against label, API name, or subtitle).
 * @param {Array} options — from fieldsToOptions
 * @param {string} term
 */
export function filterFieldOptions(options, term) {
  const t = (term || "").trim().toLowerCase();
  if (!t) return options;
  return options.filter(
    (o) =>
      (o.title || "").toLowerCase().includes(t) ||
      (o.id || "").toLowerCase().includes(t) ||
      (o.subtitle || "").toLowerCase().includes(t)
  );
}

// ═════════════════════════════════════════════════════════════════
// 2. MERGE-FIELD / FLOW RESOURCE HELPERS
// ═════════════════════════════════════════════════════════════════
// Adapted from UnofficialSF fsc_flowComboboxUtils (Apache-2.0).

export const flowComboboxDefaults = Object.freeze({
  stringDataType: "String",
  referenceDataType: "reference",
  defaultKeyPrefix: "flowCombobox-",
  defaultGlobalVariableKeyPrefix: "flowCombobox-globalVariable-",
  recordLookupsType: "recordLookups",
  recordCreatesType: "recordCreates",
  recordUpdatesType: "recordUpdates",
  dataTypeSObject: "SObject",
  isCollectionField: "isCollection",
  actionType: "actionCalls",
  screenComponentType: "screenComponent",
  screenActionType: "screenAction",
  regionContainerName: "Screen_Section"
});

/**
 * Detect the {!...} Flow merge-field syntax.
 * @param {string} value
 * @returns {boolean}
 */
export function isReference(value) {
  if (!value) return false;
  return (
    value.indexOf("{!") === 0 && value.lastIndexOf("}") === value.length - 1
  );
}

/**
 * @param {string} currentText
 * @returns {'String' | 'reference'}
 */
export function getDataType(currentText) {
  return isReference(currentText)
    ? flowComboboxDefaults.referenceDataType
    : flowComboboxDefaults.stringDataType;
}

/**
 * Wrap a value in {!...} when dataType is reference; otherwise return it unchanged.
 * @param {string} value
 * @param {string} dataType
 */
export function formattedValue(value, dataType) {
  if (isReference(value)) return value;
  return dataType === flowComboboxDefaults.referenceDataType
    ? `{!${value}}`
    : value;
}

/**
 * Strip the {!...} wrapping, returning the bare reference path.
 * Idempotent on plain values.
 * @param {string} value
 */
export function removeFormatting(value) {
  if (!value) return value;
  if (!isReference(value)) return value;
  return value.substring(0, value.lastIndexOf("}")).replace("{!", "");
}
