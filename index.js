const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

app.get('/', (req, res) => {
    res.send('<h1>My Node App claudio hej med ig</h1>');
})

app.listen(3000, () => {
    console.log('App listening on port 3000')
});