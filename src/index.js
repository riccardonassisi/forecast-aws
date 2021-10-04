const StateConnector = require("./StateConnector.js")
const StripeClient = require("./StripeClient.js")
const FattureInCloudClient = require("./FattureInCloudClient.js")
const { config } = require("dotenv")
const { join } = require("path")
config({
  path: join(__dirname, "../env")
})

const {
  STATE_PATH,
  STRIPE_SECRET_KEY,
  FATTURE_IN_CLOUD_API_UID,
  FATTURE_IN_CLOUD_API_KEY,
  FATTURE_IN_CLOUD_API_PATH
} = process.env

const stateConnector = new StateConnector({
  statePath: STATE_PATH
})

const stripeClient = new StripeClient({ secretKey: STRIPE_SECRET_KEY })

const fattureInCloudClient = new FattureInCloudClient({
  apiUid: FATTURE_IN_CLOUD_API_UID,
  apiKey: FATTURE_IN_CLOUD_API_KEY,
  apiPath: FATTURE_IN_CLOUD_API_PATH
})

void (async() => {
  // TODO scrivere tutta la logica che collega i punti

})()
  // eslint-disable-next-line no-console
  .catch(console.error)
