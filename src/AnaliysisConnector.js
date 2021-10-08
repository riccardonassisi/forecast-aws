const { readFileSync, writeFileSync } = require("fs")
const { join } = require("path")
const AWS = require("aws-sdk")
AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: process.env.AWS_PROFILE })
const documentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_STANDARD_REGION })

class AnalysisConnector {
  #useDynamo = false
  #analysisPath = null // path del file
  #id = null  // id del db
  #analysis

  constructor({ filename, analysisPath }) {
    if (analysisPath) {
      this.#analysisPath = join(analysisPath, filename)
      this.#id = String(filename).slice(0, -5)
      this.#useDynamo = false
      try {
        this.#analysis = JSON.parse(readFileSync(this.#analysisPath))
      } catch (_) {
        this.#analysis = {}
      }
    } else {
      this.#id = String(filename).slice(0, -5)
      this.#useDynamo = true
    }
  }

  saveLocalState() {
    writeFileSync(this.#analysisPath, JSON.stringify(this.#analysis))
  }

  async getAnalysis() {
    if (this.#useDynamo) {
      try {
        const res = await documentClient.get({
          TableName: "costAnalysis",
          // eslint-disable-next-line quote-props
          Key: { "id": this.#id }
        }).promise()
        return res
      } catch (_) {
        return null
      }
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

  async updateAnalysis(analysis) {
    if (this.#useDynamo) {
      try {
        await documentClient.delete({
          TableName: "costAnalysis",
          Key: {
            id: analysis.id
          }
        }).promise()
        await documentClient.put({
          TableName: "costAnalysis",
          Item: analysis
        }).promise()
        return true
      } catch (_) {
        return false
      }
    } else {
      if (this.#id === analysis.id) {
        this.#analysis = analysis
        this.saveLocalState()
        return true
      } else {
        return false
      }
    }
  }
}

module.exports = AnalysisConnector
