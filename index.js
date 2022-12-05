const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const app = express();
app.use(express.urlencoded({extended:true}))

// route for the main site
app.get('/', (req, res) => {
    return res.sendFile(path.join(__dirname, "views/index.html"))
})

app.use(express.static(__dirname + '/public'))

app.use(
    session({ // initialisere session som indeholder nogle forskellige ting 
        secret: "Keep it secret",
        name: "uniqueSessionID",
        saveUninitialized: false,
    })
);

app.listen(3000, () => {
    console.log('App listening on port 3000')
});

// gør så at boydParser fungerer optimalt
app.use(bodyParser.urlencoded({exteneded:true}));

// Sqlite ting
const db = new sqlite3.Database('./db.sqlite');

db.serialize(function() {
  console.log('creating databases if they don\'t exist');
  db.run('create table if not exists users (userId integer primary key, username text not null, password text not null)');
});

// signup route
  app.get("/signup", (req, res) => {
        return res.sendFile(path.join(__dirname, "views/signup.html"))
  });

  // login route
  app.get("/login", (req, res) => {
    return res.sendFile(path.join(__dirname, "views/login.html"))
});


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
const hashPassword = (password) => {
  const md5sum = crypto.createHash('md5'); // vi bruger md5
  const salt = 'Some salt for the hash'; // salt = at tilføje støj
   // funktion som tager et password som er en string
    return md5sum.update(password + salt).digest('hex'); // lægger salt på password, som er en string før
  }

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {});
  return res.send("Thank you! Visit again");
});

app.get("/signup", (req, res) => {
  if (req.session.loggedIn) {
      return res.redirect("/dashboard");
  } else {
      return res.sendFile("signup.html", { root: path.join(__dirname, "views") });
  }
});

app.post("/signup", bodyParser.urlencoded(), async (req, res) => {
  const user = await getUserByUsername(req.body.username)
  if (user.length > 0) {
    return res.send('Username already exists');
  }

  let hashPW = hashPassword(req.body.password) // hashing af password
  addUserToDatabase(req.body.username, hashPW);
  res.redirect('/login');
}) 

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


app.get("/logout", (req, res) => {
req.session.destroy((err) => {});
return res.send("Thank you! Visit again");
});

app.post("/signup", bodyParser.urlencoded(), async (req, res) => {
  const user = await getUserByUsername(req.body.username)
  if (user.length > 0) {
    return res.send('Username already exists');
  }
});

  // Opgave 2
  // Brug funktionen hashPassword til at kryptere passwords (husk både at hash ved signup og login!)
  let hashPW = hashPassword(req.body.password) // hashing af password
  addUserToDatabase(req.body.username, hashPW);
  res.redirect('/'); 

});