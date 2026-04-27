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
      fieldMap: {
        ...base.collection.fieldMap,
        ...(incoming.collection?.fieldMap || {})
      }
    },
    sobject: { ...base.sobject, ...(incoming.sobject || {}) },
    custom: { items: incoming.custom?.items || [] },
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
  return metadata.records;
}

function normalizeFlowReference(rawRef) {
  return String(rawRef)
    .trim()
    .replace(/^\{!\s*/, "")
    .replace(/\s*\}$/, "")
    .trim();
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
