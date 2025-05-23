const SpreadsheetApp = require("gasmask").SpreadsheetApp;
const mockLogger = require("gasmask").Logger;
const mockUrlFetchApp = require("gasmask").UrlFetchApp;
const rotaScript = require("../src/multi-sheet-reminder");

globalThis.SpreadsheetApp = SpreadsheetApp;

let testSpreadsheet;
let testTeamSheet;
let testEngineerSheet;

describe("The ceremony rota reminder script", () => {
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
  it("should send a reminder for all ceremonies within the last week", () => {
    const pastDate = generateDateDaysAgo(6);
    const testTeamData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", pastDate, "01/01/1970"],
      ["Bob", "U456", "01/01/1970", pastDate],
    ];
    testTeamData.forEach((row) => {
      testTeamSheet.appendRow(row);
    });
    const testEngineerData = [
      ["Name", "Slack user ID", "Support week"],
      ["Dave", "U012", pastDate],
      ["Evan", "U345", ""],
    ];
    testEngineerData.forEach((row) => {
      testEngineerSheet.appendRow(row);
    });
    const expectedStandupMessage =
      "Morning everyone, here to remind you that <@U123> is running standups this week.";
    const expectedRetroMessage =
      "We've also got our retro, and it's <@U456>'s turn to run that.";
    const expectedSupportMessage =
      "A new sprint means it is <@U012> on support.";

    rotaScript.findNamesAndNotify();

    const actualTeamData = testSpreadsheet
      .getSheetByName("Team")
      .getDataRange()
      .getValues();
    expect(actualTeamData).toEqual(testTeamData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(
        expectedStandupMessage,
        expectedRetroMessage,
        expectedSupportMessage,
      ),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(4);
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is running standup");
    expect(mockLogger.log).toHaveBeenCalledWith("Bob is running retro");
    expect(mockLogger.log).toHaveBeenCalledWith("Dave is running support");
    expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
  });
  it("should only send a reminder for a ceremony within the last week", () => {
    const pastDate = generateDateDaysAgo(6);
    const testTeamData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", pastDate, "01/01/1970"],
      ["Bob", "U456", "01/01/1970", ""],
    ];
    testTeamData.forEach((row) => {
      testTeamSheet.appendRow(row);
    });
    const testEngineerData = [
      ["Name", "Slack user ID", "Support week"],
      ["Dave", "U012", "01/01/1970"],
      ["Evan", "U345", pastDate],
    ];
    testEngineerData.forEach((row) => {
      testEngineerSheet.appendRow(row);
    });
    const expectedStandupMessage =
      "Morning everyone, here to remind you that <@U123> is running standups this week.";
    const expectedSupportMessage =
      "A new sprint means it is <@U345> on support.";

    rotaScript.findNamesAndNotify();

    const actualTeamData = testSpreadsheet
      .getSheetByName("Team")
      .getDataRange()
      .getValues();
    expect(actualTeamData).toEqual(testTeamData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(expectedStandupMessage, expectedSupportMessage),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(3);
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is running standup");
    expect(mockLogger.log).toHaveBeenCalledWith("Evan is running support");
    expect(mockLogger.log).toHaveBeenCalledWith("payload sent");
  });
  it("should not send a reminder if no ceremony dates were within the last week", () => {
    const pastDate = generateDateDaysAgo(7);
    const testTeamData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", pastDate, "01/01/1970"],
      ["Bob", "U456", "01/01/1970", pastDate],
    ];
    testTeamData.forEach((row) => {
      testTeamSheet.appendRow(row);
    });
    const testEngineerData = [
      ["Name", "Slack user ID", "Support week"],
      ["Dave", "U012", "01/01/1970"],
      ["Evan", "U345", pastDate],
    ];
    testEngineerData.forEach((row) => {
      testEngineerSheet.appendRow(row);
    });

    rotaScript.findNamesAndNotify();

    const actualTeamData = testSpreadsheet
      .getSheetByName("Team")
      .getDataRange()
      .getValues();
    expect(actualTeamData).toEqual(testTeamData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(0);
    expect(mockLogger.log).toHaveBeenCalledTimes(1);
    expect(mockLogger.log).toHaveBeenCalledWith("no payload to send");
  });
  it("should not send a reminder for a ceremony with today's date", () => {
    const todaysDate = generateDateDaysAgo(0);
    const testTeamData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", todaysDate, "01/01/1970"],
      ["Bob", "U456", "01/01/1970", todaysDate],
    ];
    testTeamData.forEach((row) => {
      testTeamSheet.appendRow(row);
    });
    const testEngineerData = [
      ["Name", "Slack user ID", "Support week"],
      ["Dave", "U012", todaysDate],
      ["Evan", "U345", ""],
    ];
    testEngineerData.forEach((row) => {
      testEngineerSheet.appendRow(row);
    });

    rotaScript.findNamesAndNotify();

    const actualTeamData = testSpreadsheet
      .getSheetByName("Team")
      .getDataRange()
      .getValues();
    expect(actualTeamData).toEqual(testTeamData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(0);
    expect(mockLogger.log).toHaveBeenCalledTimes(1);
    expect(mockLogger.log).toHaveBeenCalledWith("no payload to send");
  });
  it("should log errors received posting the webhook payload", () => {
    const pastDate = generateDateDaysAgo(6);
    const testTeamData = [
      ["Name", "Slack user ID", "Standup week", "Retro week"],
      ["Alice", "U123", pastDate, pastDate],
      ["Bob", "U456", "", ""],
    ];
    testTeamData.forEach((row) => {
      testTeamSheet.appendRow(row);
    });
    const testEngineerData = [
      ["Name", "Slack user ID", "Support week"],
      ["Dave", "U012", pastDate],
      ["Evan", "U345", ""],
    ];
    testEngineerData.forEach((row) => {
      testEngineerSheet.appendRow(row);
    });
    const expectedStandupMessage =
      "Morning everyone, here to remind you that <@U123> is running standups this week.";
    const expectedRetroMessage =
      "We've also got our retro, and it's <@U123>'s turn to run that.";
    const expectedSupportMessage =
      "A new sprint means it is <@U012> on support.";
    const expectedFetchError = new Error("Error sending payload");
    mockUrlFetchApp.fetch.mockImplementation(() => {
      throw expectedFetchError;
    });

    rotaScript.findNamesAndNotify();

    const actualTeamData = testSpreadsheet
      .getSheetByName("Team")
      .getDataRange()
      .getValues();
    expect(actualTeamData).toEqual(testTeamData);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/dummywebhook",
      buildExpectedWebhook(
        expectedStandupMessage,
        expectedRetroMessage,
        expectedSupportMessage,
      ),
    );
    expect(mockLogger.log).toHaveBeenCalledTimes(4);
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is running standup");
    expect(mockLogger.log).toHaveBeenCalledWith("Alice is running retro");
    expect(mockLogger.log).toHaveBeenCalledWith("Dave is running support");
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
