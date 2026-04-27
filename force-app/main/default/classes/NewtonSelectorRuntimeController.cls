public with sharing class NewtonSelectorRuntimeController {
  @AuraEnabled(cacheable=true)
  public static List<NewtonSelectorItemDTO> queryItems(String configJson) {
    try {
      if (String.isBlank(configJson)) {
        throw new NewtonSelectorException(
          'Selector configuration is required.'
        );
      }
      NewtonSelectorQueryDTO config = (NewtonSelectorQueryDTO) JSON.deserialize(
        configJson,
        NewtonSelectorQueryDTO.class
      );
      return NewtonSelectorService.fetchItems(config);
    } catch (NewtonSelectorException e) {
      throw new AuraHandledException(e.getMessage());
    } catch (System.JSONException e) {
      throw new AuraHandledException('Invalid picker configuration.');
    } catch (Exception e) {
      throw new AuraHandledException('Unable to load picker options.');
    }
  }

  @AuraEnabled(cacheable=false)
  public static NewtonSelectorQueryValidationResultDTO validateQuery(
    String configJson
  ) {
    try {
      if (String.isBlank(configJson)) {
        throw new NewtonSelectorException(
          'Selector configuration is required.'
        );
      }
      NewtonSelectorQueryDTO config = (NewtonSelectorQueryDTO) JSON.deserialize(
        configJson,
        NewtonSelectorQueryDTO.class
      );
      config.queryLimit = 1;
      String soql = NewtonSelectorRecordQuery.previewSoql(config);
      NewtonSelectorService.fetchItems(config);
      return NewtonSelectorQueryValidationResultDTO.success(
        'Query validated successfully.',
        soql
      );
    } catch (NewtonSelectorException e) {
      return NewtonSelectorQueryValidationResultDTO.failure(e.getMessage());
    } catch (System.JSONException e) {
      return NewtonSelectorQueryValidationResultDTO.failure(
        'Invalid picker configuration.'
      );
    } catch (Exception e) {
      return NewtonSelectorQueryValidationResultDTO.failure(
        'Unable to validate this query.'
      );
    }
  }
}
