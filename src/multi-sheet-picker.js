const SpreadsheetApp = require("gasmask").SpreadsheetApp;
const Logger = require("gasmask").Logger;
const UrlFetchApp = require("gasmask").UrlFetchApp;

exports.pickNamesAndNotify = pickNamesAndNotify;
// these imports & export are only needed for local development, don't include them in the script

let spreadsheet;
let teamRota;
let engineerRota;
let payload;

const ceremonyMessages = {
  standup:
    "Morning everyone, a new week means it's <@${userId}>'s turn to run standups.",
  retro: "We've got our retro this week too, and <@${userId}> you're up.",
  support: "It's also a new sprint, so <@${userId}> is on support.",
};

function pickNamesAndNotify() {
  spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  teamRota = spreadsheet.getSheetByName("Team");
  engineerRota = spreadsheet.getSheetByName("Engineers");

  payload = buildPayload();

  resetColumnIfNeeded(teamRota, "standup");
  const standupUserId = pickAndUpdateName(teamRota, "standup");
  addCeremonyToPayload("standup", standupUserId);

  const isRetroWeek = checkCeremonyOccurrence(teamRota, "retro", 14);
  if (isRetroWeek) {
    resetColumnIfNeeded(teamRota, "retro");
    const retroUserId = pickAndUpdateName(teamRota, "retro");
    addCeremonyToPayload("retro", retroUserId);
  }

  const isSupportWeek = checkCeremonyOccurrence(engineerRota, "support", 14);
  if (isSupportWeek) {
    resetColumnIfNeeded(engineerRota, "support");
    const supportUserId = pickAndUpdateName(engineerRota, "support");
    addCeremonyToPayload("support", supportUserId);
  }

  sendPayload();
}

function generateColumnMap(rowData) {
  const columnHeaders = rowData[0];
  const formattedColumnHeaders = {};

  for (let i = 0; i < columnHeaders.length; i++) {
    const key = columnHeaders[i].split(" ")[0].toLowerCase();
    formattedColumnHeaders[key] = i;
  }

  return formattedColumnHeaders;
}

function checkCeremonyOccurrence(rota, columnName, cadenceInDays) {
  const rowData = rota.getDataRange().getValues();
  const columnHeaders = generateColumnMap(rowData);

  const dates = [];
  let shouldOccur = false;

  for (let i = 1; i < rowData.length; i++) {
    const cellValue = rowData[i][columnHeaders[columnName]];
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

function resetColumnIfNeeded(rota, columnName) {
  const rowData = rota.getDataRange().getValues();
  const columnHeaders = generateColumnMap(rowData);

  if (
    rowData.filter((row) => row[columnHeaders[columnName]] === "").length === 0
  ) {
    for (let i = 1; i < rowData.length; i++) {
      rota.getRange(i + 1, columnHeaders[columnName] + 1).setValue("");
    }
    Logger.log(`${columnName} column reset`);
  }
}

function pickAndUpdateName(rota, columnName) {
  const rowData = rota.getDataRange().getValues();
  const columnHeaders = generateColumnMap(rowData);

  let name;
  let userId;
  const todaysDate = new Date().toLocaleDateString("en-GB");

  for (let i = 1; i < rowData.length; i++) {
    if (rowData[i][columnHeaders[columnName]] === "") {
      name = rowData[i][columnHeaders.name];
      userId = rowData[i][columnHeaders.slack];
      rota.getRange(i + 1, columnHeaders[columnName] + 1).setValue(todaysDate);
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
