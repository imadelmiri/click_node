const db_config = require('./config/db_config.json');
const http_config = require('./config/http_config.json');
const mysql = require('mysql');
const express = require('express');
var app = express();
const bodyparser = require('body-parser');

app.use(bodyparser.json());

var mysqlConnection = mysql.createConnection({
    host: db_config.host,
    user: db_config.user,
    password: db_config.password,
    port: db_config.port,
    database: db_config.database,
});

mysqlConnection.connect((err) => {
    if(!err)
        console.log('DB connection succeded');
    else
        console.log('DB connection failed \n Error: ' + JSON.stringify(err, undefined, 2)); 
});

app.listen(http_config.port, () => console.log('Express server is running at port no : ' + http_config.port));

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;

}

// click
app.get('/click', (req, res) => {
    mysqlConnection.query('INSERT INTO click(email_id, offer_id, adress_ip, now) VALUES(?, ?, ?, ?)', [req.query.email_id, req.query.offer_id, req.query.adress_ip, getDateTime], (err, rows, fields) => {
        if(!err) {
            mysqlConnection.query('SELECT offer_url FROM offer WHERE offer_id = ?', [req.query.offer_id], (err, result, fields) => {
                if(!err) {
                    var myUrl =result[0].offer_url;
                    res.redirect(myUrl);
                }
                else
                    console.log(err);
            });
        }
        else
            console.log(err);
    });
});
