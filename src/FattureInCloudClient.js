const fetch = require("node-fetch")
const { formatDate } = require("./utils.js")

class StripeClient {
  #apiPath
  #apiUid
  #apiKey

  constructor({ apiUid, apiKey, apiPath }) {
    this.#apiUid = apiUid
    this.#apiKey = apiKey
    this.#apiPath = apiPath
  }

  async sendInvoice({ fattureInCloudCustomerId, paymentResult, customerName, startDate, endDate, forcast, flatFee, paymentAdjustment, markup, discount }) {
    const invoice = {
      api_uid: this.#apiUid,
      api_key: this.#apiKey,
      id_client: fattureInCloudCustomerId,
      nome: customerName,
      autocompilazione_anagrafica: true,
      valuta: "EUR",
      lista_articoli: [
        // TODO, questa parte andra' generata programmaticamente.
        {
          nome: "Mensilità Infrastructure Service",
          descrizione: `Previsione forecast per il periodo dal ${formatDate(startDate)} al ${formatDate(endDate)}`,
          prezzo_netto: forcast,
          cod_iva: 0
        },
        {
          nome: "Quota fissa assegnata al cliente",
          descrizione: "Importo fisso mensile di erogazione del servizio",
          prezzo_netto: flatFee,
          cod_iva: 0
        }
      ],
      lista_pagamenti: []
    }

    if (paymentAdjustment) {
      invoice.lista_articoli.push({
        nome: "Conguaglio",
        descrizione: "Conguaglio differenza previsione-costo effettivo del trimestre passato",
        prezzo_netto: paymentAdjustment,
        cod_iva: 0
      })
    }

    if (markup) {
      invoice.lista_articoli.push({
        nome: "Markup aggiuntivo al cliente",
        descrizione: "Markup in aggiunta al cliente",
        prezzo_netto: markup,
        cod_iva: 0
      })
    }

    if (discount) {
      invoice.lista_articoli.push({
        nome: "Sconto aggiuntivo al cliente",
        descrizione: "Sconto aggiuntivo al cliente",
        prezzo_netto: discount,
        cod_iva: 9
      })
    }

    const today = new Date()
    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0) // fine mese corrente
    const dueDateFormatted = formatDate(dueDate)
    const todayFormatted = formatDate(today)

    if (paymentResult === "succeeded") {
      invoice.lista_pagamenti.push({
        data_scadenza: dueDateFormatted,
        importo: "auto",
        metodo: "not",
        data_saldo: todayFormatted
      })
    } else {
      invoice.lista_pagamenti.push({
        data_scadenza: dueDateFormatted,
        importo: "auto",
        metodo: "not"
      })
    }

    const res = await fetch(this.#apiPath, {
      method: "post",
      body: JSON.stringify(invoice),
      headers: { "Content-Type": "application/json" }
    })

    if (res.ok) {
      return await res.json()
    } else {
      throw new Error(await res.text())
    }
  }
}

module.exports = StripeClient
