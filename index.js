const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
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
        const allReservationCollection = client.db("caffeinaHaven").collection("allReservation");
        const allCartItemsCollection = client.db("caffeinaHaven").collection("allCartItems");
        const allCouponsCollection = client.db("caffeinaHaven").collection("allCoupons");



        // json related api
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_WEB_TOKEN, { expiresIn: '1h' });
            res.send({ token });
        })



        // verify token middleware
        const verifyToken = (req, res, next) => {
            const tokenAuthorization = req.headers.authorization;
            if (!tokenAuthorization) {
                console.log("error from first 401")
                return res.status(401).send({ message: 'Unauthorized' })
            }
            const token = tokenAuthorization.split(' ')[1]
            // verify token
            jwt.verify(token, process.env.ACCESS_WEB_TOKEN, (err, decoded) => {
                if (err) {
                    console.log(err)
                    console.log("error from second 401")
                    return res.status(401).send({ message: 'Unauthorized' })
                }
                req.decoded = decoded;
                next();
            })
        }



        // verify admin middleware
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { userEmail: email };
            const user = await allUsersCollection.findOne(query);
            const isAdmin = user?.userType === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden Access!' })
            }
            next();
        }



        // verify if user is admin
        app.get("/verifyAdminApi/:email", async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const user = await allUsersCollection.findOne(query);
            console.log(user)
            if (user?.userType === "admin") {
                console.log(user?.userType)
                admin = true;
                res.send({ admin })
            }
            else {
                console.log("admin false option")
                res.send({ admin: false })
            }
        })



        // create payment intent
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            // payment intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            });
        })




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
        app.post("/addNewItem", verifyToken, verifyAdmin, async (req, res) => {
            const newItemInfo = req.body;
            const result = await allMenusCollection.insertOne(newItemInfo);
            res.send(result);
        })


        // post new memory
        app.post("/postNewMemoryApi", verifyToken, async (req, res) => {
            const newMemory = req.body;
            const result = await allMemoriesCollection.insertOne(newMemory);
            res.send(result);
        })



        // post new reservation
        app.post("/reservationPostApi", async (req, res) => {
            const newReservation = req.body;
            const result = await allReservationCollection.insertOne(newReservation);
            res.send(result);
        })



        // post new cart Item to database
        app.post("/newOrderApi", verifyToken, async (req, res) => {
            const newOrderInfo = req.body;
            const result = await allCartItemsCollection.insertOne(newOrderInfo);
            res.send(result);
        })



        // post new coupon to database
        app.post("/newCouponCreateApi", verifyToken, verifyAdmin, async (req, res) => {
            const newCouponInfo = req.body;
            const result = await allCouponsCollection.insertOne(newCouponInfo);
            res.send(result);
        })



        // coupon code validation
        app.post("/couponCodeValidationApi", verifyToken, async (req, res) => {
            const appliedCouponCode = req.body.couponCode;
            const query = { couponName: appliedCouponCode };
            const result = await allCouponsCollection.findOne(query);
            if (!result) {
                return res.send({ coupon: false });
            }
            const discountPercentage = result.discountPercentage;
            res.send({ coupon: true, discountPercentage });
        })



        // get all the coupons for admin
        app.get("/getAllCouponAdminApi", verifyToken, verifyAdmin, async (req, res) => {
            const result = await allCouponsCollection.find().toArray();
            res.send(result);
        })



        // get cart Item for a user
        app.get("/getAllCartItemsApi/:id", async (req, res) => {
            const userEmail = req.params.id;
            const query = { buyerEmail: userEmail };
            const result = await allCartItemsCollection.find(query).toArray();
            res.send(result);
        })



        // get all the memories by users
        app.get("/getAllMemoriesApi", async (req, res) => {
            const result = await allMemoriesCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        })



        // get the latest menus for homepage
        app.get("/latestMenuForHomepageApi", async (req, res) => {
            const result = (await allMenusCollection.find().sort({ _id: -1 }).toArray()).slice(0, 6);
            res.send(result)
        })



        // get the latest stories
        app.get("/latestStoriesForHomeApi", async (req, res) => {
            const result = (await allMemoriesCollection.find().sort({ _id: -1 }).toArray()).slice(0, 8);
            res.send(result)
        })



        // get all the users
        app.get("/allUsers", verifyToken, verifyAdmin, async (req, res) => {
            const userType = "user";
            const query = { userType };
            const result = await allUsersCollection.find(query).toArray();
            res.send(result);
        })



        // get all the reservation
        app.get("/getAllReservationApi", verifyToken, verifyAdmin, async (req, res) => {
            const result = await allReservationCollection.find().toArray();
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



        // update user status by admin
        app.put("/updateUser/:id", verifyToken, verifyAdmin, async (req, res) => {
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
                updateDoc.$set.pinnedStatus = newPostInteraction.pinnedStatus;
            }
            // update like or remove like status
            if (newPostInteraction.likeUpdate) {
                const currentPost = await allMemoriesCollection.findOne(filter);

                // functionality for post like
                if (newPostInteraction.likeUpdate === 'like') {
                    let newLikeCount = (currentPost.likeCount || 0) + 1;
                    updateDoc.$set.likeCount = newLikeCount;
                    let currentPostLikedBy = currentPost.likedBy || [];
                    currentPostLikedBy.unshift(newPostInteraction.likedPerson)
                    updateDoc.$set.likedBy = currentPostLikedBy;
                }

                // functionality for remove like
                else {
                    let newLikeCount = currentPost.likeCount - 1;
                    updateDoc.$set.likeCount = newLikeCount;
                    let currentPostLikedBy = currentPost.likedBy;
                    let indexOfCurrentPerson = currentPostLikedBy.indexOf(newPostInteraction.likedPerson);
                    currentPostLikedBy.splice(indexOfCurrentPerson, 1);
                    updateDoc.$set.likedBy = currentPostLikedBy;
                }
            }
            const result = await allMemoriesCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })



        // delete an item from menu
        app.delete("/deleteItemApi/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await allMenusCollection.deleteOne(query);
            res.send(result);
        })



        // delete an item from cart
        app.delete("/deleteItemFromCartApi/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await allCartItemsCollection.deleteOne(query);
            res.send(result);
        })



        // delete a coupon
        app.delete("/deleteCouponApi/:id", verifyToken, verifyAdmin, async (req, res) => {
            const couponId = req.params.id;
            const query = { _id: new ObjectId(couponId) };
            const result = await allCouponsCollection.deleteOne(query);
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