const fs = require("fs");
const path = require("path");
const express = require("express");
const rangeParser = require("range-parser");
const mime = require("mime");
const pump = require("pump");
const WebTorrent = require("webtorrent");

const trackers = require("../utils/trackers");

// Sintel
// magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent

const router = express.Router();

const client = new WebTorrent({ downloadLimit: 7000000 });

let stats = {
  progress: 0,
  downloadSpeed: 0,
  ratio: 0,
};

let error_message = "";

client.on("error", (err) => {
  error_message = err.message;
});

client.on("download", (bytes) => {
  stats = {
    progress: Math.round(client.progress * 100 * 100) / 100,
    downloadSpeed: client.downloadSpeed,
    ratio: client.ratio,
  };
});

router.get("/add/:magnet", (req, res) => {
  const magnet = req.params.magnet;

  // const old_magnets = client.torrents.map((torrent) => torrent.infoHash);
  // old_magnets.forEach((magnet) => client.remove(magnet));
  // console.log("CLEARED OLD MAGNETS");

  try {
    client.add(
      magnet,
      {
        announce: trackers,
        store: require("memory-chunk-store"),
      },
      function (torrent) {
        let files = [];
        torrent.files.forEach(function (file) {
          files.push({
            name: file.name,
            length: file.length,
          });
        });
        torrent.on("error", (error) => {
          console.log("ADD MAGNET ERROR: ", error);
        });

        res.json(files);
      }
    );
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
});

router.get("/stream/:magnet/:file_name", (req, res, next) => {
  let magnet = req.params.magnet;
  var tor = client.get(magnet);
  console.log("Got torrent!!!!");

  const file = tor.files.find((file) => file.name === req.params.file_name);

  if (!file) {
    return res.status(404).end();
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", mime.getType(file.name));
  res.setHeader("Accept-Ranges", "bytes");
  res.attachment(file.name);

  console.log("SET HEADER PART 1");

  let range = rangeParser(file.length, req.headers.range || "");

  console.log("GOT RANGE!!!!");

  if (Array.isArray(range)) {
    res.statusCode = 206;
    range = range[0];

    res.setHeader(
      "Content-Range",
      `bytes ${range.start}-${range.end}/${file.length}`
    );
    res.setHeader("Content-Length", range.end - range.start + 1);
  } else {
    range = null;
    res.setHeader("Content-Length", file.length);
  }

  console.log("ALL GOOD, PUMPING!!!!");

  pump(file.createReadStream(range), res);
});

router.get("/list", (req, res, next) => {
  try {
    let torrent = client.torrents.reduce(function (array, data) {
      array.push({
        hash: data.infoHash,
      });

      return array;
    }, []);

    //	->	Return the Magnet Hashes
    res.status(200).json(torrent);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});

router.get("/stats", (req, res, next) => {
  res.status(200).json(stats);
});

router.get("/errors", (req, res, next) => {
  res.status(200).json(error_message);
});

router.get("/delete/:magnet", (req, res, next) => {
  let magnet = req.params.magnet;

  client.remove(magnet, { destroyStore: true }, function () {
    res.status(200).end();
  });
});

module.exports = router;
