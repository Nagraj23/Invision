const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const User = require("./models/user");

const app = express();

// Middleware
app.use(cors({ origin: "*" })); // Allow frontend access
app.use(bodyParser.json());

// Load environment variables
const { GEMINI_API_KEY, MONGO_URI } = process.env;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Connect to MongoDB
mongoose
  .connect( process.env.MONGO_URI || "mongodb+srv://Nagraj:Nagraj%401323@cluster0.zd0wy.mongodb.net/InVision?retryWrites=true&w=majority")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB", err));

// Routes

// Register User
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ username, email, password: hashedPassword });

    await newUser.save();
    res.status(201).json({ message: "User created successfully!" });
  } catch (error) {
    console.error("Error in register:", error);
    res.status(500).json({ message: "Server error!" });
  }
});

// Login User
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ message: "Server error!" });
  }
});

// Chat API
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

// Root Route
app.get("/", (req, res) => {
  res.send("Welcome to InVision API");
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
