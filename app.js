const db_config = require('./config/db_config.json');
const http_config = require('./config/http_config.json');
const log_config = require('./config/log_config.json');
const mysql = require('mysql');
const express = require('express');
var app = express();
const bodyparser = require('body-parser');
var path = require('path');
const app_log = require('simple-node-logger').createSimpleLogger(log_config.app_log);
const unsub_log = require('simple-node-logger').createSimpleLogger(log_config.unsub_log);
const open_log = require('simple-node-logger').createSimpleLogger(log_config.open_log);
const click_log = require('simple-node-logger').createSimpleLogger(log_config.click_log);

app.use(bodyparser.json());

var mysqlConnection = mysql.createConnection({
    host: db_config.host,
    user: db_config.user,
    password: db_config.password,
    port: db_config.port,
    database: db_config.database,
});

mysqlConnection.connect((err) => {
    if(!err) {
        app_log.info('Database connection succeded');
        app.listen(http_config.port, () => {
            app_log.info("server is running on port: " + http_config.port, '.\n**************************************************************************************************************');
        }).on('error', function (err) {
            mysqlConnection.destroy;
            if(err.errno === 'EADDRINUSE') {
                app_log.error('Port ', http_config.port, ' is busy, please try again with other port.\n**************************************************************************************************************');
            } else {
                app_log.error(err, '.\n**************************************************************************************************************');
            }
        });
    }
    else {
        //console.log('DB connection failed \n Error: ' + JSON.stringify(err, undefined, 2)); 
        //app_log.error('[', new Date().toJSON(), '] ', err, '.\n**************************************************************************************************************');
        err.sqlMessage != null ? app_log.error('[', new Date().toJSON(), '] ', err.sqlMessage, '.\n**************************************************************************************************************') : app_log.error('[', new Date().toJSON(), '] ', 'Cannot connect to the database server, please verify the host and the port in the config file.\n**************************************************************************************************************');
    }
});

// get datetime yyyy-mm-dd hh:mm:ss
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

// get ip address of caller
function getCallerIP(request) {
    var ip = request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress ||
        request.connection.socket.remoteAddress;
    ip = ip.split(',')[0];
    ip = ip.split(':').slice(-1)[0]; //in case the ip returned in a format: "::ffff:146.xxx.xxx.xxx"
    return ip;
}

// click
app.get('/click/:emailId/:offerId', (request, response) => {
    mysqlConnection.query('INSERT INTO click(email_id, offer_id, date_click, ip_address) VALUES(?, ?, ?, ?)', [request.params.emailId, request.params.offerId, getDateTime(), getCallerIP(request)], (err1, rows, fields) => {
        if(!err1) {
            mysqlConnection.query('SELECT offer_link FROM offer WHERE id = ?', [request.params.offerId], (err2, result, fields) => {
                if(!err2) {
                    var offer_link =result[0].offer_link;
                    response.redirect(offer_link);
                }
                else {
                    click_log.error('[', new Date().toJSON(), '] ', err2.sqlMessage, '\nemail_id: ', request.params.emailId, ', offer_id: ', request.params.offerId, '.\n**************************************************************************************************************');
                }
            });
        }
        else {
            click_log.error('[', new Date().toJSON(), '] ', err1.sqlMessage, '\nemail_id: ', request.params.emailId, ', offer_id: ', request.params.offerId, '.\n**************************************************************************************************************');
        }
    });
});

// open
app.get('/:emailId/:offerId/tracker.png', function(request, response, next) {
    var emailId = request.param.id;
    var buf = new Buffer([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
        0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x2c,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02,
        0x02, 0x44, 0x01, 0x00, 0x3b
    ]);
    response.set('Content-Type', 'image/png');
    response.end(buf, 'binary');
    //console.log('Email was opened and emailId is: ' + request.params.emailId);
    mysqlConnection.query('INSERT INTO open(email_id, offer_id, date_open, ip_address) VALUES(?, ?, ?, ?)', [request.params.emailId, request.params.offerId, getDateTime(), getCallerIP(request)], (err, rows, fields) => {
        if(err) {
            open_log.error('[', new Date().toJSON(), '] ', err.sqlMessage, '\nemail_id: ', request.params.emailId, ', offer_id: ', request.params.offerId, '.\n**************************************************************************************************************');
        }
    });
});

// unsubscribe
app.get('/unsubscribe/:emailId/:offerId', function(request, response, next) {
    mysqlConnection.query('INSERT INTO unsubscribe(email_id, offer_id, date_unsubscribe, ip_address) VALUES(?, ?, ?, ?)', [request.params.emailId, request.params.offerId, getDateTime(), getCallerIP(request)], (err, rows, fields) => {
        if(err) {
            response.sendFile(path.join(__dirname+'/resources/error.html'));
            unsub_log.error('[', new Date().toJSON(), '] ', err.sqlMessage, '\nemail_id: ', request.params.emailId, ', offer_id: ', request.params.offerId, '.\n**************************************************************************************************************');
        }
        else {
            if(request.query.unsub_spons == "yes") {
                mysqlConnection.query('SELECT sponsor_unsub_link FROM offer WHERE id = ?', [request.params.offerId], (err2, result, fields) => {
                    if(!err2) {
                        var unsub_link =result[0].sponsor_unsub_link;
                        response.redirect(unsub_link);
                    }
                    else {
                        unsub_log.error('[', new Date().toJSON(), '] ', err2.sqlMessage, '\nemail_id: ', request.params.emailId, ', offer_id: ', request.params.offerId, '.\n**************************************************************************************************************');
                        response.sendFile(path.join(__dirname+'/resources/error.html'));
                    }
                });
            }
            else {
                response.sendFile(path.join(__dirname+'/resources/success.html'));
            }
        }
    });
});