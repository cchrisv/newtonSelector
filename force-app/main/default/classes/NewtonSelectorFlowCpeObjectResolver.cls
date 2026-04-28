/** @description Object lookup helpers for Newton Selector Flow CPE describe services. */
public with sharing class NewtonSelectorFlowCpeObjectResolver {
  /**
   * @description Resolves an sObject token by exact or case-insensitive API name.
   * @param objectApiName Requested object API name.
   * @return Matching sObject type token, or null when not found.
   */
  public static Schema.SObjectType resolveSObjectType(String objectApiName) {
    if (String.isBlank(objectApiName)) {
      return null;
    }

    String trimmedObjectApiName = objectApiName.trim();
    Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
    Schema.SObjectType exactType = globalDescribe.get(trimmedObjectApiName);
    if (exactType != null) {
      return exactType;
    }

    for (String candidateName : globalDescribe.keySet()) {
      if (matchesObjectName(candidateName, trimmedObjectApiName)) {
        return globalDescribe.get(candidateName);
      }
    }
    return null;
  }

  /**
   * @description Gets a deferred object describe to avoid eager child relationship loading.
   * @param sObjectType SObject type token.
   * @return Deferred describe result.
   */
  public static Schema.DescribeSObjectResult describeSObject(
    Schema.SObjectType sObjectType
  ) {
    return sObjectType.getDescribe(SObjectDescribeOptions.DEFERRED);
  }

  private static Boolean matchesObjectName(
    String candidateName,
    String requestedName
  ) {
    return candidateName != null &&
      candidateName.equalsIgnoreCase(requestedName);
  }
}
