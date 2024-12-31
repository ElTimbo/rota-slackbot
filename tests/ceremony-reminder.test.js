const SpreadsheetApp = require("gasmask").SpreadsheetApp;
const mockLogger = require("gasmask").Logger;
const mockUrlFetchApp = require("gasmask").UrlFetchApp;
const rotaScript = require("../src/ceremony-reminder");

globalThis.SpreadsheetApp = SpreadsheetApp;

let testSpreadsheet;
let testSheet;

describe("The ceremony rota reminder script", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    testSpreadsheet = SpreadsheetApp.create("Test Spreadsheet");
    testSpreadsheet.insertSheet("Rota");
    testSheet = testSpreadsheet.getSheetByName("Rota");

    mockLogger.log = jest.fn();
    mockUrlFetchApp.fetch = jest.fn();
  });
  it("should send a reminder for all ceremonies within the last week", () => {
    const pastDate = generateDateDaysAgo(6);
    const testData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", pastDate, "01/01/1970"],
      ["Bob", "U456", "01/01/1970", pastDate],
    ];
    testData.forEach((row) => {
      testSheet.appendRow(row);
    });
    const expectedStandupMessage =
      "Morning everyone, here to remind you that <@U123> is running standups this week.";
    const expectedRetroMessage =
      "We've also got our retro, and it's <@U456>'s turn to run that.";

    rotaScript.findNamesAndNotify();

    const actualData = testSpreadsheet
      .getSheetByName("Rota")
      .getDataRange()
      .getValues();
    expect(actualData).toEqual(testData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(expectedStandupMessage, expectedRetroMessage),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(3);
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is running standup");
    expect(mockLogger.log).toHaveBeenCalledWith("Bob is running retro");
    expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
  });
  it("should only send a reminder for a ceremony within the last week", () => {
    const pastDate = generateDateDaysAgo(6);
    const testData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", pastDate, "01/01/1970"],
      ["Bob", "U456", "01/01/1970", ""],
    ];
    testData.forEach((row) => {
      testSheet.appendRow(row);
    });
    const expectedStandupMessage =
      "Morning everyone, here to remind you that <@U123> is running standups this week.";

    rotaScript.findNamesAndNotify();

    const actualData = testSpreadsheet
      .getSheetByName("Rota")
      .getDataRange()
      .getValues();
    expect(actualData).toEqual(testData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(expectedStandupMessage),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(2);
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is running standup");
    expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
  });
  it("should not send a reminder if no ceremony dates were within the last week", () => {
    const pastDate = generateDateDaysAgo(7);
    const testData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", pastDate, "01/01/1970"],
      ["Bob", "U456", "01/01/1970", pastDate],
    ];
    testData.forEach((row) => {
      testSheet.appendRow(row);
    });

    rotaScript.findNamesAndNotify();

    const actualData = testSpreadsheet
      .getSheetByName("Rota")
      .getDataRange()
      .getValues();
    expect(actualData).toEqual(testData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(0);
    expect(mockLogger.log).toHaveBeenCalledTimes(1);
    expect(mockLogger.log).toHaveBeenCalledWith("no payload to send");
  });
  it("should not send a reminder for a ceremony with today's date", () => {
    const todaysDate = new Date().toUTCString();
    const testData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", todaysDate, "01/01/1970"],
      ["Bob", "U456", "01/01/1970", todaysDate],
    ];
    testData.forEach((row) => {
      testSheet.appendRow(row);
    });

    rotaScript.findNamesAndNotify();

    const actualData = testSpreadsheet
      .getSheetByName("Rota")
      .getDataRange()
      .getValues();
    expect(actualData).toEqual(testData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(0);
    expect(mockLogger.log).toHaveBeenCalledTimes(1);
    expect(mockLogger.log).toHaveBeenCalledWith("no payload to send");
  });
  it("should log errors received posting the webhook payload", () => {
    const pastDate = generateDateDaysAgo(6);
    const testData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", pastDate, pastDate],
      ["Bob", "U456", "", ""],
    ];
    testData.forEach((row) => {
      testSheet.appendRow(row);
    });
    const expectedStandupMessage =
      "Morning everyone, here to remind you that <@U123> is running standups this week.";
    const expectedRetroMessage =
      "We've also got our retro, and it's <@U123>'s turn to run that.";
    const expectedFetchError = new Error("Error sending payload");
    mockUrlFetchApp.fetch.mockImplementation(() => {
      throw expectedFetchError;
    });

    rotaScript.findNamesAndNotify();

    const actualData = testSpreadsheet
      .getSheetByName("Rota")
      .getDataRange()
      .getValues();
    expect(actualData).toEqual(testData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(expectedStandupMessage, expectedRetroMessage),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(3);
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is running standup");
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is running retro");
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
  date.setDate(date.getDate() - days);
  // Google Sheets recognises dates entered as "en-GB" locale strings and returns them as UTC strings
  return date.toUTCString();
}
