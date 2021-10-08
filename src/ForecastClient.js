const AWS = require("aws-sdk")

class ForecastClient {

  #cexp

  constructor() {
    this.#cexp = new AWS.CostExplorer({
      endpoint: process.env.AWS_ENDPOINT,
      region: process.env.AWS_STANDARD_REGION
    })
  }

  // passo perché lo costruisco fuori dal metodo
  async executeForecast({ params, accountName }) {
    AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: accountName })
    try {
      // const data = await this.#cexp.getCostForecast(params).promise()
      const data = {
        Total: {
          Amount: 98.0123
        }
      }
      // solo amount (unico valore che mi serve) o anche tutto il resto?
      return data.Total.Amount
    } catch (_) {
      return 0
    }

  }

}

module.exports = ForecastClient
