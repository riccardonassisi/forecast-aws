const AWS = require("aws-sdk")
const fs = require("fs").promises
const Stripe = require("stripe")
const fetch = require("node-fetch")

AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: "sandbox" })
const documentClient = new AWS.DynamoDB.DocumentClient()

const stripe = Stripe("sk_test_51JdAReEpVkoLtDtAYd9t9q1QEMeSIcf39FU0S5SMy87alLonUUanTEgGMH9sNOyXc2ImygNfNZCeTtqHfvCCU99I00wnZM7Yjj")

const cexp = new AWS.CostExplorer({
  endpoint: "https://ce.us-east-1.amazonaws.com",
  region: "us-east-1"
})

// prende la data di inizio e la data di fine del mese successivo su cui calcolare il forecast
const today = new Date()
// const startDate = String(new Date(today.getFullYear(), today.getMonth() + 1, 2).toISOString()).slice(0, 10);
// const endDate = String(new Date(today.getFullYear(), today.getMonth() + 2).toISOString()).slice(0, 10);

const startDate = "2021-12-01"
const endDate = "2021-12-31"

const timeSpan = {
  End: endDate,
  Start: startDate
}

const checkFileExists = async file => {
  return await fs.access(file)
    .then(() => true)
    .catch(() => false)
}

const setTags = async(tags, stripeId) => {

  const params = {
    Granularity: "MONTHLY",
    Metric: "UNBLENDED_COST",
    TimePeriod: timeSpan,
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

const calcolaForecast = async user => {

  const ca = {
    Chiave: user.ID + "_" + startDate.slice(0, 7),
    StripeId: user.StripeId,
    KeyDynamoDB: user.ID,
    FICId: user.FICId,
    PeriodoTotale: timeSpan,
    PrevisioneTotale: 0,
    Valuta: "USD"
  }

  let amount = 0

  // Per ogni account dell'utente faccio un diverso forecast
  for (const cred of user.Accounts) {

    AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: cred.idAccount })

    const params = await setTags(cred.Tags, user.StripeId)

    // const data = await cexp.getCostForecast(params).promise();
    // console.dir(data, { depth: null });
    const data = {
      Total: {
        Amount: 99.122,
        carlo: 1
      }
    }

    amount = Number(data.Total.Amount) + Number(amount)

  }

  ca.PrevisioneTotale = amount.toFixed(2)

  return ca
}

const calcolaImporti = async(user, result) => {

  const prev = Number(result.PrevisioneTotale)
  const flatf = Number(user.FlatFee)
  let disc = Number(user.Discount)
  const mark = Number(user.Markup)
  let cong = 0
  let imp = 0
  let tot = 0

  const eurprev = Number(prev.toFixed(2))

  if ((today.getMonth() + 1) % 3 === 0) {

    cong = Number(user.FondoConguaglio)
    user.FondoConguaglio = 0

    /*

    //  update userlist per azzerare conguaglio
    const res = await documentClient.update({
        TableName: 'Utenti',
        Key: { id: user.ID },
        UpdateExpression: 'set #a = :x',
        ExpressionAttributeNames: { '#a': 'FondoConguaglio' },
        ExpressionAttributeValues: { ':x': 0 }
    }).promise();

    */
  }

  imp = eurprev + flatf + mark

  imp = imp + cong

  tot = imp + (imp * 0.22)

  if (disc > 0) {
    tot = tot - disc
    disc = -disc
  } else if (disc < 0) {
    tot = tot + disc
  }
  const data = {
    Id: user.StripeId,
    FICId: user.FICId,
    Previsione: Number(eurprev.toFixed(2)),
    FlatFee: flatf,
    Discount: disc,
    Markup: mark,
    Imponibile: Number(imp.toFixed(2)),
    Totale: Number(tot.toFixed(2)),
    Conguaglio: Number(cong.toFixed(2))
  }

  return data

}

const spedisciFattura = async(info, payed, nome) => {

  const url = "https://api.fattureincloud.it:443/v1/fatture/nuovo/"

  const fattura = {
    api_uid: "844201",
    api_key: "6cc4bbf0963d6f92476f8ed0dd4651f5",
    id_client: info.FICId,
    nome,
    autocompilazione_anagrafica: true,
    valuta: "EUR",
    lista_articoli: [
      {
        nome: "Mensilità Infrastructure Service",
        descrizione: "Previsione forecast per il periodo dal " + startDate + " al " + endDate,
        prezzo_netto: info.Previsione,
        cod_iva: 0
      },
      {
        nome: "Quota fissa assegnata al cliente",
        descrizione: "Importo fisso mensile di erogazione del servizio",
        prezzo_netto: info.FlatFee,
        cod_iva: 0
      }
    ],
    lista_pagamenti: []
  }

  if (info.Conguaglio !== 0) {
    fattura.lista_articoli.push({
      nome: "Conguaglio",
      descrizione: "Conguaglio differenza previsione-costo effettivo del trimestre passato",
      prezzo_netto: info.Conguaglio,
      cod_iva: 0
    })
  }

  if (info.Markup !== 0) {
    fattura.lista_articoli.push({
      nome: "Markup aggiuntivo al cliente",
      descrizione: "Markup in aggiunta al cliente",
      prezzo_netto: info.Markup,
      cod_iva: 0
    })
  }

  if (info.Discount !== 0) {
    fattura.lista_articoli.push({
      nome: "Sconto aggiuntivo al cliente",
      descrizione: "Sconto aggiuntivo al cliente",
      prezzo_netto: info.Discount,
      cod_iva: 9
    })
  }

  const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const dueFormatted = dueDate.getDate() + "/" + (dueDate.getMonth() + 1) + "/" + dueDate.getFullYear()
  const todayFormatted = today.getDate() + "/" + (today.getMonth() + 1) + "/" + today.getFullYear()

  if (payed === "succeeded") {

    fattura.lista_pagamenti.push({
      data_scadenza: dueFormatted,
      importo: "auto",
      metodo: "not",
      data_saldo: todayFormatted
    })
  } else {

    fattura.lista_pagamenti.push({
      data_scadenza: dueFormatted,
      importo: "auto",
      metodo: "not"
    })
  }

  return await fetch(url, {
    method: "post",
    body: JSON.stringify(fattura),
    headers: { "Content-Type": "application/json" }
  })


}

const payWithStripe = async(totale, id) => {

  // prendo utente a cui inviare il payment intent
  const cliente = await stripe.customers.retrieve(id)

  const pInt = await stripe.paymentIntents.create({
    amount: Number(totale * 100).toFixed(0),           // importo in centesimi
    currency: "eur",
    customer: id,                           // id stripe per fare la charge direttamente sul cliente
    description: "Pagamento mensile preventivo, addebitato al cliente " + cliente.name + ", per l\"AWS Infrastructure Professional Service.",
    confirm: true                                   // indirizzamento automatico dell'intenzione di pagamento di stripe
  })

  return pInt.status

}

const main = async() => {

  // chiamata a DynamoDB per recuperare i clienti (essenzialmente servono solo StripeID e FondoConguaglio e KEY per update)
  // const users = await documentClient.query({TableName: 'Utenti'}).promise();


  const userFile = await fs.readFile("/home/riccardonassisi/Desktop/fake_db/userlist.json", "utf-8")
  const userInfo = JSON.parse(userFile)

  for (const user of userInfo) {

    const filename = "cost-analysis_" + user.StripeId + "_" + startDate.slice(0, 7) + ".json"
    // const ca = await documentClient.get({TableName: 'AnalisiCosti',Key:{Chiave: user.ID + '_' + startDate.slice(0, 7)}}).promise();

    // SE IL FILE / RIGA-DEL-DB NON ESISTE ENTRO E FACCIO TUTTI I CALCOLI NECESSARI
    if (!(await checkFileExists("/home/riccardonassisi/Desktop/fake_db/" + filename))) {
    // if (ca == null)
      const results = await calcolaForecast(user)

      const invoiceInfo = await calcolaImporti(user, results)

      let paymentResult

      if (user.MetodoPagamento === "Stripe") {

        paymentResult = await payWithStripe(invoiceInfo.Totale, user.StripeId)

      } else if (user.MetodoPagamento === "") {

        // do nothing

      }

      await spedisciFattura(invoiceInfo, paymentResult, user.Nome)

      // put costanalysis
      // const ca = await documentClient.put({TableName: 'AnalisiCosti',Item: {result  s}}).promise();

      const printJson = JSON.stringify(results)
      await fs.writeFile("/home/riccardonassisi/Desktop/fake_db/" + filename, printJson)
    }

  }
  await fs.writeFile("/home/riccardonassisi/Desktop/fake_db/userlist.json", JSON.stringify(userInfo))

}

main()
