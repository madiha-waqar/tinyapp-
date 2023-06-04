const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs"); // Set EJS as view engine
app.use(express.urlencoded({ extended: true })); // Express's body-parser to make buffer data readable
app.use(cookieParser()); // Use Express's cookie-parser


const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "user1",
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "user1",
  },
};

const users = {  // create global users object
  user1: {
    id: "user1",
    email: "user1@mail.com",
    password: "user1",
  },
  user2: {
    id: "user2",
    email: "user2@mail.com",
    password: "user2",
  },
};

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const generateRandomString = () => { // generate shorturl/id string of 6 alphanumeric charcters   
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
};

const getUserByEmail = (email) => { // helper function for user lookup through email address
  for (const user in users) {
    if (users[user].email === email) {
      return users[user]; // returns the user with matching email address
    }
  }
  return null;
}

const urlsForUser = (id) => {
  const userUrls = {};
  for (const shortId in urlDatabase) {
    if ( urlDatabase[shortId].userID === id) {
      userUrls[shortId] = urlDatabase[shortId];
    }
  }
  return userUrls; // returns the URLs where the userID is equal to the id of the currently logged-in user.
};

app.get("/", (req, res) => {
  res.send("Hello!"); // response can contain somple string
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase); // response can contain JSON object
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n"); // response can contain HTML code
});

app.get("/urls", (req, res) => {
  console.log('Testing user', urlsForUser(req.cookies['user_id']) )

  const templateVars = { urls: urlsForUser(req.cookies['user_id']), user: users[req.cookies['user_id']] }; // update route to use new user_id cookie and data in users object
  if (req.cookies['user_id']) {
    res.render("urls_index", templateVars); // pass the URL data to url view template
  }
  else
    return res.status(403).send("<h2>Please register or login to access URLS<h2>");
});

app.get("/urls/new", (req, res) => { // route handler to render page with the form
  const templateVars = { user: users[req.cookies['user_id']] }; // update route to use new user_id cookie and data in users object
  if (req.cookies['user_id']) { // if user is logged in then redirect to login page
    res.render("urls_new", templateVars);
  }
  else {
    res.redirect(`/login`);
  }
});

app.get("/urls/:id", (req, res) => {  // new route to render individual urls by id
  const templateVars = { id: req.params.id, longURL: urlDatabase[req.params.id].longURL, urls: urlsForUser(req.cookies['user_id']), user: users[req.cookies['user_id']] }; // update route to use new user_id cookie and data in users object
  if (urlDatabase[req.params.id]) {
  res.render("urls_show", templateVars);
}});

app.get("/u/:id", (req, res) => {
  if (urlDatabase[req.params.id]) {
  const longURL = urlDatabase[req.params.id].longURL; // capture longURL from database against /u/:id"
  if (longURL) {
    res.redirect(longURL);
  }
  else {
    res.status(404).send("<h2>The requested shortened URL does not exist<h2>");
  }
}});

app.get("/register", (req, res) => {  // new route to registration page
  const templateVars = { user: users[req.cookies['user_id']] };
  if (req.cookies['user_id']) { // if user is logged in then redirect to url page
    res.redirect(`/urls`);
  }
  else {
    res.render("urls_register", templateVars);
  }
});

app.get("/login", (req, res) => {  // new route to login page
  const templateVars = { user: users[req.cookies['user_id']] };
  if (req.cookies['user_id']) { // if user is logged in then redirect to url page
    res.redirect(`/urls`);
  }
  else {
    res.render("urls_login", templateVars);
  }
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {  // Update according to new db structure
    longURL: req.body.longURL,
    userID: req.cookies['user_id']
  };
  res.redirect(`/urls/${shortURL}`); //redirect the user to a new page that shows them the new short url they created
});

app.post("/urls/:id", (req, res) => { // POST route that updates the URL resource
  if ((urlDatabase[req.params.id].userID) === req.cookies['user_id'])
  {
    urlDatabase[req.params.id].longURL = req.body.updatedURL; // Store the value of updated url against the shorturl selected
  console.log('This is updated db:', urlDatabase)    
    res.redirect(`/urls`);
  }
});

app.post("/urls/:id/delete", (req, res) => { // POST route that removes a URL resource
  delete urlDatabase[req.params.id]
  res.redirect(`/urls`);
});

app.post("/login", (req, res) => { // POST route to handle the /login
  const user = getUserByEmail(req.body.email); // if entered email matches with users email in database
  if (!user) {
    return res.status(403).send('The email is not registered');
  }
  if (req.body.password !== user.password) {
    return res.status(403).send('The password does not match. Please try again.');
  }
  res.cookie('user_id', user.id); //Sets user_id cookie with matching user's ID on successful login
  res.redirect(`/urls`);
});

app.post("/logout", (req, res) => { // POST route to handle the /logout
  res.clearCookie('user_id'); //Clear the cookie on pressing the logout button
  res.redirect(`/login`); // redirect to index url page
});

app.post("/register", (req, res) => { // POST route to handle the /register functionality
  const id = generateRandomString();

  if (!req.body.email || !req.body.password) { // if user has not input email address or password
    return res.status(400).send('Email or password fields cannot be empty for user registration');
  }
  if (!getUserByEmail(req.body.email)) { // if email address doesnt exist in user database then add the user
    users[id] = {
      id,
      email: req.body.email,
      password: req.body.password
    }
    res.cookie('user_id', id);
    res.redirect(`/urls`); // redirect to index url page
  }
  else {
    return res.status(400).send('This email has already been registered with us!');
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});