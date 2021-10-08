const { readFileSync, writeFileSync } = require("fs")
const AWS = require("aws-sdk")
AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: process.env.AWS_PROFILE })
const documentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_STANDARD_REGION })

class AnalysisConnector {
  #useDynamo = false
  #analysisPath = null // path del file
  #id = null  // id del db
  #analysis

  constructor({ analysisPath, id }) {
    if (analysisPath) {
      this.#analysisPath = analysisPath
      this.#id = id
      this.#useDynamo = false
      try {
        this.#analysis = JSON.parse(readFileSync(this.#analysisPath))
      } catch (_) {
        this.#analysis = {}
      }
    } else {
      this.#id = id
      this.#useDynamo = true
    }
  }

  saveLocalState() {
    writeFileSync(this.#analysisPath, JSON.stringify(this.#analysis))
  }

  async getAnalysis() {
    if (this.#useDynamo) {
      const res = await documentClient.scan({
        TableName: "costAnalysis",
        FilterExpression: "id = :i",
        ExpressionAttributeValues: { ":i": this.#id }
      }).promise()

      return res.Items[0]
    } else {
      return this.#analysis
    }
  }

  async setAnalysis(customer, startDate, endDate, forecast) {
    const toInsert = {
      id: this.#id,
      customer,
      periodSpan: {
        Start: startDate,
        End: endDate
      },
      currency: "USD",
      forecast
    }

    if (this.#useDynamo) {
      try {
        await documentClient.put({
          TableName: "costAnalysis",
          Item: toInsert
        }).promise()
        return true
      } catch (_) {
        return false
      }
    } else {
      this.#analysis = toInsert
      this.saveLocalState()
    }
  }

  async updateAnalysis(cost, difference) {
    if (this.#useDynamo) {
      try {
        await documentClient.update({
          TableName: "costAnalysis",
          Key: {
            id: this.#id
          },
          UpdateExpression: "set #cost = :cost, #diff = :diff",
          ExpressionAttributeNames: {
            "#cost": "cost",
            "#diff": "adjustment"
          },
          ExpressionAttributeValues: {
            ":cost": cost,
            ":diff": difference
          }
        }).promise()
        /*
        await documentClient.delete({
          TableName: "costAnalysis",
          Key: {
            id: this.#id
          }
        }).promise()

        return await documentClient.put({
          TableName: "costAnalysis",
          Item: analysis
        }).promise()
        */
        return true
      } catch (_) {
        return false
      }
    } else {
      this.#analysis.cost = cost
      this.#analysis.adjustment = difference
      this.saveLocalState()
      return true
    }
  }
}

module.exports = AnalysisConnector
