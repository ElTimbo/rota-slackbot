const SpreadsheetApp = require("gasmask").SpreadsheetApp;
const Logger = require("gasmask").Logger;
const UrlFetchApp = require("gasmask").UrlFetchApp;

exports.pickNamesAndNotify = pickNamesAndNotify;
// these imports & export are only needed for local development, don't include them in the script

let spreadsheet;
let rota;
let payload;

const rotaColumns = {};
const ceremonyMessages = {
  standup:
    "Morning everyone, a new week means it's <@${userId}>'s turn to run standups.",
  retro: "We've got our retro this week too, and <@${userId}> you're up.",
};

function pickNamesAndNotify() {
  spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  rota = spreadsheet.getSheetByName("Rota");

  generateColumnMap();

  payload = buildPayload();

  resetColumnIfNeeded("standup");
  const standupUserId = pickAndUpdateName("standup");
  addCeremonyToPayload("standup", standupUserId);

  const isRetroWeek = checkCeremonyOccurrence("retro", 14);
  if (isRetroWeek) {
    resetColumnIfNeeded("retro");
    const retroUserId = pickAndUpdateName("retro");
    addCeremonyToPayload("retro", retroUserId);
  }

  sendPayload();
}

function generateColumnMap() {
  const rowData = rota.getDataRange().getValues();
  const columnHeaders = rowData[0];

  for (let i = 0; i < columnHeaders.length; i++) {
    const key = columnHeaders[i].split(" ")[0].toLowerCase();
    rotaColumns[key] = i;
  }
}

function checkCeremonyOccurrence(columnName, cadenceInDays) {
  const rowData = rota.getDataRange().getValues();
  const dates = [];
  let shouldOccur = false;

  for (let i = 1; i < rowData.length; i++) {
    const cellValue = rowData[i][rotaColumns[columnName]];
    if (cellValue !== "" && Date.parse(cellValue) > 0) {
      dates.push(cellValue);
    }
  }
  if (dates.length < 1) {
    shouldOccur = true;
    Logger.log(`no previous dates for ${columnName}`);
    return shouldOccur;
  }

  const mostRecentDate = dates.reduce((a, b) => {
    return new Date(a) > new Date(b) ? a : b;
  });

  const timeNow = new Date().getTime();
  const timeOfLastOccurrence = new Date(mostRecentDate).getTime();

  const microSecondsDiff = Math.abs(timeNow - timeOfLastOccurrence);
  const daysDiff = Math.floor(microSecondsDiff / (1000 * 60 * 60 * 24));

  if (daysDiff >= cadenceInDays) {
    shouldOccur = true;
    Logger.log(`${columnName} week`);
  }

  return shouldOccur;
}

function resetColumnIfNeeded(columnName) {
  const rowData = rota.getDataRange().getValues();

  if (
    rowData.filter((row) => row[rotaColumns[columnName]] === "").length === 0
  ) {
    for (let i = 1; i < rowData.length; i++) {
      rota.getRange(i + 1, rotaColumns[columnName] + 1).setValue("");
    }
    Logger.log(`${columnName} column reset`);
  }
}

function pickAndUpdateName(columnName) {
  const rowData = rota.getDataRange().getValues();
  let name;
  let userId;
  const todaysDate = new Date().toLocaleDateString("en-GB");

  for (let i = 1; i < rowData.length; i++) {
    if (rowData[i][rotaColumns[columnName]] === "") {
      name = rowData[i][rotaColumns.name];
      userId = rowData[i][rotaColumns.slack];
      rota.getRange(i + 1, rotaColumns[columnName] + 1).setValue(todaysDate);
      break;
    }
  }

  Logger.log(`${name} is next for ${columnName}`);
  return userId;
}

function buildPayload() {
  return {
    blocks: [],
  };
}

function addCeremonyToPayload(ceremonyName, userId) {
  const messageTemplate = ceremonyMessages[ceremonyName];
  const payloadMessage = messageTemplate.replace("${userId}", userId);

  const payloadBlock = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: payloadMessage,
    },
  };

  payload.blocks.push(payloadBlock);
}

function sendPayload() {
  const webhook = "https://hooks.slack.com/services/dummywebhook";
  var options = {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  };

  try {
    UrlFetchApp.fetch(webhook, options);
    Logger.log("payload sent");
  } catch (e) {
    Logger.log(e);
  }
}
