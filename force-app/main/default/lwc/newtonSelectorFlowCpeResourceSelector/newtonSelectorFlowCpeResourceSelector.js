/* 
 2/18/24 Eric Smith FlowScreenComponentsBasePack v3.3.9 or later
 Fixed Global variables
 Custom components in Sections are now selectable
 Removed Screen Sections from component list

 12/26/24 Eric Smith FlowScreenComponentsBasePack v3.3.5 or later
 Updated to recognize the output from Action Buttons and Screen Actions
 Added override option for CPEs to allow hard-coded references (Filter & Transform element outputs)
 Placeholder text is added to the input where the override is allowed
 Partial updates from PR#1581 (adamerstelle)
*/

import { LightningElement, wire, api, track } from "lwc";
import { getObjectInfo } from "lightning/uiObjectInfoApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import {
  formattedValue,
  isReference,
  getDataType,
  removeFormatting,
  flowComboboxDefaults
} from "c/newtonSelectorFlowCpeUtilityHelpers";
import getObjectFields from "@salesforce/apex/NewtonSelectorFlowCpeController.getObjectFields";

/** Shown when allowHardCodeReference is true (CPE / manual merge fields). */
const MANUAL_REFERENCE_PLACEHOLDER =
  "Enter a merge field ({!...}) or a literal. Invalid references show an error when you close the selector.";
const MERGE_FIELD_CACHE = new WeakMap();
const PROCESSED_OPTIONS_CACHE = new WeakMap();

// Known limitation: Flow Builder doesn't expose enough stable metadata here to fully resolve
// Filter and Transform output parameters, so CPEs can allow a manually entered merge field.
/* Filter Notes (Eric Smith)
 Process a typeDescriptor of collectionProcessors where collectionProcessorType = FilterCollectionProcessor
 isCollectionField will always be true
 to find the value for objectTypeField you will need to recursively check the objectTypeField value for 
 a typeDescriptor whose apiName matches the value for collectionReference
*/
// Action Buttons and Sections can still appear in Screen Components because their
// Flow Builder metadata shape overlaps with output-producing screen components.

const OUTPUTS_FROM_LABEL = "Outputs from ";

function coerceFlowBoolean(value) {
  if (value === true || value === "true" || value === "TRUE") {
    return true;
  }
  if (
    value === false ||
    value === "false" ||
    value === "FALSE" ||
    value === "0"
  ) {
    return false;
  }
  return Boolean(value);
}

export default class NewtonSelectorFlowCpeResourceSelector extends LightningElement {
  @api name;
  @api label;
  @api required = false;
  @api builderContextFilterType;
  @api builderContextFilterCollectionBoolean;
  @api maxWidth;
  @api autocomplete = "off";
  @api fieldLevelHelp;
  @api disabled;
  /** 'standard' (default) | 'label-hidden' — hides the label visually but keeps it for screen readers. */
  @api variant = "standard";

  @api
  get allowHardCodeReference() {
    return this._allowHardCodeReference;
  }
  set allowHardCodeReference(value) {
    this._allowHardCodeReference = value;
    this.placeholderText = value ? MANUAL_REFERENCE_PLACEHOLDER : "";
  }
  _allowHardCodeReference = false; // Set to true in the CPE to allow the user to hard code a reference like {!Filter_Element} or {!Transform_Output}
  placeholderText;

  @track _dataType;
  @track _value;
  @track allOptions;
  @track _options = [];
  @track _mergeFields = [];
  @track dropdownClass =
    "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click";
  @track isDataSelected = false;
  @track _selectedObjectType;
  @track _selectedFieldPath;
  @track _RecordObject; // Used when a start element is in the flow
  @track hasError = false;
  isMenuOpen = false;
  isDataModified = false;
  selfEvent = false;
  key = 0;
  _selectedOptionObjectType = "";
  _selectedOptionIsCollection = false;
  _boundWindowClick;
  _boundInputBlur;
  _builderContext;
  _automaticOutputVariables;
  labels = {
    noDataAvailable: "No matching mergefields or variables are available ",
    staticOptionsLabel: "OBJECT FIELDS",
    invalidReferenceError:
      "This Flow doesn't have a defined resource with that name. If you're trying to enter a literal value, don't use {!}"
  };
  iconsPerType = {
    String: "type",
    string: "type",
    Boolean: "check",
    Date: "calendar-days",
    DateTime: "calendar-clock",
    Number: "hash",
    Int: "hash",
    Double: "hash",
    Picklist: "list",
    TextArea: "typearea",
    Phone: "smartphone",
    Address: "map-pin",
    Currency: "dollar-sign_input",
    Url: "link",
    SObject: "box",
    reference: "merge",
    actionCalls: "circle-question-mark",
    screenComponent: "circle-question-mark",
    Apex: "code-xml",
    int: "type",
    boolean: "funnel"
  };

  typeDescriptors = [
    {
      apiName: "variables",
      label: "Variables",
      dataType: "dataType",
      objectTypeField: "objectType",
      isCollectionField: flowComboboxDefaults.isCollectionField
    },
    {
      apiName: "constants",
      label: "Global Constants",
      dataType: flowComboboxDefaults.stringDataType
    },
    {
      apiName: "textTemplates",
      label: "Variables",
      dataType: flowComboboxDefaults.stringDataType
    },
    {
      apiName: "stages",
      label: "Variables",
      dataType: flowComboboxDefaults.stringDataType
    },
    {
      apiName: "screens.fields",
      label: "Screen Components",
      dataType: flowComboboxDefaults.screenComponentType
    },
    // {apiName: 'screens.fields.fields', label: 'Screen Components', dataType: flowComboboxDefaults.screenComponentType}, //RegionContainer (Section Columns)
    {
      apiName: "screens.fields.fields.fields",
      label: "Screen Components",
      dataType: flowComboboxDefaults.screenComponentType
    }, //Region
    // {
    // apiName: 'screens.fields.inputParameters',
    // label: 'Screen Components',
    // dataType: flowComboboxDefaults.stringDataType
    // },
    {
      apiName: flowComboboxDefaults.recordLookupsType,
      label: "Variables",
      dataType: "SObject",
      objectTypeField: "object",
      isCollectionField: "getFirstRecordOnly"
    },
    {
      apiName: flowComboboxDefaults.recordCreatesType,
      label: "Variables",
      dataType: "SObject",
      objectTypeField: "object",
      isCollectionField: "getFirstRecordOnly"
    },
    {
      apiName: flowComboboxDefaults.recordUpdatesType,
      label: "Variables",
      dataType: "SObject",
      objectTypeField: "object",
      isCollectionField: "getFirstRecordOnly"
    },
    {
      apiName: "formulas",
      label: "Formulas",
      dataType: flowComboboxDefaults.stringDataType
    },
    {
      apiName: "actionCalls",
      label: "ACTIONS",
      dataType: flowComboboxDefaults.actionType
    }, //fallback
    // {apiName: 'actionCalls.outputParameters', label: 'Variables', dataType: flowComboboxDefaults.stringDataType},
    // {apiName: 'apexPluginCalls', label: 'Variables', dataType: flowComboboxDefaults.stringDataType},
    {
      apiName: "globalVariables",
      label: "Global Variables",
      dataType: flowComboboxDefaults.stringDataType
    }, // Not within Flow Metadata API but compiled to allow Global Variables to be used
    {
      apiName: "screens.actions",
      label: "Screen Actions",
      dataType: flowComboboxDefaults.screenActionType
    } // ***
  ];

  _staticOptions;
  @api
  get staticOptions() {
    return this._staticOptions;
  }

  set staticOptions(value) {
    this._staticOptions = value;
    this.processOptions();
  }

  @api
  get value() {
    return this._value;
  }

  set value(value) {
    this.applyInternalValue(value);
  }

  /**
   * Update displayed value from parent or internal navigation (avoid @api self-reassign lint).
   */
  applyInternalValue(value) {
    this.isDataSelected = !!value;
    if (isReference(value)) {
      this._dataType = getDataType(value);
      this._value = removeFormatting(value);
    } else {
      this._value = value;
    }
    this.determineSelectedType();
  }

  @api
  get valueType() {
    return this._dataType;
  }

  set valueType(value) {
    if (!this._dataType) {
      if (value) {
        this._dataType = value;
      } else {
        this._dataType = flowComboboxDefaults.stringDataType;
      }
    }
  }

  @api get builderContext() {
    return this._builderContext;
  }

  set builderContext(value) {
    this._builderContext = value;
    if (this._automaticOutputVariables) {
      this.initFromBuilderContextAndAutomaticOutputVariables();
    }
  }

  @api get automaticOutputVariables() {
    return this._automaticOutputVariables;
  }

  initFromBuilderContextAndAutomaticOutputVariables() {
    this._mergeFields = this.getCachedMergeFields(this._builderContext);
    if (!this._selectedObjectType) {
      this.setOptions(this._mergeFields);
      this.determineSelectedType();
    }
  }

  getCachedMergeFields(builderContext) {
    this._RecordObject = builderContext?.start?.object;
    if (!builderContext || typeof builderContext !== "object") {
      return this.adjustOptions(
        this.generateMergeFieldsFromBuilderContext(builderContext)
      );
    }
    let cached = MERGE_FIELD_CACHE.get(builderContext);
    if (!cached) {
      cached = this.adjustOptions(
        this.generateMergeFieldsFromBuilderContext(builderContext)
      );
      MERGE_FIELD_CACHE.set(builderContext, cached);
    }
    return cached;
  }

  set automaticOutputVariables(value) {
    // console.log('setting automaticOutputVariables to ' + JSON.stringify(value));
    this._automaticOutputVariables = value;
    if (this._builderContext) {
      this.initFromBuilderContextAndAutomaticOutputVariables();
    }
  }

  get displayPill() {
    return (
      this.isDataSelected &&
      this._dataType === flowComboboxDefaults.referenceDataType
    );
  }

  setOptions(value) {
    this._options = value || [];
    this.allOptions = this._options;
    this.processOptions();
  }

  adjustOptions(mergeFields) {
    const sObjectSingleList = [];
    const sObjectCollectionList = [];
    mergeFields.forEach((optionList) => {
      for (let i = 0; i < optionList.options.length; i++) {
        if (optionList.options[i].isObject) {
          if (optionList.options[i].isCollection) {
            sObjectCollectionList.push(optionList.options[i]);
          } else {
            sObjectSingleList.push(optionList.options[i]);
          }
          optionList.options.splice(i, 1);
          i--;
        }
      }
    });

    mergeFields.push({
      type: "RECORD (COLLECTION) VARIABLES ",
      options: sObjectCollectionList
    });

    mergeFields.push({
      type: "RECORD (SINGLE) VARIABLES ",
      options: sObjectSingleList
    });

    return mergeFields;
  }
  getTypeOption(value) {
    if (value) {
      const parentVar = value.split(".")[0];
      if (parentVar && this._mergeFields && this._mergeFields.length) {
        for (let i = 0; i < this._mergeFields.length; i++) {
          const localOption = this._mergeFields[i].options.find(
            (curTypeOption) => {
              const result =
                curTypeOption.value.toLowerCase() === parentVar.toLowerCase() ||
                curTypeOption.value.toLowerCase() === value.toLowerCase();
              return result;
            }
          );
          if (localOption) {
            return localOption;
          }
        }
      }
    }
    return undefined;
  }

  @wire(getObjectInfo, { objectApiName: "$_selectedObjectType" })
  _getObjectInfo({ error, data }) {
    if (error) {
      this.showToast("Error", error.body, "error");
      console.log(error.body);
      this.setOptions([]);
    } else if (data) {
      const tempOptions = [];
      // let localKey = 0;
      Object.keys(data.fields).forEach((curField) => {
        const curFieldData = data.fields[curField];
        const curDataType =
          curFieldData.dataType === "Reference"
            ? "SObject"
            : curFieldData.dataType;
        const curObjectType = curFieldData.referenceToInfos.length
          ? curFieldData.referenceToInfos[0].apiName
          : null;
        tempOptions.push(
          this.generateOptionLine(
            curDataType,
            curFieldData.label,
            curFieldData.apiName,
            false,
            curObjectType,
            this.getIconNameByType(curDataType),
            curDataType === "SObject",
            curDataType === "SObject" ? curObjectType : curDataType,
            flowComboboxDefaults.defaultKeyPrefix + this.key++
          )
        );
      });
      this.setOptions([{ type: data.label + " Fields", options: tempOptions }]);
    }
  }

  getTypes() {
    return this.typeDescriptors.map(
      (curTypeDescriptor) => curTypeDescriptor.apiName
    );
  }

  getTypeDescriptor(typeApiName) {
    return this.typeDescriptors.find(
      (curTypeDescriptor) => curTypeDescriptor.apiName === typeApiName
    );
  }

  determineSelectedType() {
    if (this._value && this.allOptions) {
      const valParts = this._value.replace(/[^a-zA-Z0-9._-]/g, "").split(".");
      if (valParts.length > 1) {
        this.allOptions.forEach((curOption) => {
          const localOptions = curOption.options;
          const selectedOption = localOptions.find(
            (curSelectedOption) => curSelectedOption.value === valParts[0]
          );
          if (selectedOption && selectedOption.isObject) {
            this._selectedObjectType = selectedOption.displayType;
            valParts.pop();
            this._selectedFieldPath = valParts.join(".");
          }
        });
      }
    }
  }

  generateMergeFieldsFromBuilderContext(builderContext) {
    // console.log('generateMergeFieldsFromBuilderContext: ', JSON.stringify(builderContext));
    const optionsByType = {};
    let key = 0;

    this.getTypes().forEach((curType) => {
      const typeParts = curType.split("."); // e.g. 'screen.fields'
      let typeOptions = [];

      // Does builderContext have a "start" property
      // If so we need to parse the "object" value
      if (builderContext?.start) {
        this._RecordObject = builderContext.start.object;
      }

      if (typeParts.length && builderContext[typeParts[0]]) {
        let objectToExamine = builderContext;
        let parentNodeLabel = "";
        typeParts.forEach((curTypePart) => {
          if (objectToExamine[curTypePart]) {
            objectToExamine = objectToExamine[curTypePart].map((curItem) => {
              parentNodeLabel = curItem.label ? curItem.label : curItem.name;
              return {
                ...curItem,
                varApiName: curItem.name,
                varLabel: parentNodeLabel
              };
            });
          } else {
            if (Array.isArray(objectToExamine)) {
              let allObjectToExamine = [];
              objectToExamine.forEach((curObjToExam) => {
                if (!curObjToExam.storeOutputAutomatically) {
                  allObjectToExamine = [
                    ...allObjectToExamine,
                    ...curObjToExam[curTypePart].map((curItem) => {
                      return {
                        ...curItem,
                        varApiName: curObjToExam.name + "." + curItem.name,
                        varLabel:
                          (curObjToExam.label
                            ? curObjToExam.label
                            : parentNodeLabel) +
                          ": " +
                          curItem.name
                      };
                    })
                  ];
                }
              });
              objectToExamine = allObjectToExamine;
            }
          }
        });
        const localType = this.getTypeDescriptor(curType);

        const curTypeOptions = this.getOptionLines(
          objectToExamine,
          "varLabel",
          "varApiName",
          "dataType",
          localType.isCollectionField
            ? localType.isCollectionField
            : flowComboboxDefaults.isCollectionField,
          localType.objectTypeField ? localType.objectTypeField : "objectType",
          localType
        );
        if (curTypeOptions.length) {
          typeOptions = [...typeOptions, ...curTypeOptions];
        }
        if (typeOptions.length) {
          // let localType = this.getTypeDescriptor(curType).label;
          if (optionsByType[localType.label]) {
            optionsByType[localType.label] = [
              ...optionsByType[localType.label],
              ...typeOptions
            ];
          } else {
            optionsByType[localType.label] = typeOptions;
          }
        }
      } else {
        console.log(curType + " is undefined");
      }
    });

    // Add Global Variables
    const globalVariables = {
      globalVariables: [
        {
          type: "String",
          label: "$Flow",
          value: "$Flow",
          isCollection: false,
          objectType: "objectType",
          optionIcon: "variable",
          isObject: false,
          globalVariable: true,
          displayType: "String",
          key: flowComboboxDefaults.defaultGlobalVariableKeyPrefix + key++,
          flowType: "reference",
          storeOutputAutomatically: false
        },
        {
          type: "String",
          label: "$User",
          value: "$User",
          isCollection: false,
          objectType: "objectType",
          optionIcon: "variable",
          isObject: false,
          globalVariable: true,
          displayType: "String",
          key: flowComboboxDefaults.defaultGlobalVariableKeyPrefix + key++,
          flowType: "reference",
          storeOutputAutomatically: false
        },
        {
          type: "String",
          label: "$UserRole",
          value: "$UserRole",
          isCollection: false,
          objectType: "objectType",
          optionIcon: "variable",
          isObject: false,
          globalVariable: true,
          displayType: "String",
          key: flowComboboxDefaults.defaultGlobalVariableKeyPrefix + key++,
          flowType: "reference",
          storeOutputAutomatically: false
        },
        {
          type: "String",
          label: "$Profile",
          value: "$Profile",
          isCollection: false,
          objectType: "objectType",
          optionIcon: "variable",
          isObject: false,
          globalVariable: true,
          displayType: "String",
          key: flowComboboxDefaults.defaultGlobalVariableKeyPrefix + key++,
          flowType: "reference",
          storeOutputAutomatically: false
        },
        {
          type: "String",
          label: "$System",
          value: "$System",
          isCollection: false,
          objectType: "objectType",
          optionIcon: "variable",
          isObject: false,
          globalVariable: true,
          displayType: "String",
          key: flowComboboxDefaults.defaultGlobalVariableKeyPrefix + key++,
          flowType: "reference",
          storeOutputAutomatically: false
        }
      ]
    };

    // If _RecordObject is defined, add it to the global variables
    if (this._RecordObject) {
      globalVariables.globalVariables.push(
        {
          type: "String",
          label: "$Record",
          value: "$Record",
          isCollection: false,
          objectType: "objectType",
          optionIcon: "variable",
          isObject: false,
          globalVariable: true,
          displayType: "String",
          key: flowComboboxDefaults.defaultGlobalVariableKeyPrefix + key++,
          flowType: "reference",
          storeOutputAutomatically: false
        },
        {
          type: "String",
          label: "$Record__Prior",
          value: "$Record__Prior",
          isCollection: false,
          objectType: "objectType",
          optionIcon: "variable",
          isObject: false,
          globalVariable: true,
          displayType: "String",
          key: flowComboboxDefaults.defaultGlobalVariableKeyPrefix + key++,
          flowType: "reference",
          storeOutputAutomatically: false
        }
      );
    }

    // Add globalFlowVariablev object to optionsByType object
    const globalVariablesType = this.getTypeDescriptor("globalVariables").label;
    if (optionsByType[globalVariablesType]) {
      optionsByType[globalVariablesType] = [
        ...optionsByType[globalVariablesType],
        ...globalVariables.globalVariables
      ];
    } else {
      optionsByType[globalVariablesType] = globalVariables.globalVariables;
    }
    // console.log('optionsByType', optionsByType)

    const options = [];
    const allOutputTypes = Object.keys(optionsByType);

    if (allOutputTypes.length) {
      allOutputTypes.forEach((curKey) => {
        options.push({ type: curKey, options: optionsByType[curKey] });
      });
    }
    return options;
  }

  getOptionLines(
    objectArray,
    labelField,
    valueField,
    typeField,
    isCollectionField,
    objectTypeField,
    typeDescriptor
  ) {
    // console.log('getOptionLines', JSON.stringify(objectArray), labelField, valueField, typeField, isCollectionField, objectTypeField, typeDescriptor);
    const typeOptions = [];
    objectArray.forEach((curObject) => {
      const isActionCall =
        typeDescriptor.apiName === flowComboboxDefaults.actionType;
      const isScreenAction =
        typeDescriptor.dataType === flowComboboxDefaults.screenActionType;
      const isScreenComponent =
        typeDescriptor.dataType === flowComboboxDefaults.screenComponentType &&
        curObject.storeOutputAutomatically;
      const isSection = curObject.name?.startsWith(
        flowComboboxDefaults.regionContainerName
      );
      const curDataType = isScreenAction
        ? flowComboboxDefaults.screenActionType
        : isActionCall
          ? flowComboboxDefaults.actionType
          : isScreenComponent
            ? flowComboboxDefaults.screenComponentType
            : this.getTypeByDescriptor(curObject[typeField], typeDescriptor);
      const label =
        isActionCall || isScreenAction
          ? OUTPUTS_FROM_LABEL + curObject.name
          : curObject[labelField]
            ? curObject[labelField]
            : curObject[valueField];
      const curIsCollection = this.isCollection(curObject, isCollectionField);
      const storeOutputAutomatically =
        (curObject.storeOutputAutomatically &&
          typeDescriptor.dataType !== "SObject") ||
        typeDescriptor.dataType === flowComboboxDefaults.screenActionType;
      if (
        !isSection &&
        (!isScreenAction || this.automaticOutputVariables[curObject.name])
      ) {
        typeOptions.push(
          this.generateOptionLine(
            curDataType,
            label, //curObject[labelField] ? curObject[labelField] : curObject[valueField],
            typeDescriptor.dataType === flowComboboxDefaults.screenComponentType
              ? curObject[valueField].split(".")[1]
              : curObject[valueField], // For the split "Child_Case_Creation_Form.Text_Area" would be "Text_Area" only for screen components
            typeDescriptor.apiName === flowComboboxDefaults.recordLookupsType
              ? !curIsCollection
              : !!curIsCollection,
            curObject[objectTypeField],
            this.getIconNameByType(curDataType),
            curDataType === flowComboboxDefaults.dataTypeSObject ||
              typeDescriptor.apiName === flowComboboxDefaults.recordLookupsType,
            curDataType === flowComboboxDefaults.dataTypeSObject
              ? curObject[objectTypeField]
              : curDataType,
            flowComboboxDefaults.defaultKeyPrefix + this.key++,
            null,
            //curObject.storeOutputAutomatically && typeDescriptor.dataType !== 'SObject'
            storeOutputAutomatically
          )
        );
      }
    });
    return typeOptions;
  }

  isCollection(curObject, isCollectionField) {
    if (Object.prototype.hasOwnProperty.call(curObject, isCollectionField)) {
      return coerceFlowBoolean(curObject[isCollectionField]);
    }
    return coerceFlowBoolean(curObject[flowComboboxDefaults.isCollectionField]);
  }

  matchesBuilderContextFilter(option, filterType, hasCollectionFilter) {
    if (!filterType) {
      return true;
    }

    const optionType = String(option.type || "").toLowerCase();
    const optionDisplayType = String(option.displayType || "").toLowerCase();

    if (filterType === "sobject") {
      return optionType === "sobject" || option.isObject === true;
    }

    return (
      optionDisplayType === filterType ||
      optionType === filterType ||
      (option.storeOutputAutomatically === true && !hasCollectionFilter)
    );
  }

  getTypeByDescriptor(curObjectFieldType, typeDescriptor) {
    if (!typeDescriptor) {
      return flowComboboxDefaults.stringDataType;
    } else if (
      typeDescriptor.apiName === flowComboboxDefaults.recordLookupsType
    ) {
      return flowComboboxDefaults.dataTypeSObject;
    }
    return curObjectFieldType
      ? curObjectFieldType
      : flowComboboxDefaults.stringDataType;
  }

  generateOptionLine(
    type,
    label,
    value,
    isCollection,
    objectType,
    optionIcon,
    isObject,
    displayType,
    key,
    flowType,
    storeOutputAutomatically
  ) {
    return {
      type: type,
      label: label,
      value: value,
      isCollection: isCollection,
      objectType: objectType,
      optionIcon: optionIcon,
      isObject: isObject,
      globalVariable: false,
      displayType: displayType,
      key: key,
      flowType: flowType ? flowType : flowComboboxDefaults.referenceDataType,
      storeOutputAutomatically: storeOutputAutomatically
    };
  }

  handleOpenObject(event) {
    this.doOpenObject(
      event,
      event.currentTarget.dataset.optionValue,
      event.currentTarget.dataset.objectType
    );
  }

  handleOpenScreenComponent(event) {
    const screenComponentName =
      event.currentTarget.dataset.optionValue.split(".");
    this.doOpenAction(
      event,
      screenComponentName.length > 1
        ? screenComponentName[1]
        : event.currentTarget.dataset.optionValue
    );
  }

  handleSetSelectedRecord(event) {
    event.stopPropagation(); // stops the window generic click handlers from firing 2x more times

    if (event.currentTarget.dataset) {
      if (
        this._value &&
        this._value.endsWith(event.currentTarget.dataset.value) &&
        event.currentTarget.dataset.objectType
      ) {
        this.doOpenObject(
          event,
          event.currentTarget.dataset.value,
          event.currentTarget.dataset.objectType
        );
      } else {
        this._dataType = event.currentTarget.dataset.flowType;
        this._selectedOptionObjectType =
          event.currentTarget.dataset.objectType || "";
        this._selectedOptionIsCollection =
          event.currentTarget.dataset.isCollection === "true";
        this.applyInternalValue(
          this.getFullPath(
            this._selectedFieldPath,
            event.currentTarget.dataset.value
          )
        );
        this.isDataModified = true;
        this.hasError = false;
        this.closeOptionDialog();
      }
    }
  }

  handleOpenGlobalVariable(event) {
    // console.log('handleOpenGlobalVariable', JSON.stringify(event.currentTarget.dataset));
    this.doOpenGlobalVariable(event, event.currentTarget.dataset.optionValue);
  }

  doOpenGlobalVariable(event, value) {
    event.stopPropagation();
    // console.log('doOpenGlobalVariable', value);
    const tempOptions = [];
    let objectName = "";

    // Switch Statement to handle different types of global variables
    switch (value) {
      case "$Flow":
        tempOptions.push(
          {
            type: "String",
            label: "ActiveStages",
            value: "ActiveStages",
            isCollection: false,
            objectType: "objectType",
            optionIcon: "variable",
            isObject: false,
            globalVariable: false,
            displayType: "String",
            key:
              flowComboboxDefaults.defaultGlobalVariableKeyPrefix + this.key++,
            flowType: "reference",
            storeOutputAutomatically: false
          },
          {
            type: "String",
            label: "CurrentStage",
            value: "CurrentStage",
            isCollection: false,
            objectType: "objectType",
            optionIcon: "variable",
            isObject: false,
            globalVariable: false,
            displayType: "String",
            key:
              flowComboboxDefaults.defaultGlobalVariableKeyPrefix + this.key++,
            flowType: "reference",
            storeOutputAutomatically: false
          },
          {
            type: "Date",
            label: "CurrentDate",
            value: "CurrentDate",
            isCollection: false,
            objectType: "objectType",
            optionIcon: "variable",
            isObject: false,
            globalVariable: false,
            displayType: "Date",
            key:
              flowComboboxDefaults.defaultGlobalVariableKeyPrefix + this.key++,
            flowType: "reference",
            storeOutputAutomatically: false
          },
          {
            type: "DateTime",
            label: "CurrentDateTime",
            value: "CurrentDateTime",
            isCollection: false,
            objectType: "objectType",
            optionIcon: "variable",
            isObject: false,
            globalVariable: false,
            displayType: "DateTime",
            key:
              flowComboboxDefaults.defaultGlobalVariableKeyPrefix + this.key++,
            flowType: "reference",
            storeOutputAutomatically: false
          },
          {
            type: "String",
            label: "CurrentRecord",
            value: "CurrentRecord",
            isCollection: false,
            objectType: "objectType",
            optionIcon: "variable",
            isObject: false,
            globalVariable: false,
            displayType: "String",
            key:
              flowComboboxDefaults.defaultGlobalVariableKeyPrefix + this.key++,
            flowType: "reference",
            storeOutputAutomatically: false
          },
          {
            type: "String",
            label: "FaultMessage",
            value: "FaultMessage",
            isCollection: false,
            objectType: "objectType",
            optionIcon: "variable",
            isObject: false,
            globalVariable: false,
            displayType: "String",
            key:
              flowComboboxDefaults.defaultGlobalVariableKeyPrefix + this.key++,
            flowType: "reference",
            storeOutputAutomatically: false
          },
          {
            type: "String",
            label: "InterviewGuid",
            value: "InterviewGuid",
            isCollection: false,
            objectType: "objectType",
            optionIcon: "variable",
            isObject: false,
            globalVariable: false,
            displayType: "String",
            key:
              flowComboboxDefaults.defaultGlobalVariableKeyPrefix + this.key++,
            flowType: "reference",
            storeOutputAutomatically: false
          },
          {
            type: "Time",
            label: "InterviewStartTime",
            value: "InterviewStartTime",
            isCollection: false,
            objectType: "objectType",
            optionIcon: "variable",
            isObject: false,
            globalVariable: false,
            displayType: "Time",
            key:
              flowComboboxDefaults.defaultGlobalVariableKeyPrefix + this.key++,
            flowType: "reference",
            storeOutputAutomatically: false
          }
        );
        break;
      case "$User":
        // Get Fields from User
        objectName = "User";
        getObjectFields({ objectName: objectName }).then((result) => {
          // console.log('result', result);
          const fields = this.shallowCloneArray(result);
          fields.forEach((field) => {
            tempOptions.push({
              type: field.type,
              label: field.label,
              value: field.name,
              isCollection: false,
              objectType: "objectType",
              optionIcon: "variable",
              isObject: false,
              globalVariable: false,
              displayType: "String",
              key:
                flowComboboxDefaults.defaultGlobalVariableKeyPrefix +
                this.key++,
              flowType: "reference",
              storeOutputAutomatically: false
            });
          });
          // Set the Options
          this.setOptions([{ type: value + " Outputs", options: tempOptions }]);
        });
        break;
      case "$System":
        // Get Fields from System
        tempOptions.push({
          type: "String",
          label: "OriginDateTime",
          value: "OriginDateTime",
          isCollection: false,
          objectType: "objectType",
          optionIcon: "variable",
          isObject: false,
          globalVariable: false,
          displayType: "String",
          key: flowComboboxDefaults.defaultGlobalVariableKeyPrefix + this.key++,
          flowType: "reference",
          storeOutputAutomatically: false
        });
        break;
      case "$Profile":
        // Get Fields from Profile
        objectName = "Profile";
        getObjectFields({ objectName: objectName }).then((result) => {
          // console.log('result', result);
          const fields = this.shallowCloneArray(result);
          fields.forEach((field) => {
            tempOptions.push({
              type: field.type,
              label: field.label,
              value: field.name,
              isCollection: false,
              objectType: "objectType",
              optionIcon: "variable",
              isObject: false,
              globalVariable: false,
              displayType: "String",
              key:
                flowComboboxDefaults.defaultGlobalVariableKeyPrefix +
                this.key++,
              flowType: "reference",
              storeOutputAutomatically: false
            });
          });
          // Set the Options
          this.setOptions([{ type: value + " Outputs", options: tempOptions }]);
        });
        break;
      case "$UserRole":
        // Get Fields from UserRole
        objectName = "UserRole";
        getObjectFields({ objectName: objectName }).then((result) => {
          // console.log('result', result);
          const fields = this.shallowCloneArray(result);
          fields.forEach((field) => {
            tempOptions.push({
              type: field.type,
              label: field.label,
              value: field.name,
              isCollection: false,
              objectType: "objectType",
              optionIcon: "variable",
              isObject: false,
              globalVariable: false,
              displayType: "String",
              key:
                flowComboboxDefaults.defaultGlobalVariableKeyPrefix +
                this.key++,
              flowType: "reference",
              storeOutputAutomatically: false
            });
          });
          // Set the Options
          this.setOptions([{ type: value + " Outputs", options: tempOptions }]);
        });
        break;
      case "$Record":
        // Get Fields from Record
        objectName = this._RecordObject;
        getObjectFields({ objectName: objectName }).then((result) => {
          // console.log('result', result);
          const fields = this.shallowCloneArray(result);
          fields.forEach((field) => {
            tempOptions.push({
              type: field.type,
              label: field.label,
              value: field.name,
              isCollection: false,
              objectType: "objectType",
              optionIcon: "variable",
              isObject: false,
              globalVariable: false,
              displayType: "String",
              key:
                flowComboboxDefaults.defaultGlobalVariableKeyPrefix +
                this.key++,
              flowType: "reference",
              storeOutputAutomatically: false
            });
          });
          // Set the Options
          this.setOptions([{ type: value + " Outputs", options: tempOptions }]);
        });
        break;
      case "$Record__Prior":
        // Get Fields from Record
        objectName = this._RecordObject;
        getObjectFields({ objectName: objectName }).then((result) => {
          // console.log('result', result);
          const fields = this.shallowCloneArray(result);
          fields.forEach((field) => {
            tempOptions.push({
              type: field.type,
              label: field.label,
              value: field.name,
              isCollection: false,
              objectType: "objectType",
              optionIcon: "variable",
              isObject: false,
              globalVariable: false,
              displayType: "String",
              key:
                flowComboboxDefaults.defaultGlobalVariableKeyPrefix +
                this.key++,
              flowType: "reference",
              storeOutputAutomatically: false
            });
          });
          // Set the Options
          this.setOptions([{ type: value + " Outputs", options: tempOptions }]);
        });
        break;

      default:
        return null;
    }

    this._selectedFieldPath =
      (this._selectedFieldPath ? this._selectedFieldPath + "." : "") + value;
    this.applyInternalValue(this._selectedFieldPath + ".");

    // Set the Options
    this.setOptions([{ type: value + " Outputs", options: tempOptions }]);

    return undefined;
  }

  doOpenObject(event, value, objectType) {
    event.stopPropagation();
    this._selectedFieldPath =
      (this._selectedFieldPath ? this._selectedFieldPath + "." : "") + value;
    this.applyInternalValue(this._selectedFieldPath + ".");
    this._selectedObjectType = objectType;
  }

  doOpenAction(event, value) {
    event.stopPropagation();
    this._selectedFieldPath =
      (this._selectedFieldPath ? this._selectedFieldPath + "." : "") + value;
    this.applyInternalValue(this._selectedFieldPath + ".");
    // this.getActionOutputs(value);
    this.getActionOutputs(this._selectedFieldPath);
  }

  // getActionOutputs(actionName) {
  getActionOutputs(path) {
    const tempOptions = [];
    // this.automaticOutputVariables[actionName].forEach(
    this.automaticOutputVariables[path].forEach((output) => {
      const curObjectType = output.sobjectType
        ? output.sobjectType
        : output.subtype;
      const curDataType =
        output.dataType === "sobject" ? "SObject" : output.dataType;
      tempOptions.push(
        this.generateOptionLine(
          output.dataType,
          output.label ? output.label : output.apiName,
          output.apiName ? output.apiName : output.name,
          output.maxOccurs > 1,
          curObjectType,
          this.getIconNameByType(curDataType),
          curDataType === "SObject",
          curDataType === "SObject" ? curObjectType : curDataType,
          flowComboboxDefaults.defaultKeyPrefix + this.key++,
          undefined,
          !!this.automaticOutputVariables[path + "." + output.apiName]
        )
      );
    });
    // this.setOptions([{type: actionName + ' Outputs', options: tempOptions}]);
    this.setOptions([{ type: path + " Outputs", options: tempOptions }]);
  }

  dispatchValueChangedEvent() {
    const valueChangedEvent = new CustomEvent("valuechanged", {
      detail: {
        id: this.name,
        newValue: this._value ? this._value : "",
        newValueDataType: this._dataType,
        objectType: this._selectedOptionObjectType || "",
        isCollection: this._selectedOptionIsCollection === true
      }
    });
    this.dispatchEvent(valueChangedEvent);
  }

  resetData() {
    this.applyInternalValue("");
    this.resetTypeOptions();
    this.closeOptionDialog();
  }

  resetTypeOptions() {
    this.isDataModified = true;
    this._selectedFieldPath = "";
    this._selectedObjectType = null;
    this._selectedOptionObjectType = "";
    this._selectedOptionIsCollection = false;
    this._dataType = flowComboboxDefaults.stringDataType;
    this.setOptions(this._mergeFields);
  }

  openOptionDialog() {
    // this.isDataSelected = false;
    this.isMenuOpen = true;
    this.dropdownClass =
      "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click slds-is-open";
  }

  closeOptionDialog(setValueInput) {
    if (this._value) {
      this.isDataSelected = true;
    }
    this.isMenuOpen = false;
    this.dropdownClass =
      "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click";

    if (setValueInput) {
      this.setValueInput();
    }

    if (this.isDataModified) {
      this.dispatchValueChangedEvent();
      this.isDataModified = false;
    }
  }

  connectedCallback() {
    this._boundWindowClick =
      this._boundWindowClick || this.handleWindowClick.bind(this);
    this._boundInputBlur =
      this._boundInputBlur || this.handleInputFocus.bind(this);
    document.addEventListener("click", this._boundWindowClick);
    document.addEventListener("blur", this._boundInputBlur);
  }

  disconnectedCallback() {
    if (this._boundWindowClick) {
      document.removeEventListener("click", this._boundWindowClick);
    }
    if (this._boundInputBlur) {
      document.removeEventListener("blur", this._boundInputBlur);
    }
  }

  handleWindowClick(event) {
    const path =
      typeof event.composedPath === "function"
        ? event.composedPath()
        : event.path || [];
    const target = event.target;
    const clickedInside = path.length
      ? path.includes(this.template.host)
      : target === this.template.host || this.template.host.contains?.(target);

    if (!clickedInside && !this.selfEvent) {
      this.closeOptionDialog(true);
    }

    this.selfEvent = false;
  }

  processOptions(searchString) {
    let searchLC = "";

    if (searchString) {
      const searchParts = searchString.split(".");
      searchLC = searchParts[searchParts.length - 1].toLowerCase();
    }

    const cacheKey =
      !searchLC && !(this._staticOptions && this._staticOptions.length)
        ? `${this.builderContextFilterType || ""}|${String(
            this.builderContextFilterCollectionBoolean
          )}`
        : "";
    const cachedOptions =
      cacheKey && this.allOptions
        ? PROCESSED_OPTIONS_CACHE.get(this.allOptions)?.get(cacheKey)
        : null;
    if (cachedOptions) {
      this._options = cachedOptions;
      return;
    }

    this._options = [];
    if (this.allOptions && this.allOptions.length) {
      this.allOptions.forEach((curOption) => {
        let localOptions = curOption.options;

        // Coerce the collection filter to a real boolean. Bare HTML attributes
        // (e.g. `<c-newton-selector-flow-cpe-resource-selector builder-context-filter-collection-boolean>`) arrive
        // as empty string `""`, which breaks the strict `isCollection === ...`
        // compare below. Treat `""` and `"true"` as `true`; explicit `{false}`
        // stays false. `undefined` means "no filter" and is preserved.
        const filterColRaw = this.builderContextFilterCollectionBoolean;
        const filterColDefined = typeof filterColRaw !== "undefined";
        const filterColBool =
          filterColRaw === "" ||
          filterColRaw === "true" ||
          filterColRaw === true;

        if (this.builderContextFilterType) {
          const filterType = this.builderContextFilterType.toLowerCase();
          localOptions = localOptions.filter((opToFilter) =>
            this.matchesBuilderContextFilter(
              opToFilter,
              filterType,
              filterColDefined
            )
          );
        }

        if (filterColDefined) {
          localOptions = localOptions.filter((opToFilter) => {
            return opToFilter.isCollection === filterColBool;
          });
        }

        if (searchLC) {
          localOptions = localOptions.filter(
            (opToFilter) =>
              opToFilter.label.toLowerCase().includes(searchLC) ||
              opToFilter.value
                .toLowerCase()
                .includes(searchLC.replace(/\W/g, ""))
          );
        }

        if (localOptions.length) {
          this._options.push({
            ...curOption,
            ...{
              options: localOptions
            }
          });
        }
      });
    }

    if (this._staticOptions && this._staticOptions.length) {
      this._options.push({
        type: this.labels.staticOptionsLabel,
        options: this._staticOptions.map((curOption) => {
          return this.generateOptionLine(
            flowComboboxDefaults.stringDataType,
            curOption.label,
            curOption.value,
            false,
            flowComboboxDefaults.stringDataType,
            "type",
            false,
            flowComboboxDefaults.stringDataType,
            flowComboboxDefaults.defaultKeyPrefix + this.key++,
            flowComboboxDefaults.stringDataType //,
            //curOption.type === "ACTIONS" ? true : false
          );
        })
      });
    }

    if (cacheKey && this.allOptions) {
      let cacheForOptions = PROCESSED_OPTIONS_CACHE.get(this.allOptions);
      if (!cacheForOptions) {
        cacheForOptions = new Map();
        PROCESSED_OPTIONS_CACHE.set(this.allOptions, cacheForOptions);
      }
      cacheForOptions.set(cacheKey, this._options);
    }
  }

  getIconNameByType(variableType) {
    return this.iconsPerType[variableType];
  }

  handleOpenOptions() {
    // event.stopPropagation();
    this.selfEvent = true;
    if (this.isMenuOpen) {
      this.isDataSelected = false;
      this._value = formattedValue(this._value, this._dataType);
    } else {
      this.openOptionDialog();
    }
  }

  handleOpenEditDialog(event) {
    event.stopPropagation();
    this.handleOpenOptions();
  }

  handleCloseOptions() {
    this.closeOptionDialog();
  }

  handleSearchField(event) {
    if (event.target) {
      const currentText = event.target.value;
      this._dataType = getDataType(currentText);
      if (!currentText || !currentText.includes(".")) {
        this.resetTypeOptions();
        this.setOptions(this._mergeFields);
      }
      this.isDataModified = true;
      this.isDataSelected = false;

      this.processOptions(currentText);
      if (this.allOptions.length) {
        this.openOptionDialog();
      }
    }
  }

  handleSearchKeyUp(event) {
    if (event.key === "Enter" || event.key === "Tab") {
      this.toggleMenu();
    }
  }

  toggleMenu() {
    if (this.isMenuOpen) {
      this.closeOptionDialog(true);
    } else {
      this.openOptionDialog();
    }
  }

  handleKeyDown(event) {
    if (this.isMenuOpen && (event.key === "Tab" || event.key === "Escape")) {
      this.closeOptionDialog(true);
      if (event.key === "Escape") {
        event.stopPropagation();
      }
    }
  }

  setValueInput() {
    const valueInput = this.template.querySelector(".value-input");
    if (valueInput) {
      this.hasError = false;
      const isRef = isReference(valueInput.value);
      this._value = removeFormatting(valueInput.value);
      if (isRef) {
        const typeOption = this.getTypeOption(this._value);
        if (!typeOption && !this._allowHardCodeReference) {
          this.hasError = true;
        }
        this._dataType = flowComboboxDefaults.referenceDataType;
      } else {
        this._dataType = flowComboboxDefaults.stringDataType;
      }

      // checkValidity on valueInput
      if (!valueInput.checkValidity()) {
        this.hasError = true;
      }
    }
  }

  getFullPath(path, val) {
    return (path ? path + "." : "") + val;
  }

  get inputStyle() {
    if (this.maxWidth) {
      return "max-width: " + this.maxWidth + "px;";
    }
    return "";
  }

  @api
  reportValidity() {
    return !this.hasError;
  }

  get formElementClass() {
    let resultClass = "slds-form-element";
    if (this.hasError) {
      resultClass += " slds-has-error slds-m-bottom_medium";
    }
    return resultClass;
  }

  get labelClass() {
    return this.variant === "label-hidden"
      ? "slds-assistive-text"
      : "slds-form-element__label custom-width-full";
  }

  get labelClassForPill() {
    return this.variant === "label-hidden"
      ? "slds-assistive-text"
      : "slds-form-element__label slds-no-flex custom-width-full";
  }

  showToast(title, message, variant) {
    const showToast = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    });
    this.dispatchEvent(showToast);
  }

  handleInputFocus() {
    if (this._value) {
      this.isDataSelected = true;
    }
    //this.isMenuOpen = false;
    //this.dropdownClass = 'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click';

    this.setValueInput();

    if (this.isDataModified) {
      this.dispatchValueChangedEvent();
      this.isDataModified = false;
    }
  }

  shallowCloneArray(arrayToClone) {
    if (!Array.isArray(arrayToClone)) return null;

    const newArray = [];
    for (const el of arrayToClone) {
      newArray.push(Object.assign({}, el));
    }
    return newArray;
  }
}
