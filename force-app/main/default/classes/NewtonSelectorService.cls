/** @description Runtime service that maps queried records into selector item DTOs. */
public with sharing class NewtonSelectorService {
  /**
   * @description Fetches records using the supplied query config and normalizes them for LWC.
   * @param config Selector query configuration.
   * @return Runtime selector item DTOs.
   */
  public static List<NewtonSelectorItemDTO> fetchItems(
    NewtonSelectorQueryDTO config
  ) {
    if (config == null) {
      throw new NewtonSelectorException('Query configuration is required.');
    }
    List<SObject> records = NewtonSelectorRecordQuery.query(config);
    return mapRecords(records, config);
  }

  private static List<NewtonSelectorItemDTO> mapRecords(
    List<SObject> records,
    NewtonSelectorQueryDTO config
  ) {
    List<NewtonSelectorItemDTO> dtos = new List<NewtonSelectorItemDTO>();
    if (records == null || records.isEmpty()) {
      return dtos;
    }

    for (Integer i = 0; i < records.size(); i++) {
      SObject record = records[i];
      dtos.add(mapSingle(record, config, i));
    }
    return dtos;
  }

  private static NewtonSelectorItemDTO mapSingle(
    SObject record,
    NewtonSelectorQueryDTO config,
    Integer index
  ) {
    NewtonSelectorItemDTO dto = new NewtonSelectorItemDTO();
    dto.id = String.valueOf(record.Id != null ? record.Id : 'rec-' + index);
    dto.label = readString(record, config.labelField);
    dto.sublabel = readString(record, config.sublabelField);
    dto.icon = readString(record, config.iconField);
    dto.badge = readString(record, config.badgeField);
    dto.helpText = readString(record, config.helpField);
    dto.value = resolveValue(record, config, dto.id);
    dto.disabled = false;
    return dto;
  }

  private static String readString(SObject record, String fieldApiName) {
    if (String.isBlank(fieldApiName)) {
      return '';
    }
    Object raw = record.get(fieldApiName);
    return raw == null ? '' : String.valueOf(raw);
  }

  private static String resolveValue(
    SObject record,
    NewtonSelectorQueryDTO config,
    String fallbackId
  ) {
    if (String.isNotBlank(config.valueField)) {
      String v = readString(record, config.valueField);
      if (String.isNotBlank(v)) {
        return v;
      }
    }
    return fallbackId;
  }
}
