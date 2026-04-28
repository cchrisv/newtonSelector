/** @description Choice-row helpers for Newton Selector Flow CPE describe responses. */
public with sharing class NewtonSelectorFlowCpeChoiceFactory {
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

  /** @description Choice row input. */
  public class ChoiceRequest {
    /** @description Emitted value. */
    public String value;
    /** @description Display label. */
    public String label;
    /** @description Secondary display text. */
    public String subtitle;
    /** @description SLDS icon name. */
    public String icon;
    /** @description Source object API name. */
    public String sObjectType;
  }

  /**
   * @description Builds a CPE choice row.
   * @param request Choice row input.
   * @return Choice row DTO.
   */
  public static NewtonSelectorFlowCpeController.ChoiceOption choice(
    ChoiceRequest request
  ) {
    NewtonSelectorFlowCpeController.ChoiceOption row = new NewtonSelectorFlowCpeController.ChoiceOption();
    row.value = request.value;
    row.label = request.label;
    row.subtitle = request.subtitle;
    row.icon = request.icon;
    row.sObjectType = request.sObjectType;
    return row;
  }

  /**
   * @description Caps choice rows to the configured maximum.
   * @param rows Candidate choice rows.
   * @param maxRows Maximum rows to return.
   * @return Original rows or capped copy.
   */
  public static List<NewtonSelectorFlowCpeController.ChoiceOption> capChoiceList(
    List<NewtonSelectorFlowCpeController.ChoiceOption> rows,
    Integer maxRows
  ) {
    if (rows.size() <= maxRows) {
      return rows;
    }

    List<NewtonSelectorFlowCpeController.ChoiceOption> limited = new List<NewtonSelectorFlowCpeController.ChoiceOption>();
    for (Integer i = 0; i < maxRows; i++) {
      limited.add(rows[i]);
    }
    return limited;
  }

  /**
   * @description Returns the SLDS utility icon for a field display type.
   * @param fieldType Field display type name.
   * @return SLDS utility icon name.
   */
  public static String iconForFieldType(String fieldType) {
    if (fieldType == null) {
      return 'utility:text';
    }
    String icon = FIELD_TYPE_ICON_MAP.get(fieldType.toUpperCase());
    return icon != null ? icon : 'utility:text';
  }
}
