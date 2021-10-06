const StateConnector = require("./StateConnector.js")
const StripeClient = require("./StripeClient.js")
const FattureInCloudClient = require("./FattureInCloudClient.js")
const AnalysisConnector = require("./AnaliysisConnector.js")
const ForecastClient = require("./ForecastClient.js")
const { getStartNextMonth, getEndNextMonth, convertCurrency, calculateAmount } = require("./utils.js")

const { config } = require("dotenv")
const { join } = require("path")
config({
  path: join(__dirname, "../.env")
})

const {
  STATE_PATH,
  ANALYSIS_PATH,
  STRIPE_SECRET_KEY,
  FATTURE_IN_CLOUD_API_UID,
  FATTURE_IN_CLOUD_API_KEY,
  FATTURE_IN_CLOUD_API_PATH
} = process.env

const forecastClient = new ForecastClient()
const stateConnector = new StateConnector({
  // statePath: STATE_PATH
})
const stripeClient = new StripeClient({
  secretKey: STRIPE_SECRET_KEY
})
const fattureInCloudClient = new FattureInCloudClient({
  apiUid: FATTURE_IN_CLOUD_API_UID,
  apiKey: FATTURE_IN_CLOUD_API_KEY,
  apiPath: FATTURE_IN_CLOUD_API_PATH
})


void (async() => {

  const customersList = await stateConnector.listCustomers("infra_professional_service")
  for (const customer of customersList) {

    const fileName = `${customer.id}_${getStartNextMonth().slice(0, 7)}.json`
    const analysisConnector = new AnalysisConnector({ filename: fileName/* , analysisPath: ANALYSIS_PATH*/ })

    // if analysisConnector.get() { // do nothing } else { do what you gotta do }

    let totalForecast = 0

    for (const account of customer.accounts) {
      const params = forecastClient.setParams(account.tags, customer.stripeId, getStartNextMonth(), getEndNextMonth())
      const result = Number(await forecastClient.executeForecast(params, account.idAccount))

      totalForecast = totalForecast + result
    }

    // inserisco valore del forecast nel db come file intero/come riga del db per calcolare il costo in futuro
    await analysisConnector.setAnalysis(customer.id, getStartNextMonth(), getEndNextMonth(), totalForecast)

    let paymentAdjustment = 0
    // trimestralmente (marzo, giugno, settembre, dicembre) azzero il fondo conguaglio e lo inserisco in fattura
    if ((new Date()).getMonth() === 9) {
      // effettuo già il cambio valuta mentre prendo il valore
      paymentAdjustment = Number(await convertCurrency({ amount: Number(customer.paymentAdjustment), from: "USD", to: "EUR" }))
      customer.paymentAdjustment = 0

      await stateConnector.updateCustomer(customer)     // aggiorno il cliente dopo aver settato il fondo a 0
    }
    // converto in euro la previsione del forecast
    totalForecast = await convertCurrency({ amount: totalForecast, from: "USD", to: "EUR" })

    const amountToPay = calculateAmount({ forecast: totalForecast, flatfee: customer.flatFee, markup: customer.markup, adjustment: paymentAdjustment, discount: customer.discount })
    const stripeResult = await stripeClient.executePayment(customer.stripeId, amountToPay)

    await fattureInCloudClient.sendInvoice({ fattureInCloudCustomerId: customer.ficId, paymentResult: (stripeResult.status === "succeeded"), customerName: customer.name, startDate: new Date(getStartNextMonth()), endDate: new Date(getEndNextMonth()), forecast: totalForecast, flatFee: customer.flatFee, paymentAdjustment, markup: customer.markup, discount: customer.discount })

  }

})()
  // eslint-disable-next-line no-console
  .catch(console.error)