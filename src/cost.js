const StateConnector = require("./StateConnector.js")
const AnalysisConnector = require("./AnaliysisConnector.js")
const CostClient = require("./CostClient.js")
const { setParams, getStartPastMonth, getEndPastMonth } = require("./utils.js")

const { config } = require("dotenv")
const { join } = require("path")
config({
  path: join(__dirname, "../.env")
})

const {
  STATE_PATH,
  ANALYSIS_PATH
} = process.env

const stateConnector = new StateConnector({
  statePath: STATE_PATH
})
const costClient = new CostClient()

void (async() => {

  const customersList = await stateConnector.listCustomers("infra_professional_service")
  // eslint-disable-next-line prefer-const
  for (let customer of customersList) {

    const fileName = `${customer.id}_${getStartPastMonth().slice(0, 7)}.json`
    const analysisConnector = new AnalysisConnector({ filename: fileName, analysisPath: ANALYSIS_PATH })

    // eslint-disable-next-line prefer-const
    let analysis = await analysisConnector.getAnalysis()
    if (!analysis.cost) {

      let totalCost = 0

      for (const account of customer.accounts) {
        const params = setParams(account.tags, customer.stripeId, getStartPastMonth(), getEndPastMonth())
        const result = Number(await costClient.executeCost(params, account.idAccount))
        totalCost = totalCost + result
      }
      const difference = totalCost - Number(analysis.forecast)

      analysis.cost = totalCost
      analysis.adjustment = difference

      await analysisConnector.updateAnalysis(analysis)

      customer.paymentAdjustment = Number(customer.paymentAdjustment) + difference

      await stateConnector.updateCustomer(customer)

    }

  }


}) ()
// eslint-disable-next-line no-console
  .catch(console.error)

