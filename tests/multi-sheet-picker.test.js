const SpreadsheetApp = require("gasmask").SpreadsheetApp;
const mockLogger = require("gasmask").Logger;
const mockUrlFetchApp = require("gasmask").UrlFetchApp;
const rotaScript = require("../src/multi-sheet-picker");

globalThis.SpreadsheetApp = SpreadsheetApp;

let testSpreadsheet;
let testTeamSheet;
let testEngineerSheet;

const todaysDate = generateDateDaysAgo(0);
const todaysPrettyDate = new Date().toLocaleDateString("en-GB");

describe("The ceremony rota script", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    testSpreadsheet = SpreadsheetApp.create("Test Spreadsheet");
    testSpreadsheet.insertSheet("Team");
    testSpreadsheet.insertSheet("Engineers");
    testTeamSheet = testSpreadsheet.getSheetByName("Team");
    testEngineerSheet = testSpreadsheet.getSheetByName("Engineers");

    mockLogger.log = jest.fn();
    mockUrlFetchApp.fetch = jest.fn();
  });

  describe("when looking at standups", () => {
    it("should pick the first name from an empty column", () => {
      const testTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", todaysDate],
        ["Bob", "U456", "", ""],
      ];
      testTeamData.forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      buildDefaultEngineerData().forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      const expectedTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, todaysDate],
        ["Bob", "U456", "", ""],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(expectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(buildDefaultEngineerData());
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(expectedStandupMessage),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should pick the next name", () => {
      const testTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "01/01/1970", todaysDate],
        ["Bob", "U456", "", todaysDate],
      ];
      testTeamData.forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      buildDefaultEngineerData().forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      const expectedTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "01/01/1970", todaysDate],
        ["Bob", "U456", todaysPrettyDate, todaysDate],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U456>'s turn to run standups.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(expectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(buildDefaultEngineerData());
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(expectedStandupMessage),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledWith("Bob is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should clear a full column and pick the first name", () => {
      const testTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "01/01/1970", todaysDate],
        ["Bob", "U456", "08/01/1970", todaysDate],
      ];
      testTeamData.forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      buildDefaultEngineerData().forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      const expectedTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, todaysDate],
        ["Bob", "U456", "", todaysDate],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(expectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(buildDefaultEngineerData());
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(expectedStandupMessage),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(3);
      expect(mockLogger.log).toHaveBeenCalledWith("standup column reset");
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
  });

  describe("when looking at retros", () => {
    it("should pick the first name from an empty column", () => {
      const testTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", ""],
        ["Bob", "U456", "", ""],
      ];
      testTeamData.forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      buildDefaultEngineerData().forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      const expectedTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, todaysPrettyDate],
        ["Bob", "U456", "", ""],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";
      const expectedRetroMessage =
        "We've got our retro this week too, and <@U123> you're up.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(expectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(buildDefaultEngineerData());
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(expectedStandupMessage, expectedRetroMessage),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(4);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith(
        "no previous dates for retro",
      );
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for retro");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should pick the next name when all dates are 14 or more days ago", () => {
      const closestDate = generateDateDaysAgo(14);
      const earlierDate = generateDateDaysAgo(15);
      const testTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", earlierDate],
        ["Bob", "U456", "", ""],
        ["Charlie", "U789", "", closestDate],
      ];
      testTeamData.forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      buildDefaultEngineerData().forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      const expectedTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, earlierDate],
        ["Bob", "U456", "", todaysPrettyDate],
        ["Charlie", "U789", "", closestDate],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";
      const expectedRetroMessage =
        "We've got our retro this week too, and <@U456> you're up.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(expectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(buildDefaultEngineerData());
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(expectedStandupMessage, expectedRetroMessage),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(4);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("retro week");
      expect(mockLogger.log).toHaveBeenCalledWith("Bob is next for retro");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should not pick a name when there are any dates less than 14 days ago", () => {
      const closestDate = generateDateDaysAgo(13);
      const earlierDate = generateDateDaysAgo(14);
      const testTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", closestDate],
        ["Bob", "U456", "", ""],
        ["Charlie", "U789", "", earlierDate],
      ];
      testTeamData.forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      buildDefaultEngineerData().forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      const expectedTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, closestDate],
        ["Bob", "U456", "", ""],
        ["Charlie", "U789", "", earlierDate],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(expectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(buildDefaultEngineerData());
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(expectedStandupMessage),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should clear a full column and pick the first name when the last date is 14 or more days ago", () => {
      const pastDate = generateDateDaysAgo(14);
      const testTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", "01/01/1970"],
        ["Bob", "U456", "", "holiday"],
        ["Charlie", "U789", "", pastDate],
      ];
      testTeamData.forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      buildDefaultEngineerData().forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      const expectedTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, todaysPrettyDate],
        ["Bob", "U456", "", ""],
        ["Charlie", "U789", "", ""],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";
      const expectedRetroMessage =
        "We've got our retro this week too, and <@U123> you're up.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(expectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(buildDefaultEngineerData());
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(expectedStandupMessage, expectedRetroMessage),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(5);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("retro week");
      expect(mockLogger.log).toHaveBeenCalledWith("retro column reset");
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for retro");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should not modify a full column when the last date is less than 14 days ago", () => {
      const pastDate = generateDateDaysAgo(13);
      const testTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", "01/01/1970"],
        ["Bob", "U456", "", pastDate],
      ];
      testTeamData.forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      buildDefaultEngineerData().forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      const expectedTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, "01/01/1970"],
        ["Bob", "U456", "", pastDate],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(expectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(buildDefaultEngineerData());
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(expectedStandupMessage),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should ignore non-dates when looking for the last date", () => {
      const pastDate = generateDateDaysAgo(14);
      const testTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", pastDate],
        ["Bob", "U456", "", "holiday"],
        ["Charlie", "U789", "", ""],
      ];
      testTeamData.forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      buildDefaultEngineerData().forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      const expectedTeamData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, pastDate],
        ["Bob", "U456", "", "holiday"],
        ["Charlie", "U789", "", todaysPrettyDate],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";
      const expectedRetroMessage =
        "We've got our retro this week too, and <@U789> you're up.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(expectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(buildDefaultEngineerData());
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(expectedStandupMessage, expectedRetroMessage),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(4);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("retro week");
      expect(mockLogger.log).toHaveBeenCalledWith("Charlie is next for retro");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
  });

  describe("when looking at the support role", () => {
    it("should pick the first name from an empty column", () => {
      const testEngineerData = [
        ["Name", "Slack user ID", "Support week"],
        ["Dave", "U012", ""],
        ["Evan", "U345", ""],
      ];
      testEngineerData.forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      buildDefaultTeamData().forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      const expectedEngineerData = [
        ["Name", "Slack user ID", "Support week"],
        ["Dave", "U012", todaysPrettyDate],
        ["Evan", "U345", ""],
      ];
      const expectedSupportMessage =
        "It's also a new sprint, so <@U012> is on support.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(defaultExpectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(expectedEngineerData);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(
          defaultExpectedStandupMessage,
          expectedSupportMessage,
        ),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(4);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith(
        "no previous dates for support",
      );
      expect(mockLogger.log).toHaveBeenCalledWith("Dave is next for support");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should pick the next name when all dates are 14 or more days ago", () => {
      const closestDate = generateDateDaysAgo(14);
      const earlierDate = generateDateDaysAgo(15);
      const testEngineerData = [
        ["Name", "Slack user ID", "Support week"],
        ["Dave", "U012", earlierDate],
        ["Evan", "U345", ""],
        ["Fred", "U678", closestDate],
      ];
      testEngineerData.forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      buildDefaultTeamData().forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      const expectedEngineerData = [
        ["Name", "Slack user ID", "Support week"],
        ["Dave", "U012", earlierDate],
        ["Evan", "U345", todaysPrettyDate],
        ["Fred", "U678", closestDate],
      ];
      const expectedSupportMessage =
        "It's also a new sprint, so <@U345> is on support.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(defaultExpectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(expectedEngineerData);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(
          defaultExpectedStandupMessage,
          expectedSupportMessage,
        ),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(4);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("support week");
      expect(mockLogger.log).toHaveBeenCalledWith("Evan is next for support");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should not pick a name when there are any dates less than 14 days ago", () => {
      const closestDate = generateDateDaysAgo(13);
      const earlierDate = generateDateDaysAgo(14);
      const testEngineerData = [
        ["Name", "Slack user ID", "Support week"],
        ["Dave", "U012", closestDate],
        ["Evan", "U345", ""],
        ["Fred", "U678", earlierDate],
      ];
      testEngineerData.forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      buildDefaultTeamData().forEach((row) => {
        testTeamSheet.appendRow(row);
      });

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(defaultExpectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(testEngineerData);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(defaultExpectedStandupMessage),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should clear a full column and pick the first name when the last date is 14 or more days ago", () => {
      const pastDate = generateDateDaysAgo(14);
      const testEngineerData = [
        ["Name", "Slack user ID", "Support week"],
        ["Dave", "U012", "01/01/1970"],
        ["Evan", "U345", "holiday"],
        ["Fred", "U678", pastDate],
      ];
      testEngineerData.forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      buildDefaultTeamData().forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      const expectedEngineerData = [
        ["Name", "Slack user ID", "Support week"],
        ["Dave", "U012", todaysPrettyDate],
        ["Evan", "U345", ""],
        ["Fred", "U678", ""],
      ];
      const expectedSupportMessage =
        "It's also a new sprint, so <@U012> is on support.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(defaultExpectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(expectedEngineerData);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(
          defaultExpectedStandupMessage,
          expectedSupportMessage,
        ),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(5);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("support week");
      expect(mockLogger.log).toHaveBeenCalledWith("support column reset");
      expect(mockLogger.log).toHaveBeenCalledWith("Dave is next for support");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should not modify a full column when the last date is less than 14 days ago", () => {
      const pastDate = generateDateDaysAgo(13);
      const testEngineerData = [
        ["Name", "Slack user ID", "Support week"],
        ["Dave", "U012", "01/01/1970"],
        ["Evan", "U345", pastDate],
      ];
      testEngineerData.forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      buildDefaultTeamData().forEach((row) => {
        testTeamSheet.appendRow(row);
      });

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(defaultExpectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(testEngineerData);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(defaultExpectedStandupMessage),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
    it("should ignore non-dates when looking for the last date", () => {
      const pastDate = generateDateDaysAgo(14);
      const testEngineerData = [
        ["Name", "Slack user ID", "Support week"],
        ["Dave", "U012", pastDate],
        ["Evan", "U345", "holiday"],
        ["Fred", "U678", ""],
      ];
      testEngineerData.forEach((row) => {
        testEngineerSheet.appendRow(row);
      });
      buildDefaultTeamData().forEach((row) => {
        testTeamSheet.appendRow(row);
      });
      const expectedEngineerData = [
        ["Name", "Slack user ID", "Support week"],
        ["Dave", "U012", pastDate],
        ["Evan", "U345", "holiday"],
        ["Fred", "U678", todaysPrettyDate],
      ];
      const expectedSupportMessage =
        "It's also a new sprint, so <@U678> is on support.";

      rotaScript.pickNamesAndNotify();

      const actualTeamData = testSpreadsheet
        .getSheetByName("Team")
        .getDataRange()
        .getValues();
      expect(actualTeamData).toEqual(defaultExpectedTeamData);
      const actualEngineerData = testSpreadsheet
        .getSheetByName("Engineers")
        .getDataRange()
        .getValues();
      expect(actualEngineerData).toEqual(expectedEngineerData);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/dummywebhook",
        buildExpectedWebhook(
          defaultExpectedStandupMessage,
          expectedSupportMessage,
        ),
      );
      expect(mockLogger.log).toHaveBeenCalledTimes(4);
      expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
      expect(mockLogger.log).toHaveBeenCalledWith("support week");
      expect(mockLogger.log).toHaveBeenCalledWith("Fred is next for support");
      expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
    });
  });

  it("should log errors received posting the webhook payload", () => {
    buildDefaultTeamData().forEach((row) => {
      testTeamSheet.appendRow(row);
    });
    buildDefaultEngineerData().forEach((row) => {
      testEngineerSheet.appendRow(row);
    });
    const expectedFetchError = new Error("Error sending payload");
    mockUrlFetchApp.fetch.mockImplementation(() => {
      throw expectedFetchError;
    });

    rotaScript.pickNamesAndNotify();

    const actualTeamData = testSpreadsheet
      .getSheetByName("Team")
      .getDataRange()
      .getValues();
    expect(actualTeamData).toEqual(defaultExpectedTeamData);
    const actualEngineerData = testSpreadsheet
      .getSheetByName("Engineers")
      .getDataRange()
      .getValues();
    expect(actualEngineerData).toEqual(buildDefaultEngineerData());
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(defaultExpectedStandupMessage),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(2);
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
    expect(mockLogger.log).toHaveBeenCalledWith(expectedFetchError);
  });
});

function buildDefaultTeamData() {
  return [
    ["Name", "Slack user ID", "Standup week", "Retro week"],
    ["Alice", "U123", "", todaysDate],
    ["Bob", "U456", "", ""],
  ];
}

function buildDefaultEngineerData() {
  return [
    ["Name", "Slack user ID", "Support week"],
    ["Dave", "U012", todaysDate],
    ["Evan", "U345", ""],
  ];
}

const defaultExpectedTeamData = [
  ["Name", "Slack user ID", "Standup week", "Retro week"],
  ["Alice", "U123", todaysPrettyDate, todaysDate],
  ["Bob", "U456", "", ""],
];

const defaultExpectedStandupMessage =
  "Morning everyone, a new week means it's <@U123>'s turn to run standups.";

function buildExpectedWebhook(...args) {
  const payload = {
    blocks: [],
  };

  args.forEach((message) => {
    payload.blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: message,
      },
    });
  });

  return {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  };
}

function generateDateDaysAgo(days) {
  const date = new Date();
  // Google Sheets recognises dates entered as "en-GB" locale strings and returns them as midnight
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toString();
}
