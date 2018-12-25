// require('events').EventEmitter.defaultMaxListeners = 0
var express = require("express");
var app = express();
var path = require("path");
var loki = require('lokijs');
var WebTorrent = require('webtorrent')
var client = new WebTorrent()
var db = new loki('loki.json');

app.use(express.static('public'));

var buildMagnetURI = function(infoHash) {
    return 'magnet:?xt=urn:btih:' + infoHash + '&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp://tracker.coppersurfer.tk/announce&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969/announce&tr=udp://tracker.coppersurfer.tk:6969/announce&tr=udp://tracker.ilibr.org:6969/announce&tr=http://tracker.mininova.org/announce&tr=http://tracker.frostwire.com:6969/announce&tr=udp://tracker.openbittorrent.com:80';
};
var getLargestFile = function(torrent) {
    var file;
    for (var i = 0; i < torrent.files.length; i++) {
        if (!file || file.length < torrent.files[i].length) {
            file = torrent.files[i];
        }
    }
    return file;
};
// Home
///////////////////////////////
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});
///////////////////////////////
app.get('/clear/:infoHash', function(req, res) {
    console.log('Removed:', req.params.infoHash);
    client.remove(req.params.infoHash);
    db.removeCollection(req.params.infoHash);
    res.status(200).send('Removed: ' + req.params.infoHash);
});
///////////////////////////////
app.get('/clear', function(req, res) {
    db.listCollections().forEach(function(value, key) {
        console.log('Removed:', value.name);
        client.remove(value.name);
        db.removeCollection(value.name);
    });
    res.status(200).send('Removed all!');
});
// Debug part, can be removed
///////////////////////////////
app.get('/info', function(req, res) {
    console.log();
    res.status(200).send(JSON.stringify(db.listCollections()));
});

// Add torrent
///////////////////////////////
app.get('/add/:infoHash', function(req, res) {
    var add = new Object();
    // Check if torrent exist
    var exist = db.getCollection(req.params.infoHash);
    if (exist) {
        res.status(200).send('Torrent exist!');
        return;
    } else {
        console.log(req.params.infoHash);
        var magnetURI = buildMagnetURI(req.params.infoHash);
        try {
            client.add(magnetURI, function(torrent) {
                console.log('Client is downloading:', torrent.infoHash)
                torrent.files.forEach(function(file) {
                    console.log('name', file.name)
                })
                db.addCollection(req.params.infoHash);
                res.status(200).send('Torrent added');
            })
        } catch (err) {
            res.status(200).send(err.toString());
        }
    }
});
// Statistic torrent
///////////////////////////////
app.get('/stats/:infoHash', function(req, res) {
    try {
        var torrent = req.params.infoHash
        var torrent = client.get(torrent);
        var stats = new Object();
        stats.downloaded = torrent.downloaded
        stats.downloadSpeed = torrent.downloadSpeed
        stats.progress = torrent.progress
        stats.numPeers = torrent.numPeers

        res.status(200).send(JSON.stringify(stats));
    } catch (err) {
        res.status(500).send('Error: ' + err.toString());
    }
});
// The stream torrent
///////////////////////////////
app.get('/stream/:infoHash', function(req, res, next) {

    var torrent = req.params.infoHash

    try {
        var torrent = client.get(torrent);
        var file = getLargestFile(torrent);
        var total = file.length;

        if (typeof req.headers.range != 'undefined') {
            var range = req.headers.range;
            var parts = range.replace(/bytes=/, "").split("-");
            var partialstart = parts[0];
            var partialend = parts[1];
            var start = parseInt(partialstart, 10);
            var end = partialend ? parseInt(partialend, 10) : total - 1;
            var chunksize = (end - start) + 1;
            var test = total / 2;

        } else {
            var start = 0;
            var end = total;
        }
        var stream = file.createReadStream({ start: start, end: end });
        res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });
        stream.pipe(res);
    } catch (err) {
        res.status(500).send('Error: ' + err.toString());
    }
});
app.listen(process.env.PORT);
console.log('Running at ' + process.env.IP + ', Port ' + process.env.PORT + '!');
