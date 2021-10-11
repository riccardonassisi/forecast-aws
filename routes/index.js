const express = require("express")
const router = express.Router()
const StateConnector = require("../src/StateConnector")

router.get("/", (req, res) => {
  res.render("index")
})

router.get("/addcustomer", (req, res) => {
  res.render("addcustomer")
})

router.get("/costexe", (req, res) => {
  res.render("costexe")
})

router.get("/forecastexe", (req, res) => {
  res.render("forecastexe")
})

router.get("/customerlist", async(req, res) => {
  const stateConnector = new StateConnector({ statePath: process.env.STATE_PATH })
  try {
    const clientlist = await stateConnector.listCustomers("infra_professional_service")
    res.render("customerlist", { customers: clientlist })
  } catch (_) {
    res.render("customerlist", { customers: null })
  }
})

router.get("/costlist", (req, res) => {
  res.render("costlist")
})

router.get("/settings", (req, res) => {
  res.render("settings")
})

router.get("/customer/:id", async(req, res) => {
  const stateConnector = new StateConnector({ statePath: process.env.STATE_PATH })
  const customerId = req.params.id
  try {
    const client = await stateConnector.getCustomer(customerId)
    res.render("customer", { customer: client })
  } catch (_) {
    res.render("customer",  { customer: null })
  }
})

module.exports = router
