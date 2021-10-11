const { join } = require("path")
require("dotenv").config({
  path: join(__dirname, "../.env")
})

const StateConnector = require("./StateConnector.js")
const AnalysisConnector = require("./AnaliysisConnector.js")
const CostClient = require("./CostClient.js")
const { setParams, getStartPastMonth, getEndPastMonth } = require("./utils.js")

const {
  STATE_PATH,
  ANALYSIS_PATH
} = process.env

const stateConnector = new StateConnector({
  /* statePath: STATE_PATH */
})
const costClient = new CostClient()

void (async() => {

  const customersList = await stateConnector.listCustomers("infra_professional_service")
  // eslint-disable-next-line prefer-const
  for (let customer of customersList) {

    // const idAnalysis = `${customer.id}_${getStartPastMonth().slice(0, 7)}`
    // const analysisFullPath = join(ANALYSIS_PATH, `${idAnalysis}.json`)
    const idAnalysis = `${customer.id}_2021-11`
    const analysisConnector = new AnalysisConnector({ /* analysisPath: analysisFullPath,*/ id: idAnalysis })

    const analysis = await analysisConnector.getAnalysis()

    if (!analysis.cost) {

      let totalCost = 0

      for (const account of customer.accounts) {
        const params = setParams(account.tags, customer.stripeId, getStartPastMonth(), getEndPastMonth())
        const result = Number(await costClient.executeCost(params, account.idAccount))
        totalCost = totalCost + result
      }

      const difference = totalCost - Number(analysis.forecast)

      await analysisConnector.updateAnalysis(totalCost, difference)

      customer.paymentAdjustment = Number(customer.paymentAdjustment) + difference

      await stateConnector.updateCustomer(customer)

    }

  }

}) ()
// eslint-disable-next-line no-console
  .catch(console.error)

