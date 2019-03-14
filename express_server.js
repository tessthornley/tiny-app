var express = require("express");
var cookieParser = require('cookie-parser')
var app = express();
app.use(cookieParser());
var PORT = 8080; // default port 8080
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");

function generateRandomString() {
  return Math.random().toString(36).substr(2, 6);
};

const users = { 
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  }
};

function userLookup(newEmail) {
  for (var id in users) {
    if (newEmail === users[id].email) {
      return users[id];
    }
  }
  return null;
};

var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/register", (req, res) => {
  let templateVars = { user: users[req.cookies["user_id"]] };
  res.render("urls_register", templateVars);
});

app.post("/register", (req, res,) => {
  const generateUserId = generateRandomString();
  const user = userLookup(req.body.email);

  if (!req.body.email || !req.body.password || user) {
    res.send("Status Code 400");
    return;
  } else {
    users[generateUserId] = { id: generateUserId, email: req.body.email, password: req.body.password };
    res.cookie("user_id", generateUserId);
    res.redirect("/urls");
  };
});

app.get("/login", (req, res) => {
  let templateVars = { user: users[req.cookies["user_id"]] };
  res.render("urls_login", templateVars);
});

app.post("/login", (req, res) => {
  const user = userLookup(req.body.email);
  const generateUserId = generateRandomString();
  if (!user) {
    res.send("Status Code 403");
    return;
  } 

  if (req.body.email === user.email && req.body.password !== user.password) {
    res.send("Status Code 403");
  } else {
    res.cookie("user_id", generateUserId);
    res.redirect("/urls");   
  };
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase, user: users[req.cookies["user_id"]] };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  const generateShortURL = generateRandomString();
  urlDatabase[generateShortURL] = req.body.longURL;                
  res.redirect(`/urls/${generateShortURL}`);
});

app.get("/urls/new", (req, res) => {
  let templateVars = { urls: urlDatabase, user: users[req.cookies["user_id"]] }
  res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], user: users[req.cookies["user_id"]] };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const newLongURL = urlDatabase[req.params.shortURL];
  res.redirect(newLongURL);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls");
});

app.post("/urls/:shortURL", (req, res) => {
  urlDatabase[req.params.shortURL] = req.body.longURL;
  res.redirect("/urls");
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});