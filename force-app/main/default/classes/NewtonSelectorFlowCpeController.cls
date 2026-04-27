/**
 * @description Apex building blocks for Professor Flow's CPE Toolkit. Exposes three AuraEnabled
 * methods consumed by the LWCs in the pack: SObject search, field search, and object-fields describe.
 */
@SuppressWarnings('PMD.CognitiveComplexity, PMD.CyclomaticComplexity')
public with sharing class NewtonSelectorFlowCpeController {
  private static final Integer MAX_LOOKUP_ROWS = 80;
  private static final Integer MAX_FIELD_LOOKUP_ROWS = 2000;

  private static final Set<Schema.DisplayType> LOOKUP_FIELD_SKIP_TYPES = new Set<Schema.DisplayType>{
    Schema.DisplayType.BASE64,
    Schema.DisplayType.ADDRESS,
    Schema.DisplayType.LOCATION
  };

  private static final Map<String, String> FIELD_TYPE_ICON_MAP = new Map<String, String>{
    'STRING' => 'utility:text',
    'TEXTAREA' => 'utility:textarea',
    'INTEGER' => 'utility:number_input',
    'LONG' => 'utility:number_input',
    'DOUBLE' => 'utility:number_input',
    'CURRENCY' => 'utility:currency',
    'PERCENT' => 'utility:percent',
    'BOOLEAN' => 'utility:check',
    'DATE' => 'utility:date_input',
    'DATETIME' => 'utility:date_time',
    'TIME' => 'utility:clock',
    'PICKLIST' => 'utility:picklist_type',
    'COMBOBOX' => 'utility:picklist_type',
    'MULTIPICKLIST' => 'utility:multi_select_picklist',
    'REFERENCE' => 'utility:record_lookup',
    'EMAIL' => 'utility:email',
    'PHONE' => 'utility:phone_portrait',
    'URL' => 'utility:link',
    'ID' => 'utility:key',
    'ADDRESS' => 'utility:location',
    'LOCATION' => 'utility:location',
    'ENCRYPTEDSTRING' => 'utility:lock',
    'BASE64' => 'utility:image',
    'ANYTYPE' => 'utility:text',
    'COMPLEXVALUE' => 'utility:recipe',
    'DATACATEGORYGROUPREFERENCE' => 'utility:recipe',
    'SOBJECT' => 'utility:sobject'
  };

  /** @description Shared row for pickers and lookup results (LWC normalizes to label/value). */
  public class ChoiceOption implements Comparable {
    @AuraEnabled
    public String value;
    @AuraEnabled
    public String label;
    @AuraEnabled
    public String subtitle;
    @AuraEnabled
    public String icon;
    @AuraEnabled
    public String sObjectType;

    @SuppressWarnings('PMD.ExcessiveParameterList')
    public ChoiceOption(
      String value,
      String label,
      String subtitle,
      String icon,
      String sObjectType
    ) {
      this.value = value;
      this.label = label;
      this.subtitle = subtitle;
      this.icon = icon;
      this.sObjectType = sObjectType;
    }

    public Integer compareTo(Object other) {
      ChoiceOption o = (ChoiceOption) other;
      String a = this.label == null ? '' : this.label;
      String b = o.label == null ? '' : o.label;
      return a.compareTo(b);
    }
  }

  /** @description Serializable field row for LWC resource picker / field picker. */
  public class Field {
    @AuraEnabled
    public String name;
    @AuraEnabled
    public String label;
    @AuraEnabled
    public String type;
    @AuraEnabled
    public String parentObjectName;
    @AuraEnabled
    public String relationshipName;

    public Field(String n, String l, String t) {
      name = n;
      label = l;
      type = t;
    }
  }

  // ── Design-time: SObject / field pickers ─────────────────

  @AuraEnabled(cacheable=true)
  public static List<ChoiceOption> searchSObjectTypes(String searchKey) {
    try {
      return searchSObjectTypesCore(searchKey);
    } catch (Exception e) {
      throw new AuraHandledException(
        'searchSObjectTypes failed: ' + e.getMessage()
      );
    }
  }

  private static List<ChoiceOption> searchSObjectTypesCore(String searchKey) {
    List<ChoiceOption> rows = new List<ChoiceOption>();
    String k = searchKey == null ? '' : searchKey.trim().toLowerCase();
    for (Schema.SObjectType sot : Schema.getGlobalDescribe().values()) {
      Schema.DescribeSObjectResult d = sot.getDescribe();
      if (!d.isAccessible() || !d.isQueryable()) {
        continue;
      }
      String api = d.getName();
      String lab = d.getLabel() == null ? api : d.getLabel();
      if (k.length() > 0) {
        if (!api.toLowerCase().contains(k) && !lab.toLowerCase().contains(k)) {
          continue;
        }
      }
      rows.add(new ChoiceOption(api, lab, api, 'utility:sobject', api));
    }
    rows.sort();
    return capChoiceList(rows, MAX_LOOKUP_ROWS);
  }

  @AuraEnabled(cacheable=true)
  public static List<ChoiceOption> searchLookupDatasetFieldsForObject(
    String objectApiName,
    String searchKey
  ) {
    try {
      return searchLookupDatasetFieldsForObjectCore(objectApiName, searchKey);
    } catch (Exception e) {
      throw new AuraHandledException(
        'searchLookupDatasetFieldsForObject failed: ' + e.getMessage()
      );
    }
  }

  private static List<ChoiceOption> searchLookupDatasetFieldsForObjectCore(
    String objectApiName,
    String searchKey
  ) {
    List<ChoiceOption> out = new List<ChoiceOption>();
    if (String.isBlank(objectApiName)) {
      return out;
    }
    String k = searchKey == null ? '' : searchKey.trim().toLowerCase();
    Schema.SObjectType sot = resolveSObjectType(objectApiName);
    if (sot == null) {
      return out;
    }
    String canonicalObject = sot.getDescribe().getName();
    for (
      Schema.SObjectField token : sot.getDescribe().fields.getMap().values()
    ) {
      Schema.DescribeFieldResult fr = token.getDescribe();
      if (
        !fr.isAccessible() || LOOKUP_FIELD_SKIP_TYPES.contains(fr.getType())
      ) {
        continue;
      }
      String name = fr.getName();
      String lab = fr.getLabel();
      if (
        k.length() > 0 &&
        !name.toLowerCase().contains(k) &&
        (lab == null || !lab.toLowerCase().contains(k))
      ) {
        continue;
      }
      String fieldType = String.valueOf(fr.getType());
      out.add(
        new ChoiceOption(
          name,
          lab,
          name + ' — ' + fieldType,
          iconForFieldType(fieldType),
          canonicalObject
        )
      );
    }
    out.sort();
    return capChoiceList(out, MAX_FIELD_LOOKUP_ROWS);
  }

  @AuraEnabled(cacheable=true)
  public static List<Field> getObjectFields(String objectName) {
    try {
      return getObjectFieldsCore(objectName);
    } catch (Exception e) {
      throw new AuraHandledException(
        'getObjectFields failed: ' + e.getMessage()
      );
    }
  }

  private static List<Field> getObjectFieldsCore(String objectName) {
    List<Field> fields = new List<Field>();
    if (String.isBlank(objectName)) {
      return fields;
    }
    Schema.SObjectType sot = Schema.getGlobalDescribe().get(objectName);
    if (sot == null) {
      return fields;
    }
    Schema.DescribeSObjectResult describe = sot.getDescribe();
    if (!describe.isAccessible()) {
      return fields;
    }
    Map<String, Schema.SObjectField> tokenMap = describe.fields.getMap();
    for (String fn : tokenMap.keySet()) {
      Schema.DescribeFieldResult fr = tokenMap.get(fn).getDescribe();
      if (!fr.isAccessible()) {
        continue;
      }
      Field f = new Field(fr.getName(), fr.getLabel(), fr.getType().name());
      if (fr.getReferenceTo() != null && fr.getReferenceTo().size() == 1) {
        f.parentObjectName = fr.getReferenceTo()[0].getDescribe().getName();
        f.relationshipName = fr.getRelationshipName();
      }
      fields.add(f);
    }
    return fields;
  }

  // ── Private helpers ──────────────────────────────────────

  private static List<ChoiceOption> capChoiceList(
    List<ChoiceOption> rows,
    Integer maxN
  ) {
    if (rows.size() <= maxN) {
      return rows;
    }
    List<ChoiceOption> limited = new List<ChoiceOption>();
    for (Integer i = 0; i < maxN; i++) {
      limited.add(rows[i]);
    }
    return limited;
  }

  private static Schema.SObjectType resolveSObjectType(String objectApiName) {
    if (String.isBlank(objectApiName)) {
      return null;
    }
    String o = objectApiName.trim();
    Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
    Schema.SObjectType t = gd.get(o);
    if (t != null) {
      return t;
    }
    for (String k : gd.keySet()) {
      if (k != null && k.equalsIgnoreCase(o)) {
        return gd.get(k);
      }
    }
    return null;
  }

  private static String iconForFieldType(String fieldType) {
    if (fieldType == null) {
      return 'utility:text';
    }
    String icon = FIELD_TYPE_ICON_MAP.get(fieldType.toUpperCase());
    return icon != null ? icon : 'utility:text';
  }
}
