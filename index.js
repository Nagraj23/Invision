const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
require('dotenv').config(); 

const app = express();

app.use(bodyParser.json());
app.use(cors({ origin: "*" })); // Allow frontend access
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

mongoose
  .connect("mongodb://localhost:27017/InVision", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Failed to connect to MongoDB", err));

app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "User created!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error!" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign({ id: user.id }, "secretkey", { expiresIn: "1h" });
  res.json({ message: "Login successful", token });
});
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required!" });
    }

    // Convert message to lowercase for case-insensitive matching
    const lowerCaseMessage = message.toLowerCase();

    // Predefined responses for identity-related questions
    const predefinedResponses = {
      "who are you": "I am InVision, an AI assistant here to help you!",
      "what is your name": "My name is InVision, your AI assistant.",
      "what are you": "I am InVision, an advanced AI assistant designed to assist you.",
      "tell me about yourself": "I am InVision, an AI assistant created to provide information and support.",
      "introduce yourself": "Hello! I am InVision, your AI assistant. How can I help you today?",
    };

    // Check if the message matches any predefined response
    for (const key in predefinedResponses) {
      if (lowerCaseMessage.includes(key)) {
        return res.json({ response: predefinedResponses[key] });
      }
    }

    // If no predefined response, proceed to fetch from AI model
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: message }] }],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const responseText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from model.";

    res.json({ response: responseText });
  } catch (error) {
    console.error("Error fetching chat response:", error.message);
    res.status(500).json({ error: "Failed to fetch response", details: error.message });
  }
});


app.get("/", (req, res) => {
  res.send("Welcome to InVision");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
