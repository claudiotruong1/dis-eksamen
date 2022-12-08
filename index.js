const express = require('express');
const session = require('express-session');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const server = require('http').createServer(app)

var io = require("socket.io")(server, {
  /* Handling CORS: https://socket.io/docs/v3/handling-cors/ for ngrok.io */
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(__dirname + '/views'))
app.use(express.static(__dirname + '/socket.io/socket.io.js'))

// initialisere session
app.use(
  session({ 
      secret: "Keep it secret",
      name: "uniqueSessionID",
      saveUninitialized: false,
  })
);

// gør så at boydParser fungerer optimalt
app.use(bodyParser.urlencoded({exteneded:true}));

// Vi opsætter sqlite3, der laver en database, hvis ikke databasen allerede findes 
const db = new sqlite3.Database('./db.sqlite');

// database for alle passwords der kommer, når brugere opretter sig 
db.serialize(function() {
  console.log('creating databases if they don\'t exist');
  db.run('create table if not exists users (userId integer primary key, username text not null, password text not null)');
});

// database for alle beskederne i chatten
db.serialize(function() {
  console.log('creating databases if they don\'t exist');
  db.run('create table if not exists messages (messageid integer primary key, username text not null, message text, timestamp integer)');
});

// route for hovedsiden (3000)
app.get('/hjemmeside', (req, res) => {
  return res.sendFile('/index.html', {root: path.join(__dirname, "views/")})
});

// signup route
  app.get("/signup", (req, res) => {
        return res.sendFile('/signup.html', {root: path.join(__dirname, "views/")})
  });

  // login route
  app.get("/login", (req, res) => {
    return res.sendFile('/login.html', {root: path.join(__dirname, "views/")})
});

// route for logud
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {});
  return res.send("Thank you! Visit again");
});

// route for signup formular
app.get("/signup", (req, res) => {
  if (req.session.loggedIn) {
      return res.redirect("/dashboard");
  } else {
      return res.sendFile("signup.html", { root: path.join(__dirname, "views") });
  }
});

// her postes brugeren
app.post("/signup", bodyParser.urlencoded(), async (req, res) => {
  const user = await getUserByUsername(req.body.username)
  if (user.length > 0) {
    return res.send('Username already exists');
  }

  // hashing af passwords
  let hashPW = hashPassword(req.body.password) // hashing af password
  addUserToDatabase(req.body.username, hashPW);
  res.redirect('/login');
}) 

const getUserByUsername = (userName) => {
  // Smart måde at konvertere fra callback til promise:
  return new Promise((resolve, reject) => {  
    db.all(
      'select * from users where userName=(?)', // fecther en bruger
      [userName], 
      (err, rows) => {
        if (err) {
          console.error(err);
          return reject(err);
        }
        return resolve(rows);
      }
    );
  })
}

// Tilføjer user til db
const addUserToDatabase = (username, password) => { // opretter database
  db.run(
    'insert into users (username, password) values (?, ?)',  // sql statement
    [username, password], 
    function(err) {
      if (err) {
        console.error(err);
      }
    }
  );
}

// Vi hasher alle adgangskoder, og anvender salt
const hashPassword = (password) => {
  const md5sum = crypto.createHash('md5'); // vi bruger md5
  const salt = 'Some salt for the hash'; // salt = at tilføje støj
   // funktion som tager et password som er en string
    return md5sum.update(password + salt).digest('hex'); // lægger salt på password, som er en string før
  }

// Login herunder
app.post("/login", bodyParser.urlencoded(), async (req, res) => {

const user = await getUserByUsername (req.body.username)
  console.log({user});

  if (user.length == 0) { // hvis der ikke er nogen bruger, der er fundet så redircter den
    console.log("Ingen bruger blev fundet.")
    return res.redirect("/signup");
  }

// Hint: Her skal vi tjekke om brugeren findes i databasen og om passwordet er korrekt
if (user[0].password == hashPassword(req.body.password)) { // 0 finder bare det første sted i array'et, 
  req.session.loggedIn = true;
  req.session.username = req.body.username;
  console.log(req.session);
  res.redirect("/");
} else {
  // Sender en error 401 (unauthorized) til klienten
  return  res.sendStatus(401);
}

  // Opgave 2
  // Brug funktionen hashPassword til at kryptere passwords (husk både at hash ved signup og login!)
  let hashPW = hashPassword(req.body.password) // hashing af password
  addUserToDatabase(req.body.username, hashPW);
  res.redirect('/'); 
});

// SOCKET.io herunder
// Tilføjer message til db `message: {username, message}`
const addMessageToDatabase = (message) => {
  
  message.message = hashPassword(message)
  
  db.run(
    'insert into messages (username, message, timestamp) values (?, ?, ?)', 
    [message.username, message.message, Date.now()], 
    function(err) {
      if (err) {
        console.error(err);
      }
    }
  );
}

const getAllMessages = () => {
  // Smart måde at konvertere fra callback til promise:
  return new Promise((resolve, reject) => {  
    db.all('select * from messages', (err, rows) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      return resolve(rows);
    });
  })
}

// socket IO 

io.on('connection', function(socket){
  console.log("New user connected")

  // Når en ny bruger joiner
  socket.on('join', async function(name){
    socket.username = name
    console.log(name);
    io.sockets.emit("addChatter", name);
  

    const messages = await getAllMessages();
    io.sockets.emit('messages', messages);
    io.sockets.emit('new_message', {username: 'Server', message: 'Velkommen ' + name + '!'});

  });

  // Når server modtager en ny besked
  socket.on('new_message', function(message){
    // Opgave 1a ...

    addMessageToDatabase({message: message, username: socket.username});
    const username = socket.username
    console.log(username + ': ' + message);
    io.sockets.emit("new_message", {username, message});
  });
  
  // Når en bruger disconnecter
  socket.on('disconnect', function(name){
    io.sockets.emit("removeChatter", socket.username);
  });
});

// HTTP ting
app.get('/', function(req, res){
  res.sendFile(__dirname + '/views/chat.html');
});

// lytter på port 3000
app.listen(3000, () => {
  console.log('App listening on port 3000')
});