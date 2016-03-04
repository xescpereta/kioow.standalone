var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var vhost = require('vhost');
var _ = require('underscore');
var http = require('http');

//Ready to create the worker process pool
var appPool = require('cluster');
//configure worker process for core
var workerCount = 1;

//Start the Pool
if (appPool.isMaster) {
    //configure and start the required worker process
    if (workerCount <= 0) {
        workerCount = require('os').cpus().length;
    }
    for (var i = 0; i < workerCount; i += 1) {
        appPool.fork();
    }
}
else {
    var app = express();
    
    
    // uncomment after placing your favicon in /public
    //app.use(favicon(__dirname + '/public/favicon.ico'));
    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());
    
    //get configured hosts
    var hosts = require('./config/hosts');
    
    _.each(hosts, function (host) {
        var handle = require(host.path);
        app.use(vhost(host.domain, handle));
    });
    
    
    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });
    
    // error handlers
    
    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: err
            });
        });
    }
    
    // production error handler
    // no stacktraces leaked to user
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
    
    
    http.createServer(app).listen(81, function () {
        console.log('Express server listening on port ' + app.get('port'));
    });
}

var dying = false;

appPool.on('exit', function (worker) {
    
    // Replace the dead worker,
    // we're not sentimental ... ;)
    if (dying == false) {
        console.log('Worker ' + worker.id + ' died :(');
        appPool.fork();
    }

});



process.on('SIGINT', function () {
    console.log('Got SIGINT.  Process exiting...');
    //redefine handlers...
    dying = true;
    appPool.on('exit', function () {
        console.log('Nothing to do. We are exiting process...');
    });
    //kill childs...
    for (var id in appPool.workers) {
        try {
            appPool.workers[id].kill('SIGINT');
        }
        catch (err) {
            console.log(err);
        }
    }
    process.exit(0);
});