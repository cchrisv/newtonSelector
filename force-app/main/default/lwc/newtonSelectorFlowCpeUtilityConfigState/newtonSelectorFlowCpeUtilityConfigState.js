import {
  defaultSelectorConfig,
  mergeGridConfigWithDefaults,
  normalizeLayoutKey
} from "c/newtonSelectorUtilityConfigDefaults";

const BUILDER_CONTEXT_RESOURCE_BUCKETS = [
  "variables",
  "constants",
  "choices",
  "dynamicChoiceSets",
  "picklistChoiceSets",
  "recordChoiceSets",
  "collectionChoiceSets",
  "formulas",
  "textTemplates"
];

export function mergeSelectorConfig(initialConfig) {
  const base = defaultSelectorConfig();
  const incoming = initialConfig
    ? JSON.parse(JSON.stringify(initialConfig))
    : {};
  const layout = normalizeLayoutKey(incoming.layout || base.layout);

  return {
    ...base,
    ...incoming,
    layout,
    picklist: { ...base.picklist, ...(incoming.picklist || {}) },
    collection: {
      ...base.collection,
      ...(incoming.collection || {}),
      objectApiName:
        incoming.collection?.objectApiName || base.collection.objectApiName,
      sampleValues:
        incoming.collection?.sampleValues || base.collection.sampleValues,
      fieldMap: {
        ...base.collection.fieldMap,
        ...(incoming.collection?.fieldMap || {})
      }
    },
    sobject: { ...base.sobject, ...(incoming.sobject || {}) },
    custom: { items: incoming.custom?.items || [] },
    stringCollection: {
      sampleValues: incoming.stringCollection?.sampleValues || ""
    },
    manualInput: {
      ...base.manualInput,
      ...(incoming.manualInput || {})
    },
    overrides:
      incoming.overrides && typeof incoming.overrides === "object"
        ? incoming.overrides
        : {},
    display: { ...base.display, ...(incoming.display || {}) },
    gridConfig: mergeGridConfigWithDefaults(layout, incoming.gridConfig || {})
  };
}

export function setConfigPath(config, path, value) {
  if (!Array.isArray(path)) return config;
  if (path.length === 0) return value;
  const [head, ...tail] = path;
  if (tail.length === 0) {
    return { ...(config || {}), [head]: value };
  }
  return {
    ...(config || {}),
    [head]: setConfigPath(config?.[head] || {}, tail, value)
  };
}

export function buildSobjectConfigForQuery(config) {
  const sobject = config?.sobject || {};
  return {
    sObjectApiName: sobject.sObjectApiName || "",
    whereClause: sobject.whereClause || "",
    orderByField: sobject.orderByField || "",
    orderByDirection: sobject.orderByDirection || "ASC",
    queryLimit: Number(sobject.limit || 20),
    labelField: sobject.labelField || "Name",
    valueField: sobject.valueField || "Id",
    sublabelField: sobject.sublabelField || "",
    iconField: sobject.iconField || "",
    badgeField: sobject.badgeField || "",
    helpField: sobject.helpField || ""
  };
}

export function resolveRecordCollectionMetadataFromBuilderContext(
  builderContext,
  rawRef
) {
  if (!rawRef || !builderContext) return { objectApiName: "", records: [] };
  const ref = normalizeFlowReference(rawRef);
  if (!ref) return { objectApiName: "", records: [] };

  for (const bucket of BUILDER_CONTEXT_RESOURCE_BUCKETS) {
    const list = builderContext[bucket];
    if (!Array.isArray(list)) continue;
    const match = list.find((resource) => resource?.name === ref);
    if (!match) continue;
    return {
      objectApiName:
        match.objectType ||
        match.object ||
        match.sobjectType ||
        match.subtype ||
        "",
      records: resolveRecordArrayFromResource(match)
    };
  }
  return { objectApiName: "", records: [] };
}

export function recordCollectionSamples(
  config,
  builderContext,
  sourceRecordsRef
) {
  const metadata = resolveRecordCollectionMetadataFromBuilderContext(
    builderContext,
    sourceRecordsRef
  );
  if (metadata.records.length > 0) return metadata.records;
  const raw = config?.collection?.sampleValues || "";
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => ({ Id: value, Name: value }));
}

export function resolveStringValuesFromBuilderContext(builderContext, rawRef) {
  if (!rawRef || !builderContext) return [];
  const ref = normalizeFlowReference(rawRef);
  if (!ref) return [];

  for (const bucket of BUILDER_CONTEXT_RESOURCE_BUCKETS) {
    const list = builderContext[bucket];
    if (!Array.isArray(list)) continue;
    const match = list.find((resource) => resource?.name === ref);
    if (!match) continue;

    const candidates = [
      match.value,
      match.defaultValue,
      match.values,
      match.defaultValues,
      match.options,
      match.items
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate
          .map((entry) => coerceStringFromResourceValue(entry))
          .filter((value) => value.length > 0);
      }
      if (
        typeof candidate === "string" &&
        candidate.length > 0 &&
        match.isCollection !== true
      ) {
        return [candidate];
      }
    }
  }
  return [];
}

export function stringCollectionSamples(
  config,
  builderContext,
  sourceStringsRef
) {
  const fromContext = resolveStringValuesFromBuilderContext(
    builderContext,
    sourceStringsRef
  );
  if (fromContext.length > 0) return fromContext;
  const raw = config?.stringCollection?.sampleValues || "";
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function resolvedStringValuePreview(
  builderContext,
  sourceStringsRef,
  cap = 24
) {
  const values = resolveStringValuesFromBuilderContext(
    builderContext,
    sourceStringsRef
  );
  const pills = values.slice(0, cap).map((label, index) => ({
    key: `rsv-${index}`,
    label
  }));
  if (values.length > cap) {
    pills.push({ key: "rsv-more", label: `+${values.length - cap} more` });
  }
  return pills;
}

function normalizeFlowReference(rawRef) {
  return String(rawRef)
    .trim()
    .replace(/^\{!\s*/, "")
    .replace(/\s*\}$/, "")
    .trim();
}

function coerceStringFromResourceValue(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return String(value.value ?? value.stringValue ?? value.label ?? "");
  }
  return String(value ?? "");
}

function resolveRecordArrayFromResource(resource) {
  const candidates = [
    resource.value,
    resource.defaultValue,
    resource.values,
    resource.defaultValues,
    resource.records,
    resource.items
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (entry) => entry && typeof entry === "object" && !Array.isArray(entry)
      );
    }
  }
  return [];
}
