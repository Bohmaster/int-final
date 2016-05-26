var loopback = require('loopback');
var boot = require('loopback-boot');
var walk = require('walk');
var path = require('path');
var chokidar = require('chokidar');

var app = module.exports = loopback();

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    //app.start();

    var container = walk.walk('server/storage/uploads');
    var uploads   = chokidar.watch('server/storage/uploads', {ignoreInitial: true});

    var files = [];
    var demanded_files = [];

    console.log('before');

    app.io = require('socket.io')(app.start());

    app.io.on('connection', function(socket) {
        console.log('Connected to client');

        socket.on('demand', function(data) {
          console.log('on demand');

          container.on('file', function(root, fileStats, next) {
            console.log('file', root, fileStats.name);
            files.push(fileStats.name);
            next();
          });

          container.on('end', function() {
            console.log('ended');
            demanded_files = files.slice(Math.max(files.length - 2, 1));
            console.log(demanded_files);

            app.io.emit('delayed_list', {list: demanded_files});
          });

          uploads.on('add', function(fileName) {
            console.log('added', fileName);

            app.io.emit('file:added', {file: fileName});
          });

        });

    });
});
