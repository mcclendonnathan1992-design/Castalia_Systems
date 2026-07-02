const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const PORT = 3000;

const MONGO_URL = "mongodb://admin:password@localhost:27017/?authSource=admin";
const DB_NAME = "castalia_profiles";
const COLLECTION_NAME = "user_profiles";

let profilesCollection;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function connectToMongo() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();

  const db = client.db(DB_NAME);
  profilesCollection = db.collection(COLLECTION_NAME);

  console.log("Connected to MongoDB");
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "profile-manager",
    database: DB_NAME
  });
});

app.post("/profiles", async (req, res) => {
  try {
    const profile = req.body;

    if (!profile.email) {
      return res.status(400).json({
        error: "Email is required"
      });
    }

    profile.email = profile.email.toLowerCase();
    profile.updatedAt = new Date();

    const result = await profilesCollection.updateOne(
      { email: profile.email },
      {
        $set: profile,
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    res.json({
      message: "Profile saved or updated",
      email: profile.email,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.get("/profiles/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();

    const profile = await profilesCollection.findOne({
      email: email
    });

    if (!profile) {
      return res.status(404).json({
        error: "Profile not found"
      });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.delete("/profiles/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();

    const result = await profilesCollection.deleteOne({
      email: email
    });

    res.json({
      message: "Delete complete",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

connectToMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Profile app running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
