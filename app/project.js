//require all the packages necessary.
var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');

//for encryption of password.
var bcrypt = require('bcrypt');
const saltRounds = 10;

//session management to make sure that only one user is logged in.
var app = express();
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

//parse the text obtained.
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

//creating the connection with sql.
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'WorkIndia'
});

//todo class to perform our functions.
const todo = function(todoitem){
	this.agent_id = todoitem.agent_id;
	this.title=todoitem.title;
	this.description=todoitem.description;
	this.category=todoitem.category;
	this.date=todoitem.date;
};


//getting all the details for the particular agent.
todo.findById = (username,result)=>{
    connection.query(`Select * from todoagent where agent_id=${username} order by date`,(err,res)=>{
        if(err){
            console.log("error:",err);
            result(err,null);
            return ;
        }
        console.log('agent data:',res);
        result(null,res);
    });
};


//creating a new todo for an agent.
todo.create = (newtodo, result) => {
    connection.query(`INSERT INTO todoagent SET ?`, newtodo, (err, res) => {
      if (err) {
        console.log("error: ", err);
        result(err, null);
        return;
      }
  
      console.log("created agent: ", { id: res.insertId, ...newtodo });
      result(null, { id: res.insertId, ...newtodo });
    });
  };



//-----------------------------------------------------Routes----------------------------------------------------------


//post request to register an agent.
app.post('/app/agent',async function(req,res){
	if (req.session.loggedin) {
		response.send({loggedin: "Already logged in. Kill session to register"});
		}
	else{
		const username = req.body.agent_id;
		const password = req.body.password;
		const encryptedPassword = await bcrypt.hash(password, saltRounds);
		var users={
			"agent_id":username,
			"password":encryptedPassword
		}
		connection.query('INSERT INTO users SET ?',users, function (error, results, fields) {
			if (error) {
			  res.send({
				"code":400,
				"failed":"error ocurred user already present",
				"error":error
			  })
			} else {
			  res.send({
				"code":200,
				"success":"user registered sucessfully"
				  });
			  }
		  });
	}
});




//post request to authenticate an agent.
app.post('/app/auth', async function(req, res) {
	var agent_id= req.body.agent_id;
  	var password = req.body.password;
	connection.query('SELECT * FROM users WHERE agent_id = ?',[agent_id], async function (error, results, fields) {
		if (error) {
		res.send({
			"code":400,
			"failed":"error ocurred"
		})
		}else{
		if(results.length >0){
			const comparison = await bcrypt.compare(password, results[0].password)
			console.log(password,results[0].password,comparison);
			if(comparison){
				req.session.loggedin = true;
				req.session.username = agent_id;
				res.send({
				"status":"success",
				"code":200,
				"agent-id":agent_id
				})
			}
			else{
			res.send({
				"code":401,
				"success":"agent_id and password does not match"
			})
			}
		}
		else{
			res.send({
			"code":401,
			"success":"agent_id does not exits"
				});
		}
		}
		});
});


//get request to get all the todos of the logged in agent.
app.get('/app/sites/list', function(req, res) {
	if (req.session.loggedin) {
		todo.findById(req.session.username,(err,data)=>{
			if(err){
				if(err.kind==='not_found'){
					res.status(404).send({
						message:'No agent with given id '+req.params.id
					});
				}
				else{
					res.status(500).send({
						message: "Error retrieving agent with id " + req.params.id
					});
				}
	
			}
			else
				res.send(data);
		});
	}
	else{
		res.send({notLoggedIn:'Please login to view this page!'});
	}
});



//post request to enter a new todo.

app.post('/app/sites',function(req,res){
	if (req.session.loggedin){
		if (!req.body) {
			res.status(400).send({
			  message: "Content can not be empty!"
			});
		  }
		
		  // Create a todo
		  const todoitem = new todo({
			agent_id: req.session.username,
			title: req.body.title,
			description: req.body.description,
			category: req.body.category,
			date: req.body.date
		  });
		
		  // Save todo in the database
		  todo.create(todoitem,  (err, data) => {
			if (err)
			  res.status(500).send({
				message: err.message
			  });
			else res.send(data);
		  });
	}
});


//logout before logging in and viewing next user. Logout Route.
app.get('/app/logout', function(req, res, next) {
	if (req.session) {
	  // delete session object
	  req.session.destroy(function(err) {
		if(err) {
		  return next(err);
		} else {
		  return res.send({loggedin:"false"});
		}
	  });
	}
  });


//starting the server.
app.listen(3000,function(err,res){
	console.log("server started!");
});