const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const allMenusCollection = client.db("caffeinaHaven").collection("allMenus");
        const allMemoriesCollection = client.db("caffeinaHaven").collection("allSharedMemories");


        // post new created user data to database
        app.post("/createNewUser", async (req, res) => {
            const newUserInfo = req.body;
            const query = { email: newUserInfo?.userEmail }
            const existingUser = await allUsersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "User already exists", insertedId: null })
            }
            else {
                const result = await allUsersCollection.insertOne(newUserInfo);
                res.send(result);
            }
        })



        // post new item to database
        app.post("/addNewItem", async (req, res) => {
            const newItemInfo = req.body;
            const result = await allMenusCollection.insertOne(newItemInfo);
            res.send(result);
        })


        // post new memory
        app.post("/postNewMemoryApi", async (req, res) => {
            const newMemory = req.body;
            const result = await allMemoriesCollection.insertOne(newMemory);
            res.send(result);
        })



        // get all the memories by users
        app.get("/getAllMemoriesApi", async (req, res) => {
            const result = await allMemoriesCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        })



        // get all the users
        app.get("/allUsers", async (req, res) => {
            const userType = "user";
            const query = { userType };
            const result = await allUsersCollection.find(query).toArray();
            res.send(result);
        })



        // get all the menus
        app.get("/allMenu", async (req, res) => {
            const category = req.query.category;
            const foodOrigin = req.query.foodOrigin.toLowerCase();
            // get filtered list
            let query = {};
            if (category !== "all") {
                query.itemCategory = { $regex: category, $options: 'i' }
            }
            if (foodOrigin !== "all") {
                query.foodOrigin = { $regex: foodOrigin, $options: 'i' }
            }
            const result = await allMenusCollection.find(query).sort({ _id: -1 }).toArray();
            res.send(result);
        })



        // get current user data
        app.get("/currentUser/:id", async (req, res) => {
            const email = req.params.id;
            const query = { userEmail: email };
            const result = await allUsersCollection.findOne(query);
            res.send(result);
        })



        // update user status
        app.put("/updateUser/:id", async (req, res) => {
            const userId = req.params.id;
            const filter = { _id: new ObjectId(userId) };
            const options = { upsert: true };
            const updatedInfo = req.body;
            const updateDoc = {
                $set: {
                    userStatus: updatedInfo?.userStatus
                }
            }
            const result = await allUsersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })



        // update post interaction info
        app.put("/postInteractApi/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const newPostInteraction = req.body;
            const updateDoc = { $set: {} }
            if (newPostInteraction.pinnedStatus) {
                updateDoc.$set.pinnedStatus = newPostInteraction.pinnedStatus
            }
            // update like or remove like status
            if (newPostInteraction.likeUpdate) {
                const currentPost = await allMemoriesCollection.findOne(filter);
                if (newPostInteraction.likeUpdate === 'like') {
                    let newLikeCount = (currentPost.likeCount || 0) + 1;
                    updateDoc.$set.likeCount = newLikeCount;
                    let currentPostLikedBy = currentPost.likedBy || [];
                    currentPostLikedBy.unshift(newPostInteraction.likedPerson)
                    updateDoc.$set.likedBy = currentPostLikedBy;
                }
                else {
                    let newLikeCount = currentPost.likeCount - 1;
                    updateDoc.$set.likeCount = newLikeCount;
                    let currentPostLikedBy = currentPost.likedBy;
                    let indexOfCurrentPerson = currentPostLikedBy.indexOf(newPostInteraction.likedPerson)
                    currentPostLikedBy.splice(indexOfCurrentPerson, 1);
                    updateDoc.$set.likedBy = currentPostLikedBy;
                }
            }
            const result = await allMemoriesCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })



        // delete an item
        app.delete("/deleteItemApi/:id", async (req, res) => {
            const id = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await allMenusCollection.deleteOne(query);
            res.send(result);
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