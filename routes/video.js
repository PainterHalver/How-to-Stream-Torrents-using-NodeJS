let fs = require("fs");
let path = require("path");
let express = require("express");
const rangeParser = require("range-parser");
const mime = require("mime");
const pump = require("pump");
let WebTorrent = require("webtorrent");

const DOWNLOAD_PATH = "E:/torrent/webtorrent";

// magnet:?xt=urn:btih:54908313d54387de2948d73080b8d808b6c7eb2b&dn=Spider-Man.No.Way.Home.2021.1080p.BluRay.H264.AAC-RARBG&tr=http%3A%2F%2Ftracker.trackerfix.com%3A80%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2790&tr=udp%3A%2F%2F9.rarbg.to%3A2910&tr=udp%3A%2F%2Ftracker.fatkhoala.org%3A13720&tr=udp%3A%2F%2Ftracker.slowcheetah.org%3A14730

let router = express.Router();

//
//	1.	When the server starts create a WebTorrent client
//
let client = new WebTorrent();

//
//	2.	The object that holds the client stats to be displayed in the front end
//	using an API call every n amount of time using jQuery.
//
let stats = {
  progress: 0,
  downloadSpeed: 0,
  ratio: 0,
};

//
//	3.	The variable that holds the error message from the client. Farly crude but
//		I don't expect to much happening hear aside the potential to add the same
//		Magnet Hash twice.
//
let error_message = "";

//
//	4.	Listen for any potential client error and update the above variable so
//		the front end can display it in the browser.
//
client.on("error", function (err) {
  error_message = err.message;
});

//
//	5.	Emitted by the client whenever data is downloaded. Useful for reporting the
//		current torrent status of the client.
//
client.on("download", function (bytes) {
  //
  //	1.	Update the object with fresh data
  //
  stats = {
    progress: Math.round(client.progress * 100 * 100) / 100,
    downloadSpeed: client.downloadSpeed,
    ratio: client.ratio,
  };
});

//
//	API call that adds a new Magnet Hash to the client so it can start
//	downloading it.
//
//	magnet 		-> 	Magnet Hash
//
//	return 		<-	An array with a list of files
//
router.get("/add/:magnet", function (req, res) {
  //
  //	1.	Extract the magnet Hash and save it in a meaningful variable.
  //
  let magnet = req.params.magnet;

  //
  //	2.	Add the magnet Hash to the client
  //
  client.add(magnet, { path: DOWNLOAD_PATH }, function (torrent) {
    //
    //	1.	The array that will hold the content of the Magnet Hash.
    //
    let files = [];

    //
    //	2.	Loop over all the file that are inside the Magnet Hash and add
    //	them to the above variable.
    //
    torrent.files.forEach(function (data) {
      files.push({
        name: data.name,
        length: data.length,
      });
    });

    //
    //	->	Once we have all the data send it back to the browser to be
    //		displayed.
    //
    res.status(200);
    res.json(files);
  });
});

//
//	The API call to start streaming the selected file to the video tag.
//
//	magnet 		-> 	Magnet Hash
//	file_name 	-> 	the selected file name that is within the Magnet Hash
//
//	return 		<-	A chunk of the video file as buffer (binary data)
//
router.get("/stream/:magnet/:file_name", function (req, res, next) {
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

//
//	The API call that gets all the Magnet Hashes that the client is actually
//	having.
//
//	return 		<-	An array with all the Magnet Hashes
//
router.get("/list", function (req, res, next) {
  //
  //	1.	Loop over all the Magnet Hashes
  //
  let torrent = client.torrents.reduce(function (array, data) {
    array.push({
      hash: data.infoHash,
    });

    return array;
  }, []);

  //
  //	->	Return the Magnet Hashes
  //
  res.status(200);
  res.json(torrent);
});

//
//	The API call that sends back the stats of the client
//
//	return 		<-	A object with the client stats
//
router.get("/stats", function (req, res, next) {
  res.status(200);
  res.json(stats);
});

//
//	The API call that gets errors that occurred with the client
//
//	return 		<-	A a string with the error
//
router.get("/errors", function (req, res, next) {
  res.status(200);
  res.json(error_message);
});

//
//	The API call to delete a Magnet Hash from the client.
//
//	magnet 		-> 	Magnet Hash
//
//	return 		<-	Just the status of the request
//
router.get("/delete/:magnet", function (req, res, next) {
  //
  //	1.	Extract the magnet Hash and save it in a meaningful variable.
  //
  let magnet = req.params.magnet;
  let torrent = client.get(magnet);

  // Delete files from disk
  fs.unlinkSync(path.join(DOWNLOAD_PATH, torrent.name));

  client.remove(magnet, function () {
    res.status(200);
    res.end();
  });
});

module.exports = router;
