/*
  {
    "ID": "001",
    "Nome": "Stupid Simple Sandro",
    "StripeId": "cus_KK0M4clISrL5GV",
    "FICId": "001",
    "Accounts": [
      {
        "idAccount": "s3official@prova.com",
        "Tags": [
          "T1",
          "T2",
          "T3"
        ]
    },
    {
        "idAccount": "s3@prova.com",
        "Tags": [
          "T1",
          "T2"
        ]
      }
    ],
    "TipoContratto": "infra_professional_service",
    "FondoConguaglio": -23,
    "FlatFee": 123,
    "Discount": 12,
    "Markup": 0,
    "MetodoPagamento": "Stripe"
  }

*/

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

  updateCustomer(customer) {
    if (this.#useDynamo) {
      // TODO fare la query su dynamo equivalente
    } else {
      for (let i = 0, l = this.#state.length; i < l; i++) {
        if (this.#state[i].id === customer.id) {
          this.#state[i] = customer
        }
      }
      this.saveLocalState()
    }
  }

  addCustormer(customer) {
    if (this.#useDynamo) {
      // TODO fare la query su dynamo equivalente
    } else {
      this.#state.push(customer)
      this.saveLocalState()
    }
  }

  listCustomers(type) {
    if (this.#useDynamo) {
      // TODO fare la query su dynamo equivalente
    } else {
      return this.#state.filter(e => type === e.type)
    }
  }
}

module.exports = StateConnector
