const SpreadsheetApp = require("gasmask").SpreadsheetApp;
const mockLogger = require("gasmask").Logger;
const mockUrlFetchApp = require("gasmask").UrlFetchApp;
const rotaScript = require("../src/single-ceremony");

globalThis.SpreadsheetApp = SpreadsheetApp;

let testSpreadsheet;
let testSheet;
const todaysDate = new Date().toLocaleDateString("en-GB");

describe("The single-ceremony rota script", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    testSpreadsheet = SpreadsheetApp.create("Test Spreadsheet");
    testSpreadsheet.insertSheet("Rota");
    testSheet = testSpreadsheet.getSheetByName("Rota");

    mockLogger.log = jest.fn();
    mockUrlFetchApp.fetch = jest.fn();
  });
  it("should pick the first name from an empty rota", () => {
    const testData = [
      ["Name", "Slack user ID", "Standup week"],
      ["Alice", "U123", ""],
      ["Bob", "U456", ""],
    ];
    testData.forEach((row) => {
      testSheet.appendRow(row);
    });
    const expectedData = [
      ["Name", "Slack user ID", "Standup week"],
      ["Alice", "U123", todaysDate],
      ["Bob", "U456", ""],
    ];
    const expectedSlackMessage =
      "Morning everyone, a new week means it's <@U123>'s turn to run standups.";

    rotaScript.pickANameAndNotify();

    const actualData = testSpreadsheet
      .getSheetByName("Rota")
      .getDataRange()
      .getValues();
    expect(actualData).toEqual(expectedData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(expectedSlackMessage),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(2);
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is next up");
    expect(mockLogger.log).toHaveBeenCalledWith("Payload sent");
  });
  it("should pick the next name on the rota", () => {
    const testData = [
      ["Name", "Slack user ID", "Standup week"],
      ["Alice", "U123", "01/01/1970"],
      ["Bob", "U456", ""],
    ];
    testData.forEach((row) => {
      testSheet.appendRow(row);
    });
    const expectedData = [
      ["Name", "Slack user ID", "Standup week"],
      ["Alice", "U123", "01/01/1970"],
      ["Bob", "U456", todaysDate],
    ];
    const expectedSlackMessage =
      "Morning everyone, a new week means it's <@U456>'s turn to run standups.";

    rotaScript.pickANameAndNotify();

    const actualData = testSpreadsheet
      .getSheetByName("Rota")
      .getDataRange()
      .getValues();
    expect(actualData).toEqual(expectedData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(expectedSlackMessage),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(2);
    expect(mockLogger.log).toHaveBeenCalledWith("Bob is next up");
    expect(mockLogger.log).toHaveBeenCalledWith("Payload sent");
  });
  it("should clear a full rota and pick the first name", () => {
    const testData = [
      ["Name", "Slack user ID", "Standup week"],
      ["Alice", "U123", "01/01/1970"],
      ["Bob", "U456", "08/01/1970"],
    ];
    testData.forEach((row) => {
      testSheet.appendRow(row);
    });
    const expectedData = [
      ["Name", "Slack user ID", "Standup week"],
      ["Alice", "U123", todaysDate],
      ["Bob", "U456", ""],
    ];
    const expectedSlackMessage =
      "Morning everyone, a new week means it's <@U123>'s turn to run standups.";

    rotaScript.pickANameAndNotify();

    const actualData = testSpreadsheet
      .getSheetByName("Rota")
      .getDataRange()
      .getValues();
    expect(actualData).toEqual(expectedData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(expectedSlackMessage),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(3);
    expect(mockLogger.log).toHaveBeenCalledWith("Rota reset");
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is next up");
    expect(mockLogger.log).toHaveBeenCalledWith("Payload sent");
  });
  it("should log errors received posting the webhook payload", () => {
    const testData = [
      ["Name", "Slack user ID", "Standup week"],
      ["Alice", "U123", ""],
      ["Bob", "U456", ""],
    ];
    testData.forEach((row) => {
      testSheet.appendRow(row);
    });
    const expectedData = [
      ["Name", "Slack user ID", "Standup week"],
      ["Alice", "U123", todaysDate],
      ["Bob", "U456", ""],
    ];
    const expectedSlackMessage =
      "Morning everyone, a new week means it's <@U123>'s turn to run standups.";
    const expectedFetchError = new Error("Error sending payload");
    mockUrlFetchApp.fetch.mockImplementation(() => {
      throw expectedFetchError;
    });

    rotaScript.pickANameAndNotify();

    const actualData = testSpreadsheet
      .getSheetByName("Rota")
      .getDataRange()
      .getValues();
    expect(actualData).toEqual(expectedData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(expectedSlackMessage),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(2);
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is next up");
    expect(mockLogger.log).toHaveBeenCalledWith(expectedFetchError);
  });
});

function buildExpectedWebhook(message) {
  const payload = {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message,
        },
      },
    ],
  };

  return {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  };
}
