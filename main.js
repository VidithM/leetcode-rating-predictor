if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
const express = require("express");
const rateLimit = require("express-rate-limit");
const expressLayouts = require("express-ejs-layouts");
const bodyParser = require("body-parser");

// database
const mongoose = require("mongoose");
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
mongoose.set("useFindAndModify", false);
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => {
    console.info("Connected to Mongoose");
});

const app = express();

const limiter = rateLimit({
    max: process.env.RATE_LIMIT || 50,
    windowMs: process.env.RATE_LIMIT_WINDOW || 10 * 1000,
    message: "Too many requests, please try again later.",
});
app.enable("trust proxy");
app.use(limiter);

// body limit
app.use(express.json({ limit: "10kb" }));

// background
if (process.env.BACKGROUND == true) {
    const { bullBoardServerAdapter } = require("./background");
    app.use("/bull-board", bullBoardServerAdapter.getRouter());
    console.info("BACKGROUND is up.");
}

// web
if (process.env.WEB == true) {
    const webRouter = require("./web");
    app.set("view engine", "ejs");
    app.set("views", __dirname + "/views");
    app.set("layout", "layouts/layout");
    app.set("layout extractScripts", true);
    app.use(expressLayouts);
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static("public"));
    app.use("/", webRouter);
    console.info("WEB is up.");
}

// api
if (!process.env.API_DISABLED) {
    const apiLimiter = rateLimit({
        max: process.env.API_RATE_LIMIT || 20,
        windowMs: process.env.API_RATE_LIMIT_WINDOW || 10 * 1000,
        message: "Too many requests, please try again later.",
        // keyGenerator: function (req) {
        //     return req.ip;
        // },
    });
    app.use("/api/", apiLimiter);
    const apiRoutes = require("./routes/api");
    app.use("/api/v1/", apiRoutes);
    console.info("API is up.");
}

const port = process.env.PORT || 8080;

app.listen(port, (err) => {
    if (err) {
        console.error(err);
        return;
    }
    console.info("Listening on " + port);
});
