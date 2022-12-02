const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.get('/', (req, res) => {
    res.send('<h1>My Node App claudio hej med ig</h1>');
})

app.listen(3000, () => {
    console.log('App listening on port 3000')
});

// Sqlite ting
const db = new sqlite3.Database('./db.sqlite');

db.serialize(function() {
  console.log('creating databases if they don\'t exist');
  db.run('create table if not exists users (userId integer primary key, username text not null, password text not null)');
});

  app.get("/signup", (req, res) => {
        return res.sendFile(path.join(__dirname, "views/signup.html"))
  })

  app.get("/login", (req, res) => {
    return res.sendFile(path.join(__dirname, "views/login.html"))
})
  
