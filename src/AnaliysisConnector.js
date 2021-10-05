const { readFileSync, writeFileSync } = require("fs")
const { join } = require("path")
// const AWS = require("aws-sdk")
// const documentClient = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" })

// ha senso mettere nello stesso attributo p il path del file o l'id del db??
class AnalysisConnector {
  #useDynamo = false
  #analysisPath = null // path del file o id del db
  #analysis

  constructor({ filename, analysisPath }) {
    if (analysisPath) {
      this.#analysisPath = join(analysisPath, filename)
      this.#useDynamo = false
      try {
        this.#analysis = JSON.parse(readFileSync(this.#analysisPath))
      } catch (_) {
        this.#analysis = {}
      }
    } else {
      this.#analysisPath = filename
      this.#useDynamo = true
    }
  }

  saveLocalState() {
    writeFileSync(this.#analysisPath, JSON.stringify(this.#analysis))
  }

  getAnalysis() {
    if (this.#useDynamo) {
      // TODO query
    } else {
      return this.#analysis
    }
  }

  setAnalysis(customer, startDate, endDate, forecast) {

    const toInsert = {
      id: this.#analysisPath,
      customer,
      periodSpan: {
        Start: startDate,
        End: endDate
      },
      currency: "USD",
      forecast
    }

    if (this.#useDynamo) {
      // TODO query dynamo
    } else {
      this.#analysis = toInsert
      this.saveLocalState()
    }
  }

  updateAnalysis(analysis) {
    if (this.#useDynamo) {
      // TODO query dynamo
    } else {
      if (this.analysis.id === analysis.id) {
        this.analysis = analysis
        this.saveLocalState()
        return true
      } else {
        return false
      }
    }
  }
}

module.exports = AnalysisConnector
