let express = require("express");
let exphbs  = require('express-handlebars');
let logger = require("morgan");
let mongoose = require("mongoose");
let axios = require("axios");
let cheerio = require("cheerio");
let db = require("./models");
let PORT = process.env.PORT || 3000;

let app = express();


app.use(logger("dev"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// app.use(express.static("views"));

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
 

let MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoose-scrape";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

app.get("/scrape", function(req, res) {
  axios.get("https://www.nytimes.com/section/world").then(function(response) {
    let $ = cheerio.load(response.data);

    $("#stream-panel ol li div div a").each(function(i, element) {
      let result = {};

      result.title = $(this).children("h2").text();
      result.link = $(this).attr("href");
      result.summary = $(this).children("p").text();

      db.Article.create(result)
        .then(function(dbArticle) {
          console.log(dbArticle);
        })
        .catch(function(err) {
          console.log(err);
        });
    });

    res.send("Scrape Complete");
  });
});

app.get("/", function(req, res) {
  db.Article.find({})
    .then(function(dbArticle) {
      console.log(dbArticle)
      res.render("index", {articles: dbArticle});
    })
    .catch(function(err) {
      res.json(err);
    });
});

app.get("/articles/:id", function(req, res) {
  db.Article.findOne({ _id: req.params.id })
    .populate("comment")
    .then(function(dbArticle) {
      console.log(dbArticle)
      res.render("article", {article: dbArticle});
    })
    .catch(function(err) {
      res.json(err);
    });
});

app.post("/articles/:id/comments", function(req, res) {
  db.Comment.create(req.body)
    .then(function(dbComment) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { comment: dbComment._id }, { new: true });
    })
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      res.json(err);
    });
});



app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
