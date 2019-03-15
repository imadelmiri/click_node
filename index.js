const mysql = require('mysql');
const express = require('express');
var app = express();
const bodyparser = require('body-parser');

app.use(bodyparser.json());

var mysqlConnection = mysql.createConnection({
    host: 'http://ec2-18-188-57-145.us-east-2.compute.amazonaws.com',
    user: 'tracker',
    password: 'tracker',
    port: '3306',
    database: 'tracking',
});

mysqlConnection.connect((err) => {
    if(!err)
        console.log('DB connection succeded');
    else
        console.log('DB connection failed \n Error: ' + JSON.stringify(err, undefined, 2)); 
});

app.listen(3000, () => console.log('Express server is running at port no : 3000'));

// click
app.get('/click', (req, res) => {
    mysqlConnection.query('INSERT INTO click VALUES(?, ?)', [req.query.email_id, req.query.offer_id], (err, rows, fields) => {
        if(!err)
            res.sebd('Data is created successfully');
        else
            console.log(err);
    });
});