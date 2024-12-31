# Scrum Ceremony Rota Slackbot

This repo contains two scripts that, with a [Google spreadsheet](https://sheets.google.com) and [Google Apps Script](https://script.google.com/home), can be used to automate a rota for running your team's scrum ceremonies.

## Selecting who will run your ceremonies

The [ceremony-picker script](src/ceremony-picker.js) allocates someone to run each ceremony, inserting the current date to check them off, and posts a Slack message tagging those people via a webhook.

Google Apps Script currently only supports weekly or monthly schedules, so this script incorporates the `checkCeremonyOccurrence` function to cater for ceremonies on different cadences. It includes two example ceremonies, a `standup` that changes facilitator on a weekly basis, and a `retro` that rotates every fortnight.

> To add more ceremonies, simply duplicate the relevant code block, adding the message and updating the column name as needed. See the [how it works section](#how-it-works) for more. The `checkCeremonyOccurrence` function can be removed entirely if not needed for any ceremony.

### Skipping people

Skipping people can be done by entering something into the relevant cell in the Google spreadsheet before the script runs, such as the word "holiday". The script will skip over these entries and pick the next person. These manual entries can then be subsequently removed and script will fill in the gaps when it next runs, or they can be left and the script will clear the column(s) when they are full as normal.

## Reminding those running the ceremonies

Slack does not support scheduling messages via webhooks, so the [ceremony-reminder script](src/ceremony-reminder.js) can be used to post a follow up message to remind those running each ceremony. It is designed to be run on a weekly schedule and will post a Slack message for any ceremonies with an individual allocated within the last week.

> For extra ceremonies add a message and include the column name in the `ceremonies` array. See the [how it works section](#how-it-works) below for more details.

# How it works

These scripts require a rota Google spreadsheet, with one sheet/tab called `Rota` that has a table of at least 3 columns: Name, Slack user ID, and the ceremony name(s). Column order is not important, and columns are referenced in the code using the lowercased first word of the column heading. So for both the included [ceremony-picker](src/ceremony-picker.js) and [ceremony-reminder](src/ceremony-reminder.js) scripts, the column headings would need to be `Name`, `Slack ...`, `Standup ...`, and `Retro ...`.

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