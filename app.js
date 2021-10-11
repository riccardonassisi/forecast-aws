const path = require("path")
require("dotenv").config({
  path: path.join(__dirname, "./.env")
})

const express = require("express")
const exphbs  = require("express-handlebars")
const https = require("https")
const fs = require("fs")
const routes = require("./routes/index")

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

app.use(express.static(path.join(__dirname, "public")))

const server = https.createServer({
  key: fs.readFileSync(HTTPS_SERVER_KEY_PATH),
  cert: fs.readFileSync(HTTPS_SERVER_CERT_PATH)
}, app).listen(3000, () => {
  const port = server.address().port
  // eslint-disable-next-line no-console
  console.log(`AWS-Dashboard in ascolto su https://localhost:${port}`)
})
