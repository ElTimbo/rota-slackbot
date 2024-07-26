# Scrum Ceremony Rota Slackbot

This repo contains two scripts for [Google Apps Script](https://script.google.com/home), both of which send Slack alerts to notify people when it is their turn to run specific scrum ceremonies. They use a Google sheet for the rota, finding who's turn it is to run the ceremony, inserting the current date to check them off, and then sending a Slack webhook to post the message.

## A single ceremony

This script supports a single ceremony, in this case standups. Running this on a weekly schedule will result in a Slack message each week, tagging the individual and letting them know that they are running standups for that week. It could be easily modified to support different ceremonies or responsibilities.

### Ceremonies not on a weekly cadence

Google Apps Script currently only supports weekly or monthly schedules, so supporting ceremonies or responsibilities that do not rotate on those cadences will need the implementation from the multi-ceremony script.

## Multiple ceremonies

This script supports one ceremony running on one cadence, in this case standups rotating weekly, alongside another ceremony on another cadence, here a retro on a two week cadence. It can easily be updated to support additional ceremonies and/or altering their cadences.

## Skipping people

Skipping people can be achieved by entering something into the relevant cell in the Google Sheet before the script runs, such as the word "holiday". Both scripts will skip over these entries and pick the next person. These manual entries can then be subsequently removed and the next time the script runs it will fill in the gaps, or they can be left and the script will clear the column(s) when they are full as normal.

# How it works

These scripts require a rota Google spreadsheet, with one sheet/tab called `Rota` that has a table of at least 3 columns: Name, Slack user ID, and a ceremony name. Column order is not important, and columns are referenced using the lowercased first word of the column heading. So in the included single ceremony script, the column headings would need to be `Name`, `Slack ...`, and `Standup ...`. The included multiple ceremony script then also needs a `Retro ...` column.

> Slack user (or member) IDs are used to tag the users, and can be copied via a menu on each user's profile.

The scripts also need a Slack app to receive the webhook payload and post the messages. This can be created and configured via the [Slack API site](https://api.slack.com/apps). To receive the payload the Slack app will need an incoming webhook, the URL for which will be used in the script.

> It can be a good idea to create two webhooks, one of which has permissions to post messages directly to you, to enable testing your script.

Once both these are created, a Google Apps Script project should be created from the Google sheet, [following these steps to create a container-bound project](https://developers.google.com/apps-script/guides/projects#create-from-docs-sheets-slides). This will link the project to the specific sheet, and set the permissions when it is first run.

At this point the content of the chosen script can be copied into the Apps Script project (omitting the imports & export at the top that are needed for local development). The Slack webhook URL needs to be replaced with the incoming webhook URL for the Slack app. The ceremony name(s) and column(s) can also be modified, along with the Slack message content, to match the Google sheet and use case. Once everything has been tested, a Trigger can be enabled for the Apps Script project to run the script on a suitable schedule.

## Working locally

These scripts have a full local testing suite, using stubs for the Google spreadsheet to validate how they are reading and modifying it. These can be run with the following command:
```
yarn test
```

This repo also includes [ESLint](https://eslint.org/) for static analysis and [Prettier](https://prettier.io/docs/en/) for code formatting. To run these you can use the following commands:
```
yarn run eslint .
yarn prettier . --check
```