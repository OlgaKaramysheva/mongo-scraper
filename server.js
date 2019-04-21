const express = require("express");
const exphbs = require("express-handlebars");
const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 8080;

const db = require("./models");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/scraperData";

mongoose
    .connect(MONGODB_URI, { useNewUrlParser: true }, (err) => {
        if(err) throw err;
        console.log("Database Connected!");
    });


app.use(express.static("public"));

app.get("/", (req, res) => {
    db.Article
        .find({})
        .populate("comments")
        .then(dbArticles => {
            // res.json(dbArticles);
            res.render("home", {articles: dbArticles});
        });
});

app.get("/scrape", (req, res) => {
    axios
        .get("https://www.spacex.com/news")
        .then(response => {
            const $ = cheerio.load(response.data);
            $("div.views-row").each(function (i, element) {
                let title = $(element).find("h2").text();
                let link = $(element).find("a").attr("href");
                let description = $(element).find("p").text();
                let postObj = {
                    title: title,
                    link: link,
                    description: description
                };
                console.log(postObj);
                db.Article
                    .create(postObj)
                    .then(dbArticle => console.log(dbArticle))
                    .catch(err => console.log(err));
            });

            res.send("Scraped data from spaceX");
        });
});

app.post("/api/:articleId/comment", (req, res) => {
    db.Comment
        .create({body: req.body.body})
        .then(dbComment => {
            return db.Article.findOneAndUpdate({_id: req.params.articleId}, {$push: { comments: dbComment._id}}, {new: true})
        })
        .then(() => res.redirect("/"))
        .catch(err => res.json(err));
});

app.listen(PORT, () => console.log(`App is on http://localhost:${PORT}`));
