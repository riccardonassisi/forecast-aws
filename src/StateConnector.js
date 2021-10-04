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
    },
    {
        "ID": "002",
        "Nome": "Sandrokan",
        "StripeId": "cus_KK0NicwNFpaELv",
        "FICId": "002",
        "Accounts": [
            {
                "idAccount": "blebleble",
                "Tags": [
                    "T1",
                    "T2",
                    "T3"
                ]
            },
            {
                "idAccount": "blublublu",
                "Tags": [
                    "T1",
                    "T2"
                ]
            }
        ],
        "TipoContratto": "infra_professional_service",
        "FondoConguaglio": -14,
        "FlatFee": 14,
        "Discount": 0,
        "Markup": 54,
        "MetodoPagamento": "Stripe"
    },
    {
        "ID": "003",
        "Nome": "Riccardo Prova",
        "StripeId": "cus_KK0QVCN5EUasAV",
        "FICId": "003",
        "Accounts": [
            {
                "idAccount": "blobloblo",
                "Tags": [
                    "T1",
                    "T2",
                    "T3"
                ]
            }
        ],
        "TipoContratto": "infra_professional_service",
        "FondoConguaglio": 36,
        "FlatFee": 1234,
        "Discount": -22,
        "Markup": 0,
        "MetodoPagamento": "Stripe"
    }
]


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
        if (this.#state.customers[i].id === customer.id) {
          this.#state.customers[i] = customer
        }
      }
      this.saveLocalState()
    }
  }

  addCustormer(customer) {
    if (this.#useDynamo) {
      // TODO fare la query su dynamo equivalente
    } else {
      this.#state.customers.push(customer)
      this.saveLocalState()
    }
  }

  listCustomers(type) {
    if (this.#useDynamo) {
      // TODO fare la query su dynamo equivalente
    } else {
      return this.#state.customers.filter(e => type === e.type)
    }
  }
}

module.exports = StateConnector
