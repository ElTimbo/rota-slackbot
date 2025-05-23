const SpreadsheetApp = require("gasmask").SpreadsheetApp;
const mockLogger = require("gasmask").Logger;
const mockUrlFetchApp = require("gasmask").UrlFetchApp;
const rotaScript = require("../src/ceremony-picker");

globalThis.SpreadsheetApp = SpreadsheetApp;

let testSpreadsheet;
let testSheet;

const todaysDate = generateDateDaysAgo(0);
const todaysPrettyDate = new Date().toLocaleDateString("en-GB");

describe("The ceremony rota script", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    testSpreadsheet = SpreadsheetApp.create("Test Spreadsheet");
    testSpreadsheet.insertSheet("Rota");
    testSheet = testSpreadsheet.getSheetByName("Rota");

    mockLogger.log = jest.fn();
    mockUrlFetchApp.fetch = jest.fn();
  });

  describe("when looking at standups", () => {
    it("should pick the first name from an empty column", () => {
      const testData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", todaysDate],
        ["Bob", "U456", "", ""],
      ];
      testData.forEach((row) => {
        testSheet.appendRow(row);
      });
      const expectedData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, todaysDate],
        ["Bob", "U456", "", ""],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";

      rotaScript.pickNamesAndNotify();

      const actualData = testSpreadsheet
        .getSheetByName("Rota")
        .getDataRange()
        .getValues();
      expect(actualData).toEqual(expectedData);
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
      const testData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "01/01/1970", todaysDate],
        ["Bob", "U456", "", todaysDate],
      ];
      testData.forEach((row) => {
        testSheet.appendRow(row);
      });
      const expectedData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "01/01/1970", todaysDate],
        ["Bob", "U456", todaysPrettyDate, todaysDate],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U456>'s turn to run standups.";

      rotaScript.pickNamesAndNotify();

      const actualData = testSpreadsheet
        .getSheetByName("Rota")
        .getDataRange()
        .getValues();
      expect(actualData).toEqual(expectedData);
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
      const testData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "01/01/1970", todaysDate],
        ["Bob", "U456", "08/01/1970", todaysDate],
      ];
      testData.forEach((row) => {
        testSheet.appendRow(row);
      });
      const expectedData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, todaysDate],
        ["Bob", "U456", "", todaysDate],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";

      rotaScript.pickNamesAndNotify();

      const actualData = testSpreadsheet
        .getSheetByName("Rota")
        .getDataRange()
        .getValues();
      expect(actualData).toEqual(expectedData);
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
      const testData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", ""],
        ["Bob", "U456", "", ""],
      ];
      testData.forEach((row) => {
        testSheet.appendRow(row);
      });
      const expectedData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, todaysPrettyDate],
        ["Bob", "U456", "", ""],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";
      const expectedRetroMessage =
        "We've got our retro this week too, and <@U123> you're up.";

      rotaScript.pickNamesAndNotify();

      const actualData = testSpreadsheet
        .getSheetByName("Rota")
        .getDataRange()
        .getValues();
      expect(actualData).toEqual(expectedData);
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
      const testData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", earlierDate],
        ["Bob", "U456", "", ""],
        ["Charlie", "U789", "", closestDate],
      ];
      testData.forEach((row) => {
        testSheet.appendRow(row);
      });
      const expectedData = [
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

      const actualData = testSpreadsheet
        .getSheetByName("Rota")
        .getDataRange()
        .getValues();
      expect(actualData).toEqual(expectedData);
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
      const testData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", closestDate],
        ["Bob", "U456", "", ""],
        ["Charlie", "U789", "", earlierDate],
      ];
      testData.forEach((row) => {
        testSheet.appendRow(row);
      });
      const expectedData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, closestDate],
        ["Bob", "U456", "", ""],
        ["Charlie", "U789", "", earlierDate],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";

      rotaScript.pickNamesAndNotify();

      const actualData = testSpreadsheet
        .getSheetByName("Rota")
        .getDataRange()
        .getValues();
      expect(actualData).toEqual(expectedData);
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
      const testData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", "01/01/1970"],
        ["Bob", "U456", "", "holiday"],
        ["Charlie", "U789", "", pastDate],
      ];
      testData.forEach((row) => {
        testSheet.appendRow(row);
      });
      const expectedData = [
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

      const actualData = testSpreadsheet
        .getSheetByName("Rota")
        .getDataRange()
        .getValues();
      expect(actualData).toEqual(expectedData);
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
      const testData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", "01/01/1970"],
        ["Bob", "U456", "", pastDate],
      ];
      testData.forEach((row) => {
        testSheet.appendRow(row);
      });
      const expectedData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", todaysPrettyDate, "01/01/1970"],
        ["Bob", "U456", "", pastDate],
      ];
      const expectedStandupMessage =
        "Morning everyone, a new week means it's <@U123>'s turn to run standups.";

      rotaScript.pickNamesAndNotify();

      const actualData = testSpreadsheet
        .getSheetByName("Rota")
        .getDataRange()
        .getValues();
      expect(actualData).toEqual(expectedData);
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
      const testData = [
        ["Name", "Slack user ID", "Standup week", "Retro week"],
        ["Alice", "U123", "", pastDate],
        ["Bob", "U456", "", "holiday"],
        ["Charlie", "U789", "", ""],
      ];
      testData.forEach((row) => {
        testSheet.appendRow(row);
      });
      const expectedData = [
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

      const actualData = testSpreadsheet
        .getSheetByName("Rota")
        .getDataRange()
        .getValues();
      expect(actualData).toEqual(expectedData);
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

  it("should log errors received posting the webhook payload", () => {
    const testData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", "", ""],
      ["Bob", "U456", "", ""],
    ];
    testData.forEach((row) => {
      testSheet.appendRow(row);
    });
    const expectedData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", todaysPrettyDate, todaysPrettyDate],
      ["Bob", "U456", "", ""],
    ];
    const expectedStandupMessage =
      "Morning everyone, a new week means it's <@U123>'s turn to run standups.";
    const expectedRetroMessage =
      "We've got our retro this week too, and <@U123> you're up.";
    const expectedFetchError = new Error("Error sending payload");
    mockUrlFetchApp.fetch.mockImplementation(() => {
      throw expectedFetchError;
    });

    rotaScript.pickNamesAndNotify();

    const actualData = testSpreadsheet
      .getSheetByName("Rota")
      .getDataRange()
      .getValues();
    expect(actualData).toEqual(expectedData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(expectedStandupMessage, expectedRetroMessage),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(4);
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for standup");
    expect(mockLogger.log).toHaveBeenCalledWith("no previous dates for retro");
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is next for retro");
    expect(mockLogger.log).toHaveBeenCalledWith(expectedFetchError);
  });
});

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
