const Stripe = require("stripe")

class StripeClient {
  stripe
  #secretKey

  constructor({ secretKey }) {
    this.stripe = Stripe(secretKey)
  }

  async executePayment(stripeCustomerId, amount) {
    const cliente = await this.stripe.customers.retrieve(stripeCustomerId)

    return await this.stripe.paymentIntents.create({
      amount: Number(amount * 100).toFixed(0), // importo in centesimi
      currency: "eur",
      customer: stripeCustomerId,
      description: "Pagamento mensile preventivo, addebitato al cliente " + cliente.name + ", per l\"AWS Infrastructure Professional Service.",
      confirm: true
    })
  }
}

module.exports = StripeClient
