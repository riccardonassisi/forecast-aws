const fetch = require("node-fetch")
const xml2js = require("xml2js")
const parser = new xml2js.Parser()

const e = module.exports

e.formatDate = d => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`

e.convertCurrency = async({ amount, from, to }) => {
  const res = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml")
  const data = await parser.parseStringPromise(await res.text())

  const exchangeRates = data["gesmes:Envelope"].Cube[0].Cube[0].Cube.reduce((acc, { $: { currency, rate } }) => {
    acc[currency] = rate
    return acc
  }, {})

  if (from === "EUR") {
    return Number((amount * exchangeRates[to]).toFixed(2))
  } else {
    return Number((amount / exchangeRates[from]).toFixed(2))
  }

}

e.getStartNextMonth = () => {
  const today = new Date()
  return String(new Date(today.getFullYear(), today.getMonth() + 1, 2).toISOString()).slice(0, 10)
}

e.getEndNextMonth = () => {
  const today = new Date()
  return String(new Date(today.getFullYear(), today.getMonth() + 2).toISOString()).slice(0, 10)
}

e.getStartPastMonth = () => {
  const today = new Date()
  return String(new Date(today.getFullYear(), today.getMonth() - 1, 2).toISOString()).slice(0, 10)
}

e.getEndPastMonth = () => {
  const today = new Date()
  return String(new Date(today.getFullYear(), today.getMonth()).toISOString()).slice(0, 10)
}

e.setParams = (tags, stripeId, startDate, endDate) => {
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

e.calculateAmount = ({ forecast, flatfee, markup, adjustment, discount }) => {
  const taxable = forecast + flatfee + markup + adjustment
  return Number((taxable + (taxable * 0.22) - discount).toFixed(2))
}
