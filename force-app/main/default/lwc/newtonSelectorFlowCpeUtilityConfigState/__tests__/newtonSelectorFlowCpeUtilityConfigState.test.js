import {
  mergeSelectorConfig,
  resolveRecordCollectionMetadataFromBuilderContext
} from "c/newtonSelectorFlowCpeUtilityConfigState";

describe("c-newton-selector-flow-cpe-utility-config-state", () => {
  it("deep-merges partial selector configs through the shared defaults", () => {
    const config = mergeSelectorConfig({
      dataSource: "collection",
      collection: {
        fieldMap: { label: "Name" }
      },
      gridConfig: {
        badge: { variant: "brand" }
      }
    });

    expect(config.collection.fieldMap).toEqual(
      expect.objectContaining({
        label: "Name",
        value: "",
        sublabel: "",
        icon: "",
        badge: "",
        helpText: ""
      })
    );
    expect(config.gridConfig.badge).toEqual(
      expect.objectContaining({
        position: "bottom-inline",
        variant: "brand",
        shape: "pill"
      })
    );
    expect(config.sobject).toEqual(
      expect.objectContaining({
        sObjectApiName: "",
        labelField: "Name",
        valueField: "Id"
      })
    );
  });

  it("resolves flow record collections from builder-context record operations", () => {
    const metadata = resolveRecordCollectionMetadataFromBuilderContext(
      {
        recordLookups: [
          {
            name: "Get_Contacts",
            object: "Contact",
            getFirstRecordOnly: "false"
          }
        ]
      },
      "{!Get_Contacts}"
    );

    expect(metadata.objectApiName).toBe("Contact");
  });
});
