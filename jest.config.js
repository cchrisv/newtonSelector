const { jestConfig } = require("@salesforce/sfdx-lwc-jest/config");

module.exports = {
  ...jestConfig,
  modulePathIgnorePatterns: ["<rootDir>/.localdevserver"],
  moduleNameMapper: {
    ...(jestConfig.moduleNameMapper || {}),
    "^c/newtonSelectorFlowCpeUtilityConfigStyles$":
      "<rootDir>/force-app/test/jest-mocks/newtonSelectorFlowCpeUtilityConfigStyles",
    "^lightning/flowSupport$":
      "<rootDir>/force-app/test/jest-mocks/lightning/flowSupport"
  }
};
