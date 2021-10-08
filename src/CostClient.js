const AWS = require("aws-sdk")

class CostClient {

  #cexp

  constructor() {
    this.#cexp = new AWS.CostExplorer({
      endpoint: process.env.AWS_ENDPOINT,
      region: process.env.AWS_STANDARD_REGION
    })
  }

  // passo perché lo costruisco fuori dal metodo
  async executeCost({ params, accountName }) {
    AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: accountName })

    try {
      // const data = await cexp.getCostAndUsage(params).promise()
      const data = {
        ResultByTime: [
          {
            Total: {
              BlendedCost: {
                Amount: 91.7394
              }
            }
          }
        ]
      }

      // solo amount (unico valore che mi serve) o anche tutto il resto?
      return data.ResultByTime[0].Total.BlendedCost.Amount
    } catch (_) {
      return 0
    }
  }
}

module.exports = CostClient
