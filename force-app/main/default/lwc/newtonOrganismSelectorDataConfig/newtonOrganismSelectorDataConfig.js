import { api, LightningElement, track, wire } from "lwc";
import { getObjectInfo, getPicklistValues } from "lightning/uiObjectInfoApi";
import { defaultSelectorConfig } from "c/newtonUtilitySelectorConfigDefaults";
import {
  buildSobjectConfigForQuery,
  recordCollectionSamples,
  resolveRecordCollectionMetadataFromBuilderContext,
  resolvedStringValuePreview as buildResolvedStringValuePreview,
  resolveStringValuesFromBuilderContext,
  stringCollectionSamples
} from "c/newtonUtilitySelectorConfigState";
import {
  ORDER_DIRECTION_OPTIONS,
  OVERRIDE_FIELDS,
  PICKLIST_VALUE_SOURCE_OPTIONS,
  SORT_BY_OPTIONS,
  SORT_DIRECTION_OPTIONS,
  SOURCE_TILES
} from "c/newtonUtilitySelectorConfigOptions";
import searchSObjectTypes from "@salesforce/apex/NewtonSelectorCpeController.searchSObjectTypes";
import searchLookupDatasetFieldsForObject from "@salesforce/apex/NewtonSelectorCpeController.searchLookupDatasetFieldsForObject";
import queryItems from "@salesforce/apex/NewtonSelectorController.queryItems";
import validateQuery from "@salesforce/apex/NewtonSelectorController.validateQuery";

const MASTER_RECORD_TYPE_ID = "012000000000000AAA";
const DEFAULT_RECORD_TYPE_VALUE = "__NewtonDefaultRecordType__";
const OVERRIDE_VISIBLE_INCREMENT = 25;
const OVERRIDE_MODE_ADVANCED = "advanced";
const OVERRIDE_MODE_DEFAULT = "default";
const EMPTY_COLLECTION_FIELD_MAP = {
  label: "",
  sublabel: "",
  icon: "",
  value: "",
  badge: "",
  helpText: ""
};

export default class NewtonOrganismSelectorDataConfig extends LightningElement {
  @api config;
  @api sourceRecordsRef = "";
  @api sourceStringsRef = "";
  @api builderContext;
  @api automaticOutputVariables;

  @track _picklistValues = [];
  @track _recordTypeOptions = [];
  @track _defaultRecordTypeId = MASTER_RECORD_TYPE_ID;
  @track _sobjectSampleRows = [];
  @track _sampleLoadError = "";
  @track _isLoadingSample = false;
  @track _overrideSearch = "";
  @track _expandedOverrideValue = "";
  @track _overrideVisibleLimit = OVERRIDE_VISIBLE_INCREMENT;
  @track _overrideMode = "";
  @track _bulkSelection = {};
  @track _bulkEditDraft = { icon: "", sublabel: "", badge: "", helpText: "" };
  @track _queryValidation = null;
  @track _isValidatingQuery = false;

  get _config() {
    return this.config || defaultSelectorConfig();
  }
  set _config(value) {
    this.dispatchEvent(
      new CustomEvent("configpatch", { detail: { path: [], value } })
    );
  }

  get _sourceRecordsRef() {
    return this.sourceRecordsRef || "";
  }
  set _sourceRecordsRef(value) {
    this.dispatchRefChange("sourceRecordsRef", value);
  }
  get _sourceStringsRef() {
    return this.sourceStringsRef || "";
  }
  set _sourceStringsRef(value) {
    this.dispatchRefChange("sourceStringsRef", value);
  }

  get isDataSection() {
    return true;
  }
  get hasDataSource() {
    return Boolean(this._config.dataSource);
  }
  get isPicklistMode() {
    return this._config.dataSource === "picklist";
  }
  get isCollectionMode() {
    return this._config.dataSource === "collection";
  }
  get isStringCollectionMode() {
    return this._config.dataSource === "stringCollection";
  }
  get isCollectionOrStringCollectionMode() {
    return this.isCollectionMode || this.isStringCollectionMode;
  }
  get isSObjectMode() {
    return this._config.dataSource === "sobject";
  }
  get isCustomMode() {
    return this._config.dataSource === "custom";
  }
  get canCustomizeValues() {
    return (
      this.isPicklistMode ||
      this.isSObjectMode ||
      this.isStringCollectionMode ||
      this.isCollectionMode
    );
  }

  get sourceTiles() {
    const active = this._config.dataSource;
    return SOURCE_TILES.map((tile) => ({
      ...tile,
      id: tile.value,
      _selected: tile.value === active
    }));
  }
  get sourceKindLabel() {
    return (
      SOURCE_TILES.find((tile) => tile.value === this._config.dataSource)
        ?.label || ""
    );
  }
  get sourceSetupTitle() {
    return this.sourceKindLabel
      ? `${this.sourceKindLabel} setup`
      : "Source setup";
  }
  get sourceKindIcon() {
    return (
      SOURCE_TILES.find((tile) => tile.value === this._config.dataSource)
        ?.icon || "database"
    );
  }
  get sourceSetupSubtitle() {
    if (this.isPicklistMode)
      return "Point to an object and pick its picklist field.";
    if (this.isCollectionMode)
      return "Bind a Flow record collection and map fields to the tile slots.";
    if (this.isStringCollectionMode)
      return "Bind a Flow String[] variable — each string becomes a tile.";
    if (this.isSObjectMode)
      return "Query an object and map the result fields into the tile.";
    if (this.isCustomMode)
      return "Head to the Items section to type your options directly.";
    return "";
  }
  get picklistValueSourceOptions() {
    return PICKLIST_VALUE_SOURCE_OPTIONS;
  }
  get sortByOptions() {
    return SORT_BY_OPTIONS;
  }
  get sortDirectionOptions() {
    return SORT_DIRECTION_OPTIONS;
  }
  get orderDirectionOptions() {
    return ORDER_DIRECTION_OPTIONS;
  }

  handleSourceTileChange(event) {
    const value = event.detail?.value;
    if (value) this._config = { ...this._config, dataSource: value };
  }
  async handlePicklistObjectSearch(event) {
    await this.runSObjectSearch(event.detail.searchTerm, event.target);
  }
  handlePicklistObjectSelect(event) {
    const selectedId = event.detail.selectedIds?.[0];
    this._config = {
      ...this._config,
      picklist: {
        ...this._config.picklist,
        objectApiName: selectedId || "",
        fieldApiName: "",
        recordTypeId: ""
      }
    };
  }
  handlePicklistFieldChange(event) {
    this._config = {
      ...this._config,
      picklist: {
        ...this._config.picklist,
        fieldApiName: event.detail.fieldApiName || ""
      }
    };
  }
  handleRecordTypeComboChange(event) {
    const value = event.detail?.value || "";
    this._config = {
      ...this._config,
      picklist: {
        ...this._config.picklist,
        recordTypeId: value === DEFAULT_RECORD_TYPE_VALUE ? "" : value
      }
    };
  }
  handlePicklistValueSourceChange(event) {
    this._config = {
      ...this._config,
      picklist: {
        ...this._config.picklist,
        valueSource: event.detail.value || "apiName"
      }
    };
  }

  handleCollectionVariableChange(event) {
    const nextRef = event.detail.newValue || "";
    const nextObject =
      event.detail.objectType ||
      resolveRecordCollectionMetadataFromBuilderContext(
        this.builderContext,
        nextRef
      ).objectApiName;
    const currentObject = this._config.collection?.objectApiName || "";
    this._sourceRecordsRef = nextRef;
    this._config = {
      ...this._config,
      collection: {
        ...this._config.collection,
        objectApiName: nextObject || "",
        fieldMap:
          !nextRef || (nextObject && nextObject !== currentObject)
            ? { ...EMPTY_COLLECTION_FIELD_MAP }
            : { ...(this._config.collection?.fieldMap || {}) }
      }
    };
  }
  handleStringCollectionVariableChange(event) {
    this._sourceStringsRef = event.detail.newValue || "";
  }
  handleCollectionFieldMapChange(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.detail.fieldApiName || event.detail.value || "";
    this._config = {
      ...this._config,
      collection: {
        ...this._config.collection,
        fieldMap: { ...this._config.collection.fieldMap, [field]: value }
      }
    };
  }
  handleCollectionSamplesChange(event) {
    this._config = {
      ...this._config,
      collection: {
        ...(this._config.collection || {}),
        sampleValues: event.target?.value ?? ""
      }
    };
  }
  async handleSObjectSearch(event) {
    await this.runSObjectSearch(event.detail.searchTerm, event.target);
  }
  handleSObjectSelect(event) {
    const selectedId = event.detail.selectedIds?.[0];
    this._config = {
      ...this._config,
      sobject: {
        ...this._config.sobject,
        sObjectApiName: selectedId || "",
        whereClause: "",
        orderByField: ""
      }
    };
    this._sobjectSampleRows = [];
    this._queryValidation = null;
  }
  handleWhereChange(event) {
    this._config = {
      ...this._config,
      sobject: {
        ...this._config.sobject,
        whereClause: event.detail.value || ""
      }
    };
    this._queryValidation = null;
  }
  handleOrderFieldSearch(event) {
    const lookup = event.currentTarget;
    const objectApiName = this._config.sobject?.sObjectApiName || "";
    if (!objectApiName) {
      lookup.setSearchResults([]);
      return;
    }
    const searchKey =
      event.detail.rawSearchTerm != null
        ? String(event.detail.rawSearchTerm)
        : "";
    searchLookupDatasetFieldsForObject({ objectApiName, searchKey })
      .then((rows) => lookup.setSearchResults(rows || []))
      .catch(() => lookup.setSearchResults([]));
  }
  handleOrderFieldSelectionChange(event) {
    const selection = event.currentTarget.getSelection?.();
    const row = Array.isArray(selection) ? selection[0] : selection;
    this._config = {
      ...this._config,
      sobject: {
        ...this._config.sobject,
        orderByField: row?.id ? String(row.id) : ""
      }
    };
    this._queryValidation = null;
  }
  handleOrderDirectionChange(event) {
    this._config = {
      ...this._config,
      sobject: {
        ...this._config.sobject,
        orderByDirection: event.detail.value || "DESC"
      }
    };
    this._queryValidation = null;
  }
  handleLimitChange(event) {
    const raw = event.detail.value;
    let limit = null;
    if (raw !== "" && raw != null) {
      const n = Math.min(Math.max(parseInt(raw, 10) || 0, 0), 2000);
      limit = n > 0 ? n : null;
    }
    this._config = {
      ...this._config,
      sobject: { ...this._config.sobject, limit }
    };
    this._queryValidation = null;
  }
  handleSObjectFieldChange(event) {
    const field = event.currentTarget.dataset.field;
    this._config = {
      ...this._config,
      sobject: {
        ...this._config.sobject,
        [field]: event.detail.fieldApiName || ""
      }
    };
    this._queryValidation = null;
  }

  async handleValidateQuery() {
    this._isValidatingQuery = true;
    this._queryValidation = null;
    try {
      this._queryValidation = await validateQuery({
        configJson: JSON.stringify(buildSobjectConfigForQuery(this._config))
      });
    } catch (error) {
      this._queryValidation = {
        valid: false,
        message:
          error?.body?.message || error?.message || "Unable to validate query.",
        soql: ""
      };
    } finally {
      this._isValidatingQuery = false;
    }
  }

  async handleCopyQueryPreview() {
    try {
      await navigator.clipboard.writeText(this.sobjectQueryPreview);
      this._queryValidation = {
        valid: true,
        message: "Query copied to clipboard.",
        soql: this.sobjectQueryPreview
      };
    } catch {
      this._queryValidation = {
        valid: false,
        message: "Could not copy the query preview.",
        soql: this.sobjectQueryPreview
      };
    }
  }
  async runSObjectSearch(searchTerm, lookupComponent) {
    try {
      const results = await searchSObjectTypes({ searchKey: searchTerm || "" });
      lookupComponent?.setSearchResults(
        (results || []).map((row) => ({
          id: row.value,
          title: row.label,
          subtitle: row.subtitle,
          icon: row.icon,
          sObjectType: row.sObjectType
        }))
      );
    } catch {
      lookupComponent?.setSearchResults([]);
    }
  }

  get picklistObjectSelection() {
    const objectApiName = this._config.picklist?.objectApiName;
    return objectApiName
      ? [{ id: objectApiName, title: objectApiName, icon: "sparkle" }]
      : [];
  }
  get sobjectSelection() {
    const objectApiName = this._config.sobject?.sObjectApiName;
    return objectApiName
      ? [{ id: objectApiName, title: objectApiName, icon: "sparkle" }]
      : [];
  }
  get orderByFieldSelection() {
    const field = this._config.sobject?.orderByField;
    return field
      ? { id: field, title: field, subtitle: "", icon: "type" }
      : null;
  }
  get picklistObjectApiName() {
    return this.isPicklistMode
      ? this._config.picklist?.objectApiName || null
      : null;
  }
  get picklistFieldRef() {
    const obj = this._config.picklist?.objectApiName;
    const field = this._config.picklist?.fieldApiName;
    return this.isPicklistMode && obj && field ? `${obj}.${field}` : undefined;
  }
  get picklistRecordTypeId() {
    return (
      this._config.picklist?.recordTypeId ||
      this._defaultRecordTypeId ||
      MASTER_RECORD_TYPE_ID
    );
  }
  get picklistValueSource() {
    return this._config.picklist?.valueSource || "apiName";
  }
  get recordTypeOptions() {
    return this._recordTypeOptions;
  }
  get hasRecordTypeOptions() {
    return this._recordTypeOptions.length > 0;
  }
  get hasPicklistObject() {
    return Boolean(this._config.picklist?.objectApiName);
  }
  get recordTypeValue() {
    return this._config.picklist?.recordTypeId || DEFAULT_RECORD_TYPE_VALUE;
  }
  get hasPicklistValues() {
    return this._picklistValues.length > 0;
  }
  get hasSampleRows() {
    return this._sobjectSampleRows.length > 0;
  }

  get collectionResourceMetadata() {
    return resolveRecordCollectionMetadataFromBuilderContext(
      this.builderContext,
      this._sourceRecordsRef
    );
  }

  get collectionObjectApiName() {
    return (
      this._config.collection?.objectApiName ||
      this.collectionResourceMetadata.objectApiName ||
      ""
    );
  }

  get hasCollectionObjectApiName() {
    return Boolean(this.collectionObjectApiName);
  }

  get collectionSampleValuesRaw() {
    return this._config.collection?.sampleValues || "";
  }

  get collectionSampleRecords() {
    return recordCollectionSamples(
      this._config,
      this.builderContext,
      this._sourceRecordsRef
    );
  }

  get hasCollectionOverrideRows() {
    return this._filteredOverrideRows.length > 0;
  }

  get overrideEmptyMessage() {
    if (this.isCollectionMode) {
      return "Enter known item values above after mapping the collection to manage per-item overrides.";
    }
    return "Enter sample values above (for example, Hot, Warm, Cold) to manage per-value overrides.";
  }

  get sobjectQueryPreview() {
    const config = buildSobjectConfigForQuery(this._config);
    const objectApiName = config.sObjectApiName || "Object";
    const fields = [
      "Id",
      config.labelField,
      config.valueField,
      config.sublabelField,
      config.iconField,
      config.badgeField,
      config.helpField
    ].filter(Boolean);
    const selectFields = Array.from(new Set(fields));
    const where = config.whereClause ? ` WHERE ${config.whereClause}` : "";
    const order = config.orderByField
      ? ` ORDER BY ${config.orderByField} ${config.orderByDirection || "ASC"}`
      : "";
    const limit = ` LIMIT ${config.queryLimit || 20}`;
    return `SELECT ${selectFields.join(", ")} FROM ${objectApiName}${where}${order}${limit}`;
  }

  get hasQueryValidation() {
    return Boolean(this._queryValidation);
  }

  get queryValidationClass() {
    if (!this._queryValidation) return "newton-query-preview__status";
    return this._queryValidation.valid
      ? "newton-query-preview__status newton-query-preview__status_success"
      : "newton-query-preview__status newton-query-preview__status_error";
  }

  get queryValidationMessage() {
    if (!this._queryValidation) {
      return "Validation has not run for this query.";
    }
    return this._queryValidation.message || "";
  }

  get validateQueryLabel() {
    return this._isValidatingQuery ? "Validating" : "Validate query";
  }

  @wire(getObjectInfo, { objectApiName: "$picklistObjectApiName" })
  wiredObjectInfo({ data }) {
    if (!data?.recordTypeInfos) {
      this._defaultRecordTypeId = MASTER_RECORD_TYPE_ID;
      this._recordTypeOptions = [];
      return;
    }

    const recordTypes = Object.values(data.recordTypeInfos).filter(
      (recordType) => recordType.available !== false
    );
    this._defaultRecordTypeId =
      data.defaultRecordTypeId || MASTER_RECORD_TYPE_ID;
    const defaultRecordType = recordTypes.find(
      (recordType) => recordType.recordTypeId === this._defaultRecordTypeId
    );
    const defaultName = defaultRecordType?.name || "Master";
    const explicitRecordTypes = recordTypes
      .filter((recordType) => !recordType.master)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .map((recordType) => ({
        label: recordType.name,
        value: recordType.recordTypeId,
        sublabel: recordType.developerName || recordType.recordTypeId,
        icon: "id-card",
        badge:
          recordType.recordTypeId === this._defaultRecordTypeId ? "DEFAULT" : ""
      }));

    if (explicitRecordTypes.length === 0) {
      this._recordTypeOptions = [];
      return;
    }

    this._recordTypeOptions = [
      ...this.defaultRecordTypeOptions(defaultName),
      ...explicitRecordTypes
    ];
  }

  defaultRecordTypeOptions(defaultName) {
    return [
      {
        label: `Default (${defaultName})`,
        value: DEFAULT_RECORD_TYPE_VALUE,
        sublabel: "Uses this object's default record type",
        icon: "list-checks"
      }
    ];
  }

  @wire(getPicklistValues, {
    recordTypeId: "$picklistRecordTypeId",
    fieldApiName: "$picklistFieldRef"
  })
  wiredPicklistValues({ data }) {
    this._picklistValues = data?.values || [];
  }

  get stringCollectionSampleRaw() {
    return this._config.stringCollection?.sampleValues || "";
  }
  get resolvedStringCollectionValues() {
    return resolveStringValuesFromBuilderContext(
      this.builderContext,
      this._sourceStringsRef
    );
  }
  get hasResolvedStringValues() {
    return this.resolvedStringCollectionValues.length > 0;
  }
  get stringCollectionSampleStrings() {
    return stringCollectionSamples(
      this._config,
      this.builderContext,
      this._sourceStringsRef
    );
  }
  get resolvedStringValuePreview() {
    return buildResolvedStringValuePreview(
      this.builderContext,
      this._sourceStringsRef
    );
  }
  get resolvedStringCountLabel() {
    const count = this.resolvedStringCollectionValues.length;
    return `${count} value${count === 1 ? "" : "s"} detected`;
  }
  handleStringSamplesChange(event) {
    this._config = {
      ...this._config,
      stringCollection: {
        ...(this._config.stringCollection || {}),
        sampleValues: event.target?.value ?? ""
      }
    };
  }

  get customItems() {
    return (this._config.custom?.items || []).map((item, index, items) => ({
      ...item,
      index,
      hidden: item.hidden === true,
      canMoveUp: index === 0,
      canMoveDown: index === items.length - 1
    }));
  }
  handleCustomAddRow() {
    const items = [
      ...(this._config.custom?.items || []),
      { label: "", value: "", sublabel: "", icon: "", badge: "", helpText: "" }
    ];
    this._config = { ...this._config, custom: { items } };
  }
  handleCustomRemoveRow(event) {
    this.updateCustomItems((items) =>
      items.splice(Number(event.currentTarget.dataset.index), 1)
    );
  }
  handleCustomDuplicateRow(event) {
    this.updateCustomItems((items) => {
      const index = Number(event.currentTarget.dataset.index);
      items.splice(index + 1, 0, JSON.parse(JSON.stringify(items[index])));
    });
  }
  handleCustomMoveUp(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index > 0) this.swapCustomItems(index, index - 1);
  }
  handleCustomMoveDown(event) {
    const index = Number(event.currentTarget.dataset.index);
    const items = this._config.custom?.items || [];
    if (index < items.length - 1) this.swapCustomItems(index, index + 1);
  }
  handleCustomCellChange(event) {
    const index = Number(event.currentTarget.dataset.index);
    const field = event.currentTarget.dataset.field;
    this.updateCustomItems((items) => {
      items[index] = { ...items[index], [field]: this._readValue(event) };
    });
  }
  handleCustomIconChange(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.updateCustomItems((items) => {
      items[index] = { ...items[index], icon: event.detail.iconName || "" };
    });
  }
  handleCustomHiddenToggle(event) {
    const index = Number(event.currentTarget.dataset.index);
    const checked = event.detail?.checked ?? event.target?.checked ?? false;
    this.updateCustomItems((items) => {
      items[index] = { ...items[index], hidden: Boolean(checked) };
    });
  }
  updateCustomItems(mutator) {
    const items = [...(this._config.custom?.items || [])];
    mutator(items);
    this._config = { ...this._config, custom: { items } };
  }
  swapCustomItems(from, to) {
    this.updateCustomItems((items) => {
      [items[from], items[to]] = [items[to], items[from]];
    });
  }

  get _allOverrideRows() {
    const overrides = this._config.overrides || {};
    let source = [];
    if (this.isPicklistMode) {
      const useLabel = this.picklistValueSource === "label";
      source = this._picklistValues.map((value) => ({
        value: useLabel ? value.label : value.value,
        originalLabel: value.label
      }));
    } else if (this.isSObjectMode) {
      source = this._sobjectSampleRows.map((dto) => ({
        value: dto.value || dto.id,
        originalLabel: dto.label || dto.id
      }));
    } else if (this.isCollectionMode) {
      const fieldMap = this._config.collection?.fieldMap || {};
      source = this.collectionSampleRecords.map((record, index) => {
        const value =
          this.readRecordField(record, fieldMap.value) ||
          this.readRecordField(record, "Id") ||
          String(index);
        return {
          value,
          originalLabel:
            this.readRecordField(record, fieldMap.label) ||
            this.readRecordField(record, "Name") ||
            value
        };
      });
    } else if (this.isStringCollectionMode) {
      source = this.stringCollectionSampleStrings.map((value) => ({
        value,
        originalLabel: value
      }));
    }
    return source.map((row) => {
      const override = overrides[row.value] || {};
      return {
        value: row.value,
        originalLabel: row.originalLabel,
        label: override.label || "",
        icon: override.icon || "",
        sublabel: override.sublabel || "",
        badge: override.badge || "",
        helpText: override.helpText || "",
        hidden: override.hidden === true,
        hasCustom: OVERRIDE_FIELDS.some((field) => {
          return field === "hidden"
            ? override.hidden === true
            : Boolean(override[field]);
        })
      };
    });
  }
  readRecordField(record, fieldPath) {
    if (!record || !fieldPath) return "";
    const value = record[fieldPath];
    return value === undefined || value === null ? "" : String(value);
  }
  get _filteredOverrideRows() {
    const term = this._overrideSearch.trim().toLowerCase();
    return term
      ? this._allOverrideRows.filter((row) =>
          `${row.value} ${row.originalLabel} ${row.label}`
            .toLowerCase()
            .includes(term)
        )
      : this._allOverrideRows;
  }
  get overrideRows() {
    return this.visibleOverrideRows;
  }
  get visibleOverrideRows() {
    return this._filteredOverrideRows
      .slice(0, this._overrideVisibleLimit)
      .map((row) => this.decorateOverrideRow(row));
  }
  decorateOverrideRow(row) {
    const isExpanded = row.value === this._expandedOverrideValue;
    return {
      ...row,
      previewIcon: row.icon || "circle",
      previewLabel: row.label || row.originalLabel,
      assistiveLabel: `Edit overrides for ${row.originalLabel}`,
      expandLabel: `${isExpanded ? "Collapse" : "Expand"} overrides for ${
        row.originalLabel
      }`,
      summaryItems: this.overrideSummaryItems(row),
      isExpanded,
      areEditorsReady: isExpanded,
      ariaExpanded: isExpanded ? "true" : "false",
      isSelected: Boolean(this._bulkSelection[row.value]),
      rowClass: [
        "newton-overrides__row",
        isExpanded ? "newton-overrides__row_expanded" : "",
        row.hasCustom ? "newton-overrides__row_customized" : "",
        this._bulkSelection[row.value] ? "newton-overrides__row_selected" : ""
      ]
        .filter(Boolean)
        .join(" ")
    };
  }
  get bulkSelectionCount() {
    return Object.values(this._bulkSelection).filter(Boolean).length;
  }
  get hasBulkSelection() {
    return this.isOverrideAdvanced && this.bulkSelectionCount > 1;
  }
  get bulkSelectionLabel() {
    return `${this.bulkSelectionCount} selected`;
  }
  get filteredOverrideCount() {
    return this._filteredOverrideRows.length;
  }
  get visibleOverrideCount() {
    return this.visibleOverrideRows.length;
  }
  get hasMoreOverrideRows() {
    return this.visibleOverrideCount < this.filteredOverrideCount;
  }
  get showMoreOverrideRowsLabel() {
    const remaining = this.filteredOverrideCount - this.visibleOverrideCount;
    const nextCount = Math.min(remaining, OVERRIDE_VISIBLE_INCREMENT);
    return `Show ${nextCount} more (${this.visibleOverrideCount} of ${this.filteredOverrideCount})`;
  }
  get hasFilteredOverrideRows() {
    return this.filteredOverrideCount > 0;
  }
  get hasNoFilteredOverrideRows() {
    return !this.hasFilteredOverrideRows;
  }
  get bulkDraftCount() {
    return Object.values(this._bulkEditDraft).filter(Boolean).length;
  }
  get canApplyBulk() {
    return this.hasBulkSelection && this.bulkDraftCount > 0;
  }
  get cannotApplyBulk() {
    return !this.canApplyBulk;
  }
  get hasConfiguredOverrides() {
    return Object.keys(this._config.overrides || {}).length > 0;
  }
  get overrideMode() {
    return (
      this._overrideMode ||
      (this.hasConfiguredOverrides
        ? OVERRIDE_MODE_ADVANCED
        : OVERRIDE_MODE_DEFAULT)
    );
  }
  get isOverrideAdvanced() {
    return this.overrideMode === OVERRIDE_MODE_ADVANCED;
  }
  get isOverrideDefault() {
    return !this.isOverrideAdvanced;
  }
  handleOverrideSearch(event) {
    this._overrideSearch = event.target.value || "";
    this._overrideVisibleLimit = OVERRIDE_VISIBLE_INCREMENT;
  }
  handleShowMoreOverrideRows() {
    this._overrideVisibleLimit += OVERRIDE_VISIBLE_INCREMENT;
  }
  handleOverrideModeChange(event) {
    const value = event.detail?.checked
      ? OVERRIDE_MODE_ADVANCED
      : OVERRIDE_MODE_DEFAULT;
    this._overrideMode = value;
    this._expandedOverrideValue = "";
    this._bulkSelection = {};
    if (value === OVERRIDE_MODE_DEFAULT && this.hasConfiguredOverrides) {
      this._config = { ...this._config, overrides: {} };
    }
  }
  handleToggleExpandRow(event) {
    const value = event.currentTarget.dataset.value;
    this._expandedOverrideValue =
      this._expandedOverrideValue === value ? "" : value;
  }
  handleToggleSelectRow(event) {
    const value = event.currentTarget.dataset.value;
    const next = { ...this._bulkSelection };
    if (next[value]) delete next[value];
    else next[value] = true;
    this._bulkSelection = next;
  }
  handleClearBulkSelection() {
    this._bulkSelection = {};
  }
  handleSelectAllFiltered() {
    const next = { ...this._bulkSelection };
    for (const row of this._filteredOverrideRows) next[row.value] = true;
    this._bulkSelection = next;
  }
  handleBulkDraftChange(event) {
    this._bulkEditDraft = {
      ...this._bulkEditDraft,
      [event.currentTarget.dataset.field]: this._readValue(event)
    };
  }
  handleBulkDraftIconChange(event) {
    this._bulkEditDraft = {
      ...this._bulkEditDraft,
      icon: event.detail?.iconName || ""
    };
  }
  handleApplyBulk() {
    if (!this.canApplyBulk) return;
    const overrides = { ...(this._config.overrides || {}) };
    for (const value of Object.keys(this._bulkSelection).filter(
      (key) => this._bulkSelection[key]
    )) {
      const next = { ...(overrides[value] || {}) };
      for (const field of ["icon", "sublabel", "badge", "helpText"]) {
        if (this._bulkEditDraft[field])
          next[field] = this._bulkEditDraft[field];
      }
      overrides[value] = next;
    }
    this._config = { ...this._config, overrides };
    this._bulkEditDraft = { icon: "", sublabel: "", badge: "", helpText: "" };
    this._bulkSelection = {};
  }
  handleOverrideCellChange(event) {
    this.setOverride(
      event.currentTarget.dataset.value,
      event.currentTarget.dataset.field,
      this._readValue(event)
    );
  }
  handleOverrideIconChange(event) {
    this.setOverride(
      event.currentTarget.dataset.value,
      "icon",
      event.detail?.iconName || ""
    );
  }
  handleOverrideHiddenToggle(event) {
    this.setOverride(
      event.currentTarget.dataset.value,
      "hidden",
      Boolean(event.detail?.checked ?? event.target?.checked)
    );
  }
  handleClearOverride(event) {
    const value = event.currentTarget.dataset.value;
    const overrides = { ...(this._config.overrides || {}) };
    delete overrides[value];
    this._config = { ...this._config, overrides };
  }
  setOverride(value, field, newValue) {
    if (!value) return;
    const nextForValue = {
      ...(this._config.overrides?.[value] || {}),
      [field]: newValue || ""
    };
    if (field === "hidden" && newValue !== true) {
      delete nextForValue.hidden;
    }
    const overrides = { ...(this._config.overrides || {}) };
    if (
      OVERRIDE_FIELDS.every((key) => {
        return key === "hidden"
          ? nextForValue.hidden !== true
          : !nextForValue[key];
      })
    )
      delete overrides[value];
    else overrides[value] = nextForValue;
    this._config = { ...this._config, overrides };
  }
  overrideSummaryItems(row) {
    const items = [];
    if (row.hidden) {
      items.push({
        key: "hidden",
        label: "Hidden",
        className:
          "slds-badge slds-theme_warning newton-overrides-summary__badge"
      });
    }
    if (row.label) {
      items.push({
        key: "label",
        label: "Label",
        className: "slds-badge newton-overrides-summary__badge"
      });
    }
    if (row.icon) {
      items.push({
        key: "icon",
        label: "Icon",
        className: "slds-badge newton-overrides-summary__badge"
      });
    }
    if (row.sublabel) {
      items.push({
        key: "sublabel",
        label: "Subtitle",
        className: "slds-badge newton-overrides-summary__badge"
      });
    }
    if (row.badge) {
      items.push({
        key: "badge",
        label: "Badge",
        className: "slds-badge newton-overrides-summary__badge"
      });
    }
    if (row.helpText) {
      items.push({
        key: "helpText",
        label: "Help",
        className: "slds-badge newton-overrides-summary__badge"
      });
    }
    if (!items.length) {
      items.push({
        key: "source",
        label: "Using source",
        className:
          "slds-badge slds-badge_lightest newton-overrides-summary__badge"
      });
    }
    return items;
  }

  async handleLoadSObjectSample() {
    this._isLoadingSample = true;
    this._sampleLoadError = "";
    try {
      const dtos = await queryItems({
        configJson: JSON.stringify(buildSobjectConfigForQuery(this._config))
      });
      this._sobjectSampleRows = Array.isArray(dtos) ? dtos : [];
    } catch (error) {
      this._sampleLoadError =
        error?.body?.message || error?.message || "Could not load sample rows.";
      this._sobjectSampleRows = [];
    } finally {
      this._isLoadingSample = false;
    }
  }

  get displaySortBy() {
    return this._config.display?.sortBy || "none";
  }
  get displaySortDirection() {
    return this._config.display?.sortDirection || "asc";
  }
  get displayLimit() {
    return this._config.display?.limit ?? "";
  }
  get displaySortEnabled() {
    return this.displaySortBy !== "none";
  }
  handleDisplaySortByChange(event) {
    this._config = {
      ...this._config,
      display: {
        ...(this._config.display || {}),
        sortBy: event.detail?.value || "none"
      }
    };
  }
  handleDisplaySortDirectionChange(event) {
    this._config = {
      ...this._config,
      display: {
        ...(this._config.display || {}),
        sortDirection: event.detail?.value || "asc"
      }
    };
  }
  handleDisplayLimitChange(event) {
    const raw = event.target?.value;
    this._config = {
      ...this._config,
      display: {
        ...(this._config.display || {}),
        limit: raw === "" || raw == null ? null : Math.max(0, Number(raw))
      }
    };
  }

  dispatchRefChange(name, value) {
    this.dispatchEvent(
      new CustomEvent("refchange", { detail: { name, value: value || "" } })
    );
  }
  _readValue(event) {
    const fromDetail = event?.detail?.newValue;
    if (fromDetail !== undefined && fromDetail !== null)
      return String(fromDetail);
    const fromTarget = event?.target?.value;
    return fromTarget === undefined || fromTarget === null
      ? ""
      : String(fromTarget);
  }
}
