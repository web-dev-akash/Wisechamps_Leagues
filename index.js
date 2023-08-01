const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;

const workshopSessionIds = ["168909784", "190081258", "116627729", "176886614"];

const getSheetData = async () => {
  const id = "1J8T_fBa23LwSRoQIv4RAd1_1fhQ0UtQYtC7q6iJHA1A";
  const gid = "116082223";
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&tq&gid=${gid}`;
  const config = {
    headers: {
      "Content-Type": "text/xml",
    },
  };
  const txt = await axios.get(url, config);
  const txt2 = txt.data;
  const jsonString = txt2.slice(47, -2);
  const response = JSON.parse([jsonString]);
  return response.table.rows;
};

const getDailyUsers = async () => {
  const finalUsers = [];
  const todaysDate = new Date().toDateString();
  const rows = await getSheetData();
  for (let i = 0; i < rows.length; i++) {
    const email = rows[i].c[3].v;
    const date = new Date(rows[i].c[4].f).toDateString();
    const sessionid = rows[i].c[5].v;
    const totalCorrect = Number(rows[i].c[2].v);
    const workshopUser = workshopSessionIds.find((id) => +id === +sessionid);
    if (workshopUser && todaysDate === date) {
      existingUser = finalUsers.find((user) => user.email === email);
      if (existingUser) {
        const [user] = finalUsers.filter((user) => user.email === email);
        const newTotal = Number(user.totalCorrect) + Number(totalCorrect);
        user.totalCorrect = newTotal;
      } else {
        finalUsers.push({
          email,
          date,
          sessionid,
          totalCorrect,
        });
      }
    }
  }
  const sortedFinalUsers = finalUsers.sort(
    (a, b) => b.totalCorrect - a.totalCorrect
  );
  const promotedUsers = Math.round((sortedFinalUsers.length * 90) / 100);
  console.log(promotedUsers);
  for (let i = 0; i < sortedFinalUsers.length; i++) {
    if (i < promotedUsers) {
      sortedFinalUsers[i].status = "promoted";
    } else {
      sortedFinalUsers[i].status = "demoted";
    }
  }
  return sortedFinalUsers;
};

app.get("/getDailyUsers", async (req, res) => {
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

app.listen(PORT, () => {
  console.log("Server Started 🎈🎈");
});
