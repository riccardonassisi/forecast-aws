const express = require("express")
const exphbs  = require("express-handlebars")
const https = require("https")
const fs = require("fs")
const path = require("path")
const routes = require("./routes/index")

require("dotenv").config({
  path: path.join(__dirname, "./.env")
})

const {
  HTTPS_SERVER_KEY_PATH,
  HTTPS_SERVER_CERT_PATH
} = process.env


const app = express()

app.set("views", path.join(__dirname, "views"))
app.engine(".hbs", exphbs({
  defaultLayout: "layout",
  extname: ".hbs"
}))
app.set("view engine", ".hbs")

app.use("/", routes)

const server = https.createServer({
  key: fs.readFileSync(HTTPS_SERVER_KEY_PATH),
  cert: fs.readFileSync(HTTPS_SERVER_CERT_PATH)
}, app).listen(3000, () => {
  const host = server.address().address
  const port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)
})
