const SpreadsheetApp = require("gasmask").SpreadsheetApp;
const Logger = require("gasmask").Logger;
const UrlFetchApp = require("gasmask").UrlFetchApp;

exports.pickANameAndNotify = pickANameAndNotify;
// these imports & export are only needed for local development, don't include them in the script

let spreadsheet;
let rota;

const rotaColumns = {};

function pickANameAndNotify() {
  spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  rota = spreadsheet.getSheetByName("Rota");

  generateColumnMap();

  resetSheetIfNeeded();

  const userId = pickAndUpdateName();

  const payload = buildWebhookPayload(userId);

  sendPayload(payload);
}

function generateColumnMap() {
  const rowData = rota.getDataRange().getValues();
  const columnHeaders = rowData[0];

  for (let i = 0; i < columnHeaders.length; i++) {
    const key = columnHeaders[i].split(" ")[0].toLowerCase();
    rotaColumns[key] = i;
  }
}

function resetSheetIfNeeded() {
  const rowData = rota.getDataRange().getValues();

  if (rowData.filter((row) => row[rotaColumns.standup] === "").length === 0) {
    for (let i = 1; i < rowData.length; i++) {
      rota.getRange(i + 1, rotaColumns.standup + 1).setValue("");
    }
    Logger.log("Rota reset");
  }
}

function pickAndUpdateName() {
  const rowData = rota.getDataRange().getValues();
  let name;
  let userId;
  const todaysDate = new Date().toLocaleDateString("en-GB");

  for (let i = 1; i < rowData.length; i++) {
    if (rowData[i][rotaColumns.standup] === "") {
      name = rowData[i][rotaColumns.name];
      userId = rowData[i][rotaColumns.slack];
      rota.getRange(i + 1, rotaColumns.standup + 1).setValue(todaysDate);
      break;
    }
  }

  Logger.log(`${name} is next up`);
  return userId;
}

function buildWebhookPayload(userId) {
  const message = `Morning everyone, a new week means it's <@${userId}>'s turn to run standups.`;

  return {
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
}

function sendPayload(payload) {
  const webhook = "https://hooks.slack.com/services/dummywebhook"; // replace with your own webhook URL
  var options = {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  };

  try {
    UrlFetchApp.fetch(webhook, options);
    Logger.log("Payload sent");
  } catch (e) {
    Logger.log(e);
  }
}
