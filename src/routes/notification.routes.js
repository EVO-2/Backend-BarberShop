// src/routes/notification.routes.js
const express = require("express");
const { sendNotification } = require("../controllers/notification.controller");

const router = express.Router();

router.post("/", sendNotification);

module.exports = router;
