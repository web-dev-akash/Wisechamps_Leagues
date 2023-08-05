const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { google } = require("googleapis");
require("dotenv").config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;

const workshopSessionIds = [
  "168909784",
  "190081258",
  "116627729",
  "176886614",
  "102969519",
  "178185366",
  "135306774",
];

const getSheetData = async () => {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const auth = new google.auth.GoogleAuth({
    keyFile: "key.json", //the key file
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });

  const authClientObject = await auth.getClient();
  const sheet = google.sheets({
    version: "v4",
    auth: authClientObject,
  });

  const readData = await sheet.spreadsheets.values.get({
    auth, //auth object
    spreadsheetId, //spreadsheet id
    range: "Vevox Data!A:J", //sheet name and range of cells
  });
  return readData.data.values;
};

const createLeague = async ({ leagueID, leagueCategory }) => {
  const todaysDate = new Date().toDateString();
  let endDate = "";
  const spreadsheetId = process.env.SCHEDULE_SPREADSHEET_ID;
  const auth = new google.auth.GoogleAuth({
    keyFile: "key.json", //the key file
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });

  const authClientObject = await auth.getClient();
  const sheet = google.sheets({
    version: "v4",
    auth: authClientObject,
  });
  const readDataColOne = await sheet.spreadsheets.values.get({
    auth, //auth object
    spreadsheetId, //spreadsheet id
    range: "League Master!A:A", //sheet name and range of cells
  });

  colOneData = readDataColOne.data.values;

  if (leagueCategory === "Stone") {
    endDate = todaysDate;
  } else {
    const date = new Date();
    daysToNextSunday = 7 - Number(date.getDay());
    endDateTimestamp = date.setDate(date.getDate() + daysToNextSunday);
    endDate = new Date(endDateTimestamp).toDateString();
  }

  const writeData = await sheet.spreadsheets.values.update({
    auth, //auth object
    spreadsheetId, //spreadsheet id
    range: `League Master!A${colOneData.length + 1}:D${colOneData.length + 1}`, //sheet name and range of cells
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[leagueID, leagueCategory, todaysDate, endDate]],
    },
  });
  return writeData.data;
};

const addUsersToLeague = async ({
  leagueId,
  name,
  email,
  correct,
  attempted,
}) => {
  const spreadsheetId = process.env.SCHEDULE_SPREADSHEET_ID;
  const auth = new google.auth.GoogleAuth({
    keyFile: "key.json", //the key file
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });

  const authClientObject = await auth.getClient();
  const sheet = google.sheets({
    version: "v4",
    auth: authClientObject,
  });
  const readDataColOne = await sheet.spreadsheets.values.get({
    auth, //auth object
    spreadsheetId, //spreadsheet id
    range: "League Users!A:C", //sheet name and range of cells
  });

  colOneData = readDataColOne.data.values;

  const userFound = colOneData.find(
    (user) => +user[0] === +leagueId && user[2] === email
  );

  if (!!userFound === false) {
    const writeData = await sheet.spreadsheets.values.update({
      auth, //auth object
      spreadsheetId, //spreadsheet id
      range: `League Users!A${colOneData.length + 1}:E${colOneData.length + 1}`, //sheet name and range of cells
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [[leagueId, name, email, correct, attempted]],
      },
    });
  }
  return "Success";
};

const checkLeagueofUser = async ({ email, correct, attempted, name }) => {
  const date = new Date().setHours(0, 0, 0);
  const todaysDate = Math.floor(date / 1000);
  const spreadsheetId = process.env.SCHEDULE_SPREADSHEET_ID;
  const auth = new google.auth.GoogleAuth({
    keyFile: "key.json", //the key file
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });

  const authClientObject = await auth.getClient();
  const sheet = google.sheets({
    version: "v4",
    auth: authClientObject,
  });
  const readDataColOne = await sheet.spreadsheets.values.get({
    auth, //auth object
    spreadsheetId, //spreadsheet id
    range: "League Users!A:C", //sheet name and range of cells
  });

  const readMaster = await sheet.spreadsheets.values.get({
    auth, //auth object
    spreadsheetId, //spreadsheet id
    range: "League Master!A:E", //sheet name and range of cells
  });

  const masterData = readMaster.data.values;
  colOneData = readDataColOne.data.values;
  const userFound = colOneData.find((user) => user[2] === email);
  if (!!userFound) {
    const leagueId = Number(userFound[0]);
    const league = masterData.filter((val) => +val[0] === leagueId);
    const expiryDate = Math.floor(new Date(league[0][3]).getTime() / 1000);
    if (expiryDate < todaysDate) {
      await addUsersToLeague({ leagueId, name, email, correct, attempted });
      return true;
    } else {
      return false;
    }
  }
  return false;
};

const getDailyUsers = async () => {
  const spreadsheetId = process.env.SCHEDULE_SPREADSHEET_ID;
  const auth = new google.auth.GoogleAuth({
    keyFile: "key.json", //the key file
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const authClientObject = await auth.getClient();
  const sheet = google.sheets({
    version: "v4",
    auth: authClientObject,
  });

  const readData = await sheet.spreadsheets.values.get({
    auth, //auth object
    spreadsheetId, //spreadsheet id
    range: "League Master!A:E", //sheet name and range of cells
  });

  const readDataColOne = await sheet.spreadsheets.values.get({
    auth, //auth object
    spreadsheetId, //spreadsheet id
    range: "League Master!A:A", //sheet name and range of cells
  });

  colOneData = readDataColOne.data.values;
  const leagueMaster = readData.data.values;
  const finalUsers = [];
  const finalUsersIron = [];
  const todaysDate = new Date().toDateString();
  const data = await getSheetData();
  for (let i = 1; i < data.length; i++) {
    const date = new Date(data[i][4]).toDateString();
    const totalCorrect = Number(data[i][2]);
    const firstname = data[i][0];
    const sessionid = data[i][5];
    const email = data[i][3];
    const totalAttempted = Number(data[i][6]);
    const workshopUser = workshopSessionIds.find((id) => +id === +sessionid);
    if (workshopUser && todaysDate === date) {
      existingUser = finalUsers.find((user) => user.email === email);
      if (existingUser) {
        const [user] = finalUsers.filter((user) => user.email === email);
        const newTotalCorrect =
          Number(user.totalCorrect) + Number(totalCorrect);
        const newTotalAttempted =
          Number(user.totalAttempted) + Number(totalAttempted);
        user.totalAttempted = newTotalAttempted;
        user.totalCorrect = newTotalCorrect;
      } else {
        finalUsers.push({
          email,
          date,
          totalCorrect,
          totalAttempted,
          name: firstname,
        });
      }
    } else if (
      !workshopUser &&
      todaysDate === date &&
      !email.includes("1234500")
    ) {
      existingUser = finalUsersIron.find((user) => user.email === email);
      if (existingUser) {
        const [user] = finalUsersIron.filter((user) => user.email === email);
        const newTotalCorrect =
          Number(user.totalCorrect) + Number(totalCorrect);
        const newTotalAttempted =
          Number(user.totalAttempted) + Number(totalAttempted);
        user.totalAttempted = newTotalAttempted;
        user.totalCorrect = newTotalCorrect;
      } else {
        finalUsersIron.push({
          email,
          date,
          totalCorrect,
          totalAttempted,
          name: firstname,
        });
      }
    }
  }

  const countOfFinalUsers = finalUsers.length;
  if (countOfFinalUsers <= 0) {
    return "No Users Found";
  }
  let usersAdded = false;
  let currentLeagueID = Number(colOneData[colOneData.length - 1][0]);
  for (let i = colOneData.length - 1; i > 0; i--) {
    const leagueStartDate = new Date(leagueMaster[i][2]).toDateString();
    const leagueCategory = leagueMaster[i][1];
    let leagueStrength = Number(leagueMaster[i][4]);
    if (leagueStartDate === todaysDate && leagueCategory === "Stone") {
      for (let j = 0; j < countOfFinalUsers; j++) {
        const email = finalUsers[j].email;
        const correct = finalUsers[j].totalCorrect;
        const attempted = finalUsers[j].totalAttempted;
        const name = finalUsers[j].name;
        if (leagueStrength < 50) {
          leagueStrength++;
          await addUsersToLeague({
            leagueId: currentLeagueID,
            email,
            correct,
            attempted,
            name,
          });
        } else {
          leagueStrength = 0;
          const newLeagueID = currentLeagueID + 1;
          await createLeague({
            newLeagueID,
            leagueCategory: "Stone",
          });
          currentLeagueID = newLeagueID;
        }
      }
      usersAdded = true;
      break;
    }
  }
  if (!usersAdded) {
    await createLeague({
      leagueID: currentLeagueID + 1,
      leagueCategory: "Stone",
    });
    let newLeagueID = currentLeagueID + 1;
    for (let j = 0; j < countOfFinalUsers; j++) {
      const email = finalUsers[j].email;
      const correct = finalUsers[j].totalCorrect;
      const attempted = finalUsers[j].totalAttempted;
      const name = finalUsers[j].name;
      if (countOfFinalUsers < 50) {
        await addUsersToLeague({
          leagueId: newLeagueID,
          email,
          correct,
          attempted,
          name,
        });
      }
    }
  }
  const finalIronUsers = [];
  if (finalUsersIron.length > 0) {
    for (let i = 0; i < finalUsersIron.length; i++) {
      const existingUser = await checkLeagueofUser({
        email: finalUsersIron[i].email,
        correct: finalUsersIron[i].totalCorrect,
        attempted: finalUsersIron[i].totalAttempted,
        name: finalUsersIron[i].name,
      });
      if (!existingUser) {
        finalIronUsers.push(finalUsersIron[i]);
      }
    }
  }
  if (finalIronUsers.length > 0) {
    await createLeague({
      leagueID: currentLeagueID + 1,
      leagueCategory: "Iron",
    });
    for (let i = 0; i < finalIronUsers.length; i++) {
      await addUsersToLeague({
        leagueId: currentLeagueID + 1,
        email: finalIronUsers[i].email,
        correct: finalIronUsers[i].totalCorrect,
        attempted: finalIronUsers[i].totalAttempted,
        name: finalIronUsers[i].name,
      });
    }
  }

  return leagueMaster;
};

app.get("/", async (req, res) => {
  try {
    const data = await getDailyUsers();
    return res.status(200).send({
      data,
    });
  } catch (error) {
    return res.status(500).send({
      error,
    });
  }
});

// app.get("/test", async (req, res) => {
//   const data = await checkLeagueofUser("akash1.wisechamps@gmail.com");
//   res.send({ data });
// });

app.listen(PORT, () => {
  console.log("Server Started 🎈🎈");
});
