const path = require("path");
const cors = require("cors");
const logger = require("morgan");
const express = require("express");
const bodyParser = require("body-parser");

const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//////////////////////////////////////////////////////////////////////////////

app.use("/video", require("./routes/video"));

//////////////////////////////////////////////////////////////////////////////
app.use(function (req, res, next) {
  let err = new Error("Not Found");
  err.status = 404;

  next(err);
});

//  Display any error that occurred during the request.
app.use(function (err, req, res, next) {
  let obj_message = {
    message: err.message,
  };

  if (process.env.NODE_ENV == "development") {
    obj_message.error = err;
    console.error(err);
  }

  res.status(err.status || 500).json(obj_message);
});

module.exports = app;
