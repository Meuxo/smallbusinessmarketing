// server.js — full backend for new admin dashboard

const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const PORT = 3000;


app.use(cors());
app.use(bodyParser.json());
app.use(express.static("../frontend"));

// data hold
const DATA_FILE = "submissions.json";

// check for file
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}


function loadData() {
    return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
    return Math.random().toString(36).substring(2, 10); // small but unique ID
}



const ADMIN_USERNAME = "test";
const ADMIN_PASSWORD = "test123";
const ADMIN_TOKEN = "token"; // static token

app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return res.json({ token: ADMIN_TOKEN });
    }

    return res.status(401).json({ message: "Invalid credentials" });
});

// Validate auth
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || auth !== "Bearer " + ADMIN_TOKEN) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
}

//signup

app.post("/submit", (req, res) => {
    try {
        let data = loadData();

        const entry = {
            id: generateId(),
            name: req.body.name || "",
            email: req.body.email || "",
            phone: req.body.phone || "",
            interests: req.body.interests || "",
            optin: req.body.optin === true,
            date: new Date().toISOString()
        };

        data.push(entry);
        saveData(data);

        res.json({ status: "success" });
    } catch (err) {
        console.error("Submit error:", err);
        res.status(500).json({ message: "Failed to save submission" });
    }
});


app.get("/api/customers", requireAuth, (req, res) => {
    try {
        const data = loadData();
        res.json(data);
    } catch (err) {
        console.error("Load error:", err);
        res.status(500).json({ message: "Failed to load customers" });
    }
});

app.delete("/api/customers/:id", requireAuth, (req, res) => {
    try {
        const id = req.params.id;
        let data = loadData();
        const newData = data.filter(entry => entry.id !== id);

        saveData(newData);
        res.json({ status: "deleted" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ message: "Delete failed" });
    }
});

//select bulk to delete
app.post("/api/customers/bulk-delete", requireAuth, (req, res) => {
    try {
        const ids = req.body.ids || [];
        let data = loadData();
        const newData = data.filter(entry => !ids.includes(entry.id));

        saveData(newData);
        res.json({ status: "bulk-deleted", count: ids.length });
    } catch (err) {
        console.error("Bulk delete error:", err);
        res.status(500).json({ message: "Bulk delete failed" });
    }
});

//sending sms, doesnt function without real twilio integration

app.post("/api/send-sms", requireAuth, async (req, res) => {
    try {
        const { mode, message } = req.body;

        if (!message || message.trim() === "") {
            return res.status(400).json({ message: "Message is required" });
        }

        const data = loadData();
        let numbers = [];

        switch (mode) {
            case "all_optin":
                numbers = data.filter(x => x.optin).map(x => x.phone);
                break;

            case "interest":
                numbers = data.filter(x => x.interests === req.body.interest).map(x => x.phone);
                break;

            case "selected":
                numbers = data
                    .filter(x => req.body.ids.includes(x.id))
                    .map(x => x.phone);
                break;

            case "manual":
                numbers = req.body.numbers || [];
                break;

            default:
                return res.status(400).json({ message: "Invalid mode" });
        }

        // integrate twilio eventually 
        console.log("Sending SMS to:", numbers);
        console.log("Message:", message);

        return res.json({
            status: "sent",
            recipients: numbers.length
        });
    } catch (err) {
        console.error("SMS error:", err);
        res.status(500).json({ message: "SMS sending failed" });
    }
});



app.listen(PORT, () =>
    console.log(`Backend running on http://localhost:${PORT}`)
);
