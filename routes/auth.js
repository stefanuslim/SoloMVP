const router = require('express').Router();
const User = require('../model/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {registerValidation, loginValidation} = require('./../model/Validation');

router.post('/register', async (req, res) => {
console.log("start")
//LETS VALIDATE THE DATA BEFORE WE ADD A User
const {error} = registerValidation(req.body);
if (error) return res.status(400).send(error.details[0].message);

//check log if the user is already in the database
const emailExist = await User.findOne({email: req.body.email});
if (emailExist) return res.status(400).send('Email already exists');

// hash the password
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(req.body.password, salt);


//Create a new user
   const user = new User({
    message: req.body.message,
       email: req.body.email,
       password: hashedPassword
   });
   try {
       const savedUser = await user.save();
       res.send(savedUser);
   } catch (err) {
       res.status(400).send(err);
   }
});

// delete user
router.delete("/delete", async (req, res) => {
  const email = req.params.email
  const user = await User.findOne({email: req.body.email});
  console.log(user);
  try {
    await User.deleteOne({"email": email})
    res.status(200).send("Deleted")
  } catch (error) {
    res.status(400).send(error)
  }
});

// get info
router.get("/user", async (req, res) => {
  try {
    const user = await User.findOne({email: req.body.email});
    console.log(user)
    res.status(200).send(user)
  } catch (error) {
    res.status(400).send(error)
  }
});

// update
router.patch("/patch", async (req, res) => {
  const user = await User.findOne({email: req.body.email});
  console.log(user)
  if(!user) {res.status(200).send("No user by that name.")}
  console.log("patches")
  try {
    const updateObject = req.body;
    const id = user.id;
    const updatedUser = await User.update({_id: id}, {$set: updateObject});
    res.status(200).send(updatedUser)
  } catch (error) {
    res.status(400).send(error)
  }
});

// login
router.post('/login', async (req, res) => {
  console.log("login")
    const {error} = loginValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const user = await User.findOne({email: req.body.email});
    if (!user) return res.status(400).send('Email or Password is Wrong')
    const validPass = await bcrypt.compare(req.body.password, user.password);
    if(!validPass) return res.status(400).send('Email or Password is Wrong');

    // create and assign a token
      const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET, {
        expiresIn: 86400,
      });
  
    res.status(200).json({ auth: true, token: token, user: user });
    // console.log(user.message)
    // res.send(user);
});

// fake route for testing the token
router.get('/me', function(req, res) {
  // console.log(req.headers)
  let token = req.headers["x-access-token"] || req.headers["authorization"]; // Express headers are auto converted to lowercase

  if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });

  if (token.startsWith("Bearer ")) {
    // Remove Bearer from string
    token = token.slice(7, token.length);
  } 

  jwt.verify(token, process.env.TOKEN_SECRET, async function(err, decoded) {
    if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
    console.log(decoded)
    await User.findById(decoded.userId, 
    { password: 0 }, // projection
    function (err, user) {
      if (err) return res.status(500).send("There was a problem finding the user.");
      if (!user) return res.status(404).send("No user found.");
        
      res.status(200).send(user); 
    });
  });
});

// forgot password
router.patch('/forgot', async function(req, res, next) {
  const user = await User.findOne({email: req.body.email});
  if(!user) {res.status(200).send("No user by that name.")}
  console.log("changing password")
  try {
    // hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    // replace the users password
    const updateObject = req.body;
    updateObject.password = hashedPassword;
    updateObject.message = 'Changed-Password';
    const id = user.id;
    const updatedUser = await User.update({_id: id}, {$set: updateObject});
    res.status(200).send(updatedUser)
  } catch (error) {
    res.status(400).send(error)
  }
});
module.exports = router;