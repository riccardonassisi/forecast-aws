const { join } = require("path")
require("dotenv").config({
  path: join(__dirname, "../.env")
})

const StateConnector = require("./StateConnector.js")
const StripeClient = require("./StripeClient.js")
const FattureInCloudClient = require("./FattureInCloudClient.js")
const AnalysisConnector = require("./AnaliysisConnector.js")
const ForecastClient = require("./ForecastClient.js")
const { getStartNextMonth, getEndNextMonth, convertCurrency, calculateAmount, setParams } = require("./utils.js")

const {
  STATE_PATH,
  ANALYSIS_PATH,
  STRIPE_SECRET_KEY,
  FATTURE_IN_CLOUD_API_UID,
  FATTURE_IN_CLOUD_API_KEY,
  FATTURE_IN_CLOUD_API_PATH
} = process.env

const forecastClient = new ForecastClient()

// se viene passato il path il connector usa il file system; se vuoto invece utilizza dynamodb
const stateConnector = new StateConnector({
  statePath: STATE_PATH
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

    const idAnalysis = `${customer.id}_${getStartNextMonth().slice(0, 7)}`
    const analysisFullPath = join(ANALYSIS_PATH, `${idAnalysis}.json`)

    // se viene passato solo id il connector utilizza dynamo, se invece si passa anche il path utilizza il file system
    const analysisConnector = new AnalysisConnector({ analysisPath: analysisFullPath, id: idAnalysis })

    if (!analysisConnector.getAnalysis().id) {

      let totalForecast = 0

      for (const account of customer.accounts) {
        const params = setParams(account.tags, customer.stripeId, getStartNextMonth(), getEndNextMonth())
        const result = Number(await forecastClient.executeForecast(params, account.idAccount))

        totalForecast = totalForecast + result
      }

      // inserisco valore del forecast nel db come file/come riga del db per confrontare il costo in futuro
      await analysisConnector.setAnalysis(customer.id, getStartNextMonth(), getEndNextMonth(), totalForecast)


      let paymentAdjustment = 0
      // trimestralmente (marzo, giugno, settembre, dicembre) azzero il fondo conguaglio e lo inserisco in fattura
      if ((new Date()).getMonth() + 1 % 3 === 0) {
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
  }

})()
  // eslint-disable-next-line no-console
  .catch(console.error)
