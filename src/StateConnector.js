const AWS = require("aws-sdk")
AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: process.env.AWS_PROFILE })
const documentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_STANDARD_REGION })

const { readFileSync, writeFileSync } = require("fs")

class StateConnector {
  #useDynamo = false
  #statePath = null
  #state

  constructor({ statePath }) {
    if (statePath) {
      this.#statePath = statePath
      this.#useDynamo = false
      try {
        this.#state = JSON.parse(readFileSync(this.#statePath))
      } catch (_) {
        this.#state = {
          customers: []
        }
      }
    } else {
      this.#useDynamo = true
    }
  }

  saveLocalState() {
    writeFileSync(this.#statePath, JSON.stringify(this.#state))
  }

  async updateCustomer(customer) {
    if (this.#useDynamo) {
      try {
        await documentClient.delete({
          TableName: "customers",
          Key: {
            id: customer.id
          }
        }).promise()
        await documentClient.put({
          TableName: "customers",
          Item: customer
        }).promise()

        return true
      } catch (_) {
        return false
      }
    } else {
      for (let i = 0, l = this.#state.length; i < l; i++) {
        if (this.#state[i].id === customer.id) {
          this.#state[i] = customer
        }
      }
      this.saveLocalState()
    }
  }

  async addCustormer(customer) {
    if (this.#useDynamo) {
      try {
        await documentClient.put({
          TableName: "customers",
          Item: customer
        }).promise()
        return true
      } catch (_) {
        return false
      }
    } else {
      this.#state.push(customer)
      this.saveLocalState()
    }
  }

  async listCustomers(type) {
    if (this.#useDynamo) {
      try {
        const data = await documentClient.scan({
          TableName: "customers",
          ExpressionAttributeValues: {
            ":t": type
          },
          FilterExpression: "contractType = :t"
        }).promise()
        return data.Items
      } catch (_) {
        return null
      }

    } else {
      return this.#state.filter(e => type === e.contractType)
    }
  }
}

module.exports = StateConnector
