const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ["http://localhost:5173"]
}));
app.use(express.json());





// connect mongoDb URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xeklkbf.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // get database and collection
        const allUsersCollection = client.db("caffeinaHaven").collection("allUsers");


        // post new created user data to database
        app.post("/createNewUser", async (req, res) => {
            const newUserInfo = req.body;
            const query = { email: newUserInfo?.email }
            const existingUser = await allUsersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "User already exists", insertedId: null })
            }
            else {
                const result = await allUsersCollection.insertOne(newUserInfo);
                res.send(result);
            }
        })












        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




// Checking if the server is running
app.get("/", (req, res) => {
    res.send("Caffeina Haven Server is running fine");
})


// Checking the running port
app.listen(port, () => {
    console.log("Caffeina Haven Server is running on port:", port)
})