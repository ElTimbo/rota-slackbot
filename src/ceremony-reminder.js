const SpreadsheetApp = require("gasmask").SpreadsheetApp;
const Logger = require("gasmask").Logger;
const UrlFetchApp = require("gasmask").UrlFetchApp;

exports.findNamesAndNotify = findNamesAndNotify;
// these imports & export are only needed for local development, don't include them in the script

let spreadsheet;
let rota;
let payload;

const rotaColumns = {};
const ceremonyMessages = {
  standup:
    "Morning everyone, here to remind you that <@${userId}> is running standups this week.",
  retro: "We've also got our retro, and it's <@${userId}>'s turn to run that.",
};

function findNamesAndNotify() {
  spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  rota = spreadsheet.getSheetByName("Rota");

  generateColumnMap();

  payload = buildPayload();

  const ceremonies = ["standup", "retro"];

  for (const ceremony of ceremonies) {
    const userId = findName(ceremony);
    if (userId) {
      addCeremonyToPayload(ceremony, userId);
    }
  }

  if (payload.blocks.length > 0) {
    sendPayload();
  } else {
    Logger.log("no payload to send");
  }
}

function generateColumnMap() {
  const rowData = rota.getDataRange().getValues();
  const columnHeaders = rowData[0];

  for (let i = 0; i < columnHeaders.length; i++) {
    const key = columnHeaders[i].split(" ")[0].toLowerCase();
    rotaColumns[key] = i;
  }
}

function findName(columnName) {
  const rowData = rota.getDataRange().getValues();
  let name;
  let userId;
  const timeNow = new Date().getTime();
  const offsetInDays = 6;

  for (let i = 1; i < rowData.length; i++) {
    const cellValue = rowData[i][rotaColumns[columnName]];
    if (cellValue !== "" && Date.parse(cellValue) > 0) {
      const timeOfLastOccurrence = new Date(cellValue).getTime();

      const microSecondsDiff = Math.abs(timeNow - timeOfLastOccurrence);
      const daysDiff = Math.floor(microSecondsDiff / (1000 * 60 * 60 * 24));

      if (daysDiff > 0 && daysDiff <= offsetInDays) {
        name = rowData[i][rotaColumns.name];
        userId = rowData[i][rotaColumns.slack];
        Logger.log(`${name} is running ${columnName}`);
        break;
      }
    }
  }

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