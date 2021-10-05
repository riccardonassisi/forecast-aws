const AWS = require("aws-sdk")

class ForecastClient {

  #cexp

  constructor() {
    this.#cexp = new AWS.CostExplorer({
      endpoint: "https://ce.us-east-1.amazonaws.com",
      region: "us-east-1"
    })
  }

  // passo perché lo costruisco fuori dal metodo
  async executeForecast({ params, accountName }) {
    AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: accountName })
    // const data = await this.#cexp.getCostForecast(params).promise()
    const data = {
      Total: {
        Amount: 98.0123
      }
    }
    // solo amount (unico valore che mi serve) o anche tutto il resto?
    return data.Total.Amount
  }

  setParams = async(tags, stripeId, startDate, endDate) => {
    const params = {
      Granularity: "MONTHLY",
      Metric: "UNBLENDED_COST",
      TimePeriod: {
        Start: startDate,
        End: endDate
      },
      Filter: {
        And: [
          {
            Tags: {
              Key: "stripeId",
              MatchOptions: [
                "EQUALS"
              ],
              Values: [
                stripeId
              ]
            }
          },
          {
            Tags: {
              Key: "type",
              MatchOptions: [
                "EQUALS"
              ],
              Values: [
                "infra_professional_service"
              ]
            }
          }
        ]
      }
    }

    /**
     * Se si vogliono effettivamente hardcodare i tags, va definito un ordine STANDARD in modo che l'ordine
     * non sia un problema oppure definire a priori delle length in modo da fare degli "stampini" per i tag.
     * Altrimenti basta passare semplicemente tagkey e tagvalue
     */

    for (const t of tags) {
      params.Filter.And.push({
        Tags: {
          Key: t.tagName,
          MatchOptions: [
            "EQUALS"
          ],
          Values: [
            t.tagValue
          ]
        }
      })
    }

    return params
  }

}

module.exports = ForecastClient
