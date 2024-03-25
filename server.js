const express = require('express');
require('dotenv').config()
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

//mongoose to connect to database uri in .env file MONGO_URI
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html');
});

//creating a Schema instance of the mongoose Schema so that we can create schemas for the database
var Schema = mongoose.Schema;

//creating new exerciseUsersSchema with data as username of type string, has to be unique and is required
var exerciseUsersSchema = new Schema({
	username: { type: String, unique: true, required: true }
});

//a model for exercises called ExcercisesUsers using the schema exerciseUsersSchema
// will be name 'ExerciseUsers' in the database and will utilize the schema exerciseUsersSchema
var ExerciseUsers = mongoose.model('ExerciseUsers', exerciseUsersSchema);

//creating new exercisesSchema with data to be used such as userId of type string,
//description of type string
//duration of type number and min value 1
// date of type Date default would be current date
var exercisesSchema = new Schema({
	userId: { type: String, required: true },
	description: { type: String, required: true },
	duration: { type: Number, min: 1, required: true },
	date: { type: Date, default: Date.now }
});

//creating new model called Exercises using the schema exercisesSchema
var Exercises = mongoose.model('Exercises', exercisesSchema);

//posting data
app.post('/api/users', function (req, res) {
  // if the requested body's username is empty then we will return json as error: username required
	if (req.body.username === '') {
		return res.json({ error: 'username is required' });
	}
  
  //variable username will contain requested body's username value
	let username = req.body.username;
  //new variable called _id to be empty
	let _id = '';

  //In the model ExerciseUsers we findOne entry with filter username or finding specific username data
	ExerciseUsers.findOne({ username: username }, function (err, data) {
    //if there is no error and data is null then a new user will be created using the model
		if (!err && data === null) {
			let newUser = new ExerciseUsers({
				username: username
			});

      //saving that user and checking for errors
			newUser.save(function (err, data) {
        //if no errors then _id value will be set to '_id' value of data found in that
				if (!err) {
					_id = data['_id'];

          //we response json with id and username
					return res.json({
						_id: _id,
						username: username
					});
				}
			});
		} else {
      //else we return json with error key and value as username already exists
			return res.json({ error: 'username already exists' });
		}
	});
});

//get method for api/users 
app.get('/api/users', function (req, res) {
  //finding data in the model using some data provided
	ExerciseUsers.find({}, function (err, data) {
    //if there is no error then response.json with data already present for that user
		if (!err) {
			return res.json(data);
		}
	});
});

//post method to provide data for the specific id and their exercise
app.post('/api/users/:_id/exercises', function (req, res) {
  //if the request body params.id is 0 then res.json with error that id is required
	if (req.params._id === '0') {
		return res.json({ error: '_id is required' });
	}
  //if request body description is null or empty then error with description is required
	if (req.body.description === '') {
		return res.json({ error: 'description is required' });
	}
  //if request body duration is empty or null then error duration is required
	if (req.body.duration === '') {
		return res.json({ error: 'duration is required' });
	}

  //else userId variable be the request params id
	let userId = req.params._id;
  //description be the request body description value
	let description = req.body.description;
  //duration be the request body duration value
	let duration = parseInt(req.body.duration);
  //and date be if request body date is not undefined then create new Date object from request body date 
  //else new Date() to create new date
	let date = (req.body.date !== undefined ? new Date(req.body.date) : new Date());


  //if duration is not a number we return response json with error duration is not a number
	if (isNaN(duration)) {
		return res.json({ error: 'duration is not a number' });
	}
  
  //if date is 'invalidDate' then return response json with error date is invalid
	if (date == 'Invalid Date') {
		return res.json({ error: 'date is invalid' });
	}

  //model.findById to find the data related to userID
	ExerciseUsers.findById(userId, function (err, data) {
    //if there is no error and data is not null then 
    //create new variable with new model instance containing the userid:userid
    //description:description, duration:duration,date:date
		if (!err && data !== null) {
			let newExercise = new Exercises({
				userId: userId,
				description: description,
				duration: duration,
				date: date
			});

      //save them to databse use save
			newExercise.save(function (err2, data2) {
        //if no error then response json with id containing data[id]
        //user name as data[username] description as data[description]
        //date as new date value for data[date] toDateString() conversion
				if (!err2) {
					return res.json({
						_id: data['_id'],
						username: data['username'],
						description: data2['description'],
						duration: data2['duration'],
						date: new Date(data2['date']).toDateString()
					});
				}
			});
		}
    //else response json with error that user not found 
    else {
			return res.json({ error: 'user not found' });
		}
	});
});

//if method get is used for 'api/users/:id/exercise' we redirect to the users id logs using request params id
app.get('/api/users/:_id/exercises', function (req, res) {
	res.redirect('/api/users/' + req.params._id + '/logs');
});

//method get for logs path of the id
app.get('/api/users/:_id/logs', function (req, res) {
  //letting userId be the request parameters id
	let userId = req.params._id;
  //variable containing data key as userId and value as string userId
	let findConditions = { userId: userId };

  //if the requested query from is not undefined and also is not empty or requested query to is not undefined and is not empty
	if (
		(req.query.from !== undefined && req.query.from !== '')
		||
		(req.query.to !== undefined && req.query.to !== '')
	) {
		findConditions.date = {};

		if (req.query.from !== undefined && req.query.from !== '') {
			findConditions.date.$gte = new Date(req.query.from);
		}

		if (findConditions.date.$gte == 'Invalid Date') {
			return res.json({ error: 'from date is invalid' });
		}

		if (req.query.to !== undefined && req.query.to !== '') {
			findConditions.date.$lte = new Date(req.query.to);
		}

		if (findConditions.date.$lte == 'Invalid Date') {
			return res.json({ error: 'to date is invalid' });
		}
	}

	let limit = (req.query.limit !== undefined ? parseInt(req.query.limit) : 0);

	if (isNaN(limit)) {
		return res.json({ error: 'limit is not a number' });
	}

	ExerciseUsers.findById(userId, function (err, data) {
		if (!err && data !== null) {
			Exercises.find(findConditions).sort({ date: 'asc' }).limit(limit).exec(function (err2, data2) {
				if (!err2) {
					return res.json({
						_id: data['_id'],
						username: data['username'],
						log: data2.map(function (e) {
							return {
								description: e.description,
								duration: e.duration,
								date: new Date(e.date).toDateString()
							};
						}),
						count: data2.length
					});
				}
			});
		} else {
			return res.json({ error: 'user not found' });
		}
	});
});

// Not found middleware
app.use((req, res, next) => {
	return next({ status: 404, message: 'not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
	let errCode, errMessage;

	if (err.errors) {
		// mongoose validation error
		errCode = 400; // bad request
		const keys = Object.keys(err.errors);
		// report the first validation error
		errMessage = err.errors[keys[0]].message;
	} else {
		// generic or custom error
		errCode = err.status || 500;
		errMessage = err.message || 'Internal Server Error';
	}

	res.status(errCode).type('txt')
		.send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});