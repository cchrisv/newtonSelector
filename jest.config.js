const { jestConfig } = require("@salesforce/sfdx-lwc-jest/config");

module.exports = {
  ...jestConfig,
  modulePathIgnorePatterns: ["<rootDir>/.localdevserver"],
  moduleNameMapper: {
    ...(jestConfig.moduleNameMapper || {}),
    "^c/newtonUtilitySelectorConfigStyles$":
      "<rootDir>/force-app/test/jest-mocks/newtonUtilitySelectorConfigStyles",
    "^lightning/flowSupport$":
      "<rootDir>/force-app/test/jest-mocks/lightning/flowSupport"
  }
};
