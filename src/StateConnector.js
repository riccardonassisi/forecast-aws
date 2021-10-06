const AWS = require("aws-sdk")
AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: "sandbox" })
const documentClient = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" })

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
      await documentClient.delete({
        TableName: "customers",
        Key: {
          id: customer.id
        }
      }).promise()

      return await documentClient.put({
        TableName: "customers",
        Item: customer
      }).promise()
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
      return await documentClient.put({
        TableName: "customers",
        Item: customer
      }).promise()
    } else {
      this.#state.push(customer)
      this.saveLocalState()
    }
  }

  async listCustomers(type) {
    if (this.#useDynamo) {
      const data = await documentClient.scan({
        TableName: "customers",
        ExpressionAttributeValues: {
          ":t": type
        },
        FilterExpression: "contractType = :t"
      }).promise()
      return data.Items
    } else {
      return this.#state.filter(e => type === e.contractType)
    }
  }
}

module.exports = StateConnector
