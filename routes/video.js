const fs = require("fs");
const path = require("path");
const express = require("express");
const rangeParser = require("range-parser");
const mime = require("mime");
const pump = require("pump");
const WebTorrent = require("webtorrent");

const DOWNLOAD_PATH = "E:/torrent/webtorrent";
const trackers = require("../utils/trackers");

// magnet:?xt=urn:btih:54908313d54387de2948d73080b8d808b6c7eb2b&dn=Spider-Man.No.Way.Home.2021.1080p.BluRay.H264.AAC-RARBG&tr=http%3A%2F%2Ftracker.trackerfix.com%3A80%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2790&tr=udp%3A%2F%2F9.rarbg.to%3A2910&tr=udp%3A%2F%2Ftracker.fatkhoala.org%3A13720&tr=udp%3A%2F%2Ftracker.slowcheetah.org%3A14730

const router = express.Router();

const client = new WebTorrent({ downloadLimit: 5000000 });

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

  client.add(
    magnet,
    {
      path: DOWNLOAD_PATH,
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
