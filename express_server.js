//LIBRARIES//
const bcrypt = require('bcrypt');
const express = require("express");
const cookieSession = require('cookie-session');
const bodyParser = require("body-parser");

const PORT = 8080; // default port 8080

const app = express();

//session cookie details
app.use(cookieSession({
  name: 'session',
  keys: ["1234asdf"],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

//bodyParser used to extract body of request stream
app.use(bodyParser.urlencoded({extended: true}));

// EJS templating language used to render routes
app.set("view engine", "ejs");

//user database to store information provided during registration
//id is six-character string randomly generated via function generateRandomString
//ids used to set cookie for user
let users = { 
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

//database to store shortURLs (key), longURLs, and identifies them to a user
let urlDatabase = {
  "b2xVn2": { longURL: "http://www.lighthouselabs.ca", userID: "aJ48lW"},
  "9sm5xK": { longURL: "http://www.google.com", userID: "aJ48lW"}
};


//FUNCTIONS FOR PROJECT//
const generateRandomString = function generateRandomStringtoUseForShortURL() {
  return Math.random().toString(36).substr(2, 6);
};

const userLookup = function lookUpUserAndReturnFullProfile (loginEmail) {
  for (let id in users) {
    if (loginEmail === users[id].email) {
      return users[id];
    }
  }
  return null;
}

//separate email and cookie functions needed based on type of information available to pass to function
const cookieLookup = function checkIfCookieMatchesExistingUser (cookie) {
  for (let id in users) {
    if (cookie === users[id].id) {
      return users[id].id;
    }
  }
  return null;
}

//function to lookup URLs in the database based on a specific id and pass back an object of the short and long URLs
//allows for users to access and change their URLs alone when logged in
const urlsForUser = function userSpecificURLDatabase(id) {
  let usersURLs = {};
  for (var urls in urlDatabase) {
    if (urlDatabase[urls].userID === id){
      usersURLs[urls] = {longURL: urlDatabase[urls].longURL };
    } 
  }
  return usersURLs;
}

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

//ROUTES//
app.get("/", (req, res) => {
  res.send("Hello!");
});

//displays registration form to user 
//register link is additionally included in partial header
app.get("/register", (req, res) => {
  let templateVars = { user: users[req.session.user_id] };
  res.render("urls_register", templateVars);
});

//route to process and return registration information
//if user provides no email, password, or already exists in the user database (determined via looking up the request email), will send 403 status message
//otherwise, a new user id is set to the random string and their information is added to users database
//password is hashed with bcrypt and this value is stored in database
//session cookie is set upon new user registration to match their id
app.post("/register", (req, res) => {
  let generateUserId = generateRandomString();
  let user = userLookup(req.body.email);
  let newPassword = req.body.password;
  let hashedPassword = bcrypt.hashSync(newPassword, 10);

  if (!req.body.email || !req.body.password) {
    res.send("Error: incomplete fields. Please return to the registration page and enter an email address and password to create an account.");
  } else if (user) {
    res.send("Error: account with email provided already exists. Please return to the registration page and enter a different email address or go to the login page and login to your account.")
  } else {
    users[generateUserId] = { id: generateUserId, 
      email: req.body.email, password: hashedPassword };
    req.session.user_id = generateUserId;
    res.redirect("/urls");
  }
});

//displays login form to user
//login link is additionally included in partials header
app.get("/login", (req, res) => {
  let templateVars = { user: users[req.session.user_id] };
  res.render("urls_login", templateVars);
});

//route to verify and process login information after user has registered
//if a users email does not match an email that exists in the database or the request password does not match the password stored with their email, a 403 status message will appear
//upon successful login user will be assigned session cookie set to their user id
app.post("/login", (req, res) => {
  let user = userLookup(req.body.email);
  let loginPassword = req.body.password;

  if (!req.body.email || !req.body.password) {
    res.send("Error: incomplete fields. Please return to the login page and enter an email address and password to log in to your account.");
  } else if (!user) {
    res.send("Error: user account does not exist. Please go to the registration page to create an account.");
  }

  if (req.body.email === user.email) {
    let passwordComparer = bcrypt.compareSync(loginPassword, user.password); {
    //using bcrypt to compare loginPassword with the hashed databasePassword  
      if (passwordComparer === false) {
        res.send("Error: incorrect password. Password entered does not match password associated with your account. Please return to the login page and enter a valid password to continue.");
      } else if (passwordComparer === true)  {
        req.session.user_id = user.id;
        res.redirect("/urls");   
      }
  }
}
});

//route to handle user logout
//logout button included on partials header if user is signed in
//upon logout a users session cookie is removed and they are redirected to the main urls page
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

//displays main urls page and list of user's urls, as well as edit and delete buttons
//values on EJS template are populated based on filtered results from urlsForUser function
//conditions are included in EJS template such that a user will only be able to view URLs they have created, otherwise will see message prompting them to login or register
app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase, 
    user: users[req.session.user_id], 
    usersURLs: urlsForUser(req.session.user_id)};
  res.render("urls_index", templateVars);
});

//route to add newly created URLs to users URL list
//will check to see if user has a session cookie and if that cookie matches one in our database, so that only users can add URLs
//user will be redirected to a page displaying their new URL
//non-users will be redirected to the login page 
app.post("/urls", (req, res) => {
  let generateShortURL = generateRandomString();
  let cookieChecker = cookieLookup(req.session.user_id);
  if (req.session.user_id === cookieChecker && req.session.user_id) {
    urlDatabase[generateShortURL] = { longURL: req.body.longURL, 
      userID: req.session.user_id };                
    res.redirect(`/urls/${generateShortURL}`);
  } else {
    res.redirect("/login");
  }
});

//displays form to add a new URL, directed from the Create a New Short Link button on the main urls page
//form will POST back to /urls, and if user is logged in will add URL, otherwise will direct to login
app.get("/urls/new", (req, res) => {
  let templateVars = { urls: urlDatabase, 
    user: users[req.session.user_id] };
  res.render("urls_new", templateVars);
});

//route that will redirect user to the webpage of the longURL corresponding to their shortURL
app.get("/u/:shortURL", (req, res) => {
  let longURLWebsite = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURLWebsite);
});

//displays page that contains users shortURL and longURL, as well as a button to edit the longURL
app.get("/urls/:shortURL", (req, res) => {
  let templateVars = { shortURL: req.params.shortURL, 
    longURL: urlDatabase[req.params.shortURL].longURL, 
    user: users[req.session.user_id], cookieId: req.session.user_id, 
    ownerId: urlDatabase[req.params.shortURL].userID };
  res.render("urls_show", templateVars);
});

//route to handle edits to a user's shortURL
//will check to make sure the user editing is the user who owns the URL
//will redirect to main urls page if user is a match, otherwise will inform user they can only edit URLs belonging to them
app.post("/urls/:shortURL", (req, res) => {
  let editMatch = cookieLookup(req.session.user_id);
    if (req.session.user_id === editMatch) {
      urlDatabase[req.params.shortURL].longURL = req.body.longURL;
      res.redirect("/urls");
    } else {
      res.send("This URL does not belong to you. Only URLs belonging to a User Can be Edited.");
  }
});

//route to handle deleting a URL
//will check to make sure the user deleting the URL owns the URL
//will delete the URL if user matches, otherwise will inform user they can only delete URLs belonging to them
app.post("/urls/:shortURL/delete", (req, res) => {
  let deleteMatch = cookieLookup(req.session.user_id);
  if (req.session.user_id === deleteMatch) {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  } else {
    res.send("This URL does not belong to you. Only URLs belonging to a User Can be Deleted.");
  }
});

//verify server is running
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});