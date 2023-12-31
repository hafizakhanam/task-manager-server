const express = require( 'express' );
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe =require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
  origin: [
      'https://task-manager-8ccae.web.app',
      'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mnxfzlt.mongodb.net/?retryWrites=true&w=majority`;

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
    //await client.connect();


    const userCollection = client.db("taskManagerDB").collection("users");
    const taskCollection = client.db("taskManagerDB").collection("task");

    // jwt api
    app.post('/jwt', async(req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '2h'});
      res.send({token});
    })

    //middlewares
    const verifyToken = (req, res, next) =>{
      console.log(req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized access'});
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
        if(err){
          return res.status(401).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
        next();
      })
      //
    }

    const verifyAdmin = async( req, res, next) =>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'});
      }
      next();
    }

    //Users collection
    app.get('/users', verifyToken, verifyAdmin, async(req, res) =>{
      //console.log(req.headers)
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async(req, res) =>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query = {email: email};
      const user = await userCollection.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role === 'admin';
      }
      //console.log(admin)
      res.send({admin});
    })

    app.post('/users', async(req, res) =>{
      const user = req.body;
      const query = {email: user.email};
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({ message: 'User already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(query);
      res.send(result);
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc ={
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    //Menu collection
    app.get('/task', async(req, res) =>{
        const result = await taskCollection.find().toArray();
        res.send(result);
    })

    app.get('/task/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await taskCollection.findOne(query);
      res.send(result);
    })

    app.post('/task', verifyToken, async(req, res) =>{
      const item = req.body;
      const result = await taskCollection.insertOne(item);
      res.send(result);
    })

    app.patch('/task/:id', verifyToken, async(req, res) =>{
      const item = req.body;
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc ={
        $set: {
          title: item.title,
          deadline: item.deadline,
          priority: item.priority,
          description: item.description
        }
      }
      const result = await taskCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.delete('/task/:id', verifyToken, async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await taskCollection.deleteOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('server running')
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})