var PORT = process.env.PORT || 5000;
var express = require('express'),
    app = module.exports.app = express();

var http = require('http')
const webSocketServer = require('websocket').server;
var server = http.createServer(app);
var cors = require('cors')

 



const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jsonLogic = require('json-logic-js')
const jwt = require('jsonwebtoken')
const { parse } = require('path')
const ExcelJS = require('exceljs');
// const server = jsonServer.create()



var jsonParser = bodyParser.json()

// const requestHandler = (request, response) => {  
//   if(/* POST request */){
//     // use body-parser here..
//     jsonParser(request, response, (error) => {
//       // request.body is populated, if there was a json body
//     })
//   }
//   response.end('Hello Node.js Server!')
// }

app.use(cors())
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
// server.use(jsonServer.defaults());

const SECRET_KEY = '123456789'

const expiresIn = '1h'

// Create a token from a payload 
function createToken(payload){
  return jwt.sign(payload, SECRET_KEY, {expiresIn})
}

// Verify the token 
function verifyToken(token){
  return  jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ?  decode : err)
}

// Check if the user exists in database
function isAuthenticated({username, password}){
  fs.readFile("./db.json", (err, data) => { 
    var data = JSON.parse(data.toString())
   
    return data.user.findIndex(user => user.Username === username && user.Password === password) !== -1
  })
}

// Register New User
app.post('/auth/register', (req, res) => {
  console.log("register endpoint called; request body:");

  const {Username, Password} = req.body;

  if(isAuthenticated({Username, Password}) === true) {
    const status = 200;
    const message = 'Username and Password already exist';
    res.status(status).json({status, message});
    return
  }

fs.readFile("./db.json", (err, data) => {  
    if (err) {
      const status = 200
      const message = err
      res.status(status).json({status, message})
      return
    };

    // Get current users data
    var data = JSON.parse(data.toString());

    // Get the id of last user
    var last_item_id = data.user[data.user.length-1].row_id;

    //Add new user
    data.user.push({id: last_item_id + 1, Username: Username, Password: Password}); //add some data
    var writeData = fs.writeFile("./db.json", JSON.stringify(data), (err, result) => {  // WRITE
        if (err) {
          const status = 401
          const message = err
          res.status(status).json({status, message})
          return
        }
    });
});

// Create token for new user
  const access_token = createToken({Username, Password})

  res.status(200).json({access_token})
})

// Login to one of the users from ./users.json
app.post('/credential_service/login', (req, res) => {
  console.log("login endpoint called; request body:");


  const {username, password} = req.body;
  fs.readFile("./db.json", (err, data) => { 
    var data = JSON.parse(data.toString())
   
    let mencoba = data.user.findIndex(user => user.Username === username) !== -1;
    let mencoba1 = data.user.findIndex(user => user.Password === password) !== -1;
    if (mencoba == false && mencoba1 == false) {
      const status = 200
      const data = 'username and password wrong'
      res.status(status).json({status, data})
      return
    }
    else if (mencoba == false) {
      const status = 200
      const data = 'username wrong'
      res.status(status).json({status, data})
      return
    }
    else if(mencoba1 == false){
      const status = 200
      const data = 'password wrong'
      res.status(status).json({status, data})
      return
    }
    else{
      
      const access_token = createToken({username, password})
    
      res.status(200).json({"output_type": "json",
      "response_code": 200,
      "data": access_token})
  
    }
  })
 
  
})
app.post('/credential_service/get_user', (req, res) => {
    console.log("login endpoint called; request body:");
 
  
    let {info_data, key, per_page, page,row_id, ficos} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
        
        fs.readFile("./db.json", (err, data) => { 
            var data = JSON.parse(data.toString());
            if(info_data=="all"){
              var data1 = data.user; 
              for(const uu of data1){
                delete uu.Password;
               
                uu.Department = uu.Department?uu.Department["Department Name"]:'';
                uu.Group = uu.Group?uu.Group["Group Name"]:'';
                uu.Role = uu.Role?uu.Role.map(elem=>elem["Role Name"]):[];
                uu.Branch = uu.Group?uu.Branch.map(elem=>elem["Branch Name"]):[];
                delete uu["Access View"];
                delete uu["Access Create"];
                delete uu["Access Update"];
                delete uu["Access Delete"];
                delete uu["Expired Date"];
                delete uu["User Report"];
                delete uu["Periode Usage"];
                delete uu["Status"];
                delete uu["Block Reason"];
              }
              if(ficos!=''){
              
            
                data1 = data1.filter(hasil=>{if(jsonLogic.apply(ficos, hasil))return hasil}  )
             
            
                
              }
           
                res.status(200).json({
                    "response_code": 200,
                    "data": data1.slice(per_page*(page-1),per_page*page>data1.length?data1.length:per_page*page),
                    "field_filter_name": data1,
                    "count_data": data1.length,
                });  
                
              

            }else if(info_data=="detail"){
                var data1 = data.user.filter(x => x.row_id === row_id);
                res.status(200).json({
                  "response_code": 200,
                  "data": data1[0],
              });

            }
            
            
            return
        })
    }
    // if (isAuthenticated({Username, Password}) === false) {
    //   const status = 401
    //   const message = 'Incorrect email or password'
    //   res.status(status).json({status, message})
    //   return
    // }
    // const access_token = createToken({Username, Password})
    // console.log("Access Token:" + access_token);
    // res.status(200).json({"output_type": "json",
    // "response_code": 200,
    // "data": access_token})
  })
  app.post('/credential_service/update_user', (req, res) => {
    console.log("login endpoint called; request body:");
   
  
    const {info_data, key, per_page, page,row_id} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
        
        fs.readFile("./db.json", (err, data) => { 
          var data = JSON.parse(data.toString());
          var id = row_id;
          
          data.user[data.user.findIndex(x=>x.row_id==row_id)].Department = req.body.dept_id;
          data.user[data.user.findIndex(x=>x.row_id==row_id)].Group = req.body.group_id;
          data.user[data.user.findIndex(x=>x.row_id==row_id)].Branch = req.body.branch_id;
          data.user[data.user.findIndex(x=>x.row_id==row_id)].Role = req.body.role_id;
          data.user[data.user.findIndex(x=>x.row_id==row_id)].NIK = req.body.nik;
          data.user[data.user.findIndex(x=>x.row_id==row_id)].Nama = req.body.name;
          data.user[data.user.findIndex(x=>x.row_id==row_id)]["Access Create"] = req.body.access_create;
          data.user[data.user.findIndex(x=>x.row_id==row_id)]["Access View"] = req.body.access_view;
          data.user[data.user.findIndex(x=>x.row_id==row_id)]["Access Update"] = req.body.access_update;
          data.user[data.user.findIndex(x=>x.row_id==row_id)]["Access Delete"] = req.body.access_delete;
         


          
         
    //Add new user
    // data.user.push({id: last_item_id + 1, Username: Username, Password: Password}); //add some data
    fs.writeFile("./db.json", JSON.stringify(data), (err, result) => {  // WRITE
        if (err) {
          const status = 401
          const message = err
          res.status(status).json({status, message})
          return
        }else{
          res.status(200).json({
            "response_code": 200,
            "data":"berhasil mengubah"
        });
        }
    });
    
            

        })
            
    }
  
  })

  app.post('/credential_service/change_password', (req, res) => {
    console.log("login endpoint called; request body:");
   
  
    const {info_data, key, per_page, page,row_id, password} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
        
        fs.readFile("./db.json", (err, data) => { 
          var data = JSON.parse(data.toString());
          var id = row_id;
          
          data.user[data.user.findIndex(x=>x.row_id==row_id)].Password = password;
        

          
      
    //Add new user
    // data.user.push({id: last_item_id + 1, Username: Username, Password: Password}); //add some data
    fs.writeFile("./db.json", JSON.stringify(data), (err, result) => {  // WRITE
        if (err) {
          const status = 401
          const message = err
          res.status(status).json({status, message})
          return
        }else{
          res.status(200).json({
            "response_code": 200,
            "data":"berhasil change password"
        });
        }
    });
    
            

        })
            
    }
  
  })






  app.post('/credential_service/create_user', (req, res) => {
    console.log("login endpoint called; request body:");
   
  
    const {info_data, key, per_page, page,row_id} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
        
        fs.readFile("./db.json", (err, data) => { 
          var data = JSON.parse(data.toString());
          var last_item_id = data.user[data.user.length-1].row_id;
          
          // data.user[data.user.findIndex(x=>x.row_id==row_id)].Department = req.body.dept_id;
          // data.user[data.user.findIndex(x=>x.row_id==row_id)].Group = req.body.group_id;
          // data.user[data.user.findIndex(x=>x.row_id==row_id)].Branch = req.body.branch_id;
          // data.user[data.user.findIndex(x=>x.row_id==row_id)].NIK = req.body.nik;
          // data.user[data.user.findIndex(x=>x.row_id==row_id)].Nama = req.body.name;
          // data.user[data.user.findIndex(x=>x.row_id==row_id)]["Access Create"] = req.body.access_create;
          // data.user[data.user.findIndex(x=>x.row_id==row_id)]["Access View"] = req.body.access_view;
          // data.user[data.user.findIndex(x=>x.row_id==row_id)]["Access Update"] = req.body.access_update;
          // data.user[data.user.findIndex(x=>x.row_id==row_id)]["Access Delete"] = req.body.access_delete;
         


          
         
    data.user.push({
            row_id: last_item_id + 1, 
            Username:req.body.username,
            NIK:req.body.nik,
            Password:req.body.password,
            Nama:req.body.name,
            ["Periode Usage"]:req.body.periode_usage,
            Status:"active",
            ["Block Reason"]:"",
            ["User Report"]:"",
            ["Access View"]:req.body.access_view,
            ["Access Create"]:req.body.access_create,
            ["Access Update"]:req.body.access_Update,
            ["Access Delete"]:req.body.access_delete,
            ["Expired Date"]:req.body.expired_date,
            ["Department"]:req.body.dept_id,
            ["Group"]:req.body.group_id,
            ["Role"]:req.body.role_id,
            ["Branch"]:req.body.branch_id
    
    }); //add some data
    fs.writeFile("./db.json", JSON.stringify(data), (err, result) => {  // WRITE
        if (err) {
          const status = 401
          const message = err
          res.status(status).json({status, message})
          return
        }else{
          res.status(200).json({
            "response_code": 200,
            "data":"berhasil menambah"
        });
        }
    });
            

        })
            
    }
  
  })
  app.post('/credential_service/delete_user', (req, res) => {
    console.log("login endpoint called; request body:");
   
  
    const {info_data, key, per_page, page,row_id} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
        
        fs.readFile("./db.json", (err, data) => { 
          var data = JSON.parse(data.toString());
          data.user = data.user.filter((i) => !row_id.includes(i.row_id))
          
        fs.writeFile("./db.json", JSON.stringify(data), (err, result) => {  // WRITE
        if (err) {
          const status = 401
          const message = err
          res.status(status).json({status, message})
          return
        }else{
          res.status(200).json({
            "response_code": 200,
            "data":"berhasil menghapus"
        });
        return
        }
    });
            

        })
            
    }
  
  })



  app.post('/credential_service/download_excel', (req, res) => {
    console.log("login endpoint called; request body:");
   
  
    const {info_data, key, per_page, page,row_id} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
        
        fs.readFile("./db.json", (err, data) => { 
          var data = JSON.parse(data.toString());
          for(const uu of data.user){
            uu.Department = uu.Department?uu.Department["Department Name"]:"";
            uu.Group = uu.Group?uu.Group["Group Name"]:"";
            uu.Role = uu.Role?uu.Role.map(elem=>elem["Role Name"]).join(", "):''
            uu.Branch = uu.Group?uu.Branch.map(elem=>elem["Branch Name"]).join(", "):''
          }
          const dataUser =  data.user


          const workbook = new ExcelJS.Workbook(); //creating workbook
          const worksheet = workbook.addWorksheet('Data User'); //creating worksheet
  
          //  WorkSheet Header
          const kolom = [ 
              { header: 'Username', key: 'Username', width: 15 },
              { header: 'NIK', key: 'NIK', width: 15 },
              { header: 'Nama', key: 'Nama', width: 20},
             
              { header: 'Department', key: 'Department', width: 30},
              { header: 'Group', key: 'Group', width: 50},
              { header: 'Role', key: 'Role', width: 50},
              { header: 'Branch', key: 'Branch', width: 50},
              ]
              
          worksheet.columns = kolom
     
          worksheet.addRows(dataUser);
          worksheet.getRow(1).eachCell((cell)=>{
              cell.font = {bold:true}
              cell.alignment = {vertical: 'middle', horizontal: 'center'}
          })
    
          // const writefile = await workbook.xlsx.writeFile('src/credential/file/user.xlsx')
          // console.log('write file', writefile);
          
          workbook.xlsx.writeBuffer().then(file_excel=> 
            {
                 res.status(200).json({
                  "response_code": 200,
                  file_excel
                  
                });
            }
            
            )
          // console.log('write buffer', result);
          
         
         
       
                 

        })
            
    }
  
  })






  app.post('/credential_service/get_menu', (req, res) => {
    console.log("login endpoint called; request body:");

  
    const {info_data, key, row_perpage, page} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
        fs.readFile("./db.json", (err, data) => { 
            var data = JSON.parse(data.toString());
            res.status(200).json({
            "response_code": 200,
            "dataOrigin": data.menu,
            
        });
            
            return
        })
    }
    // if (isAuthenticated({Username, Password}) === false) {
    //   const status = 401
    //   const message = 'Incorrect email or password'
    //   res.status(status).json({status, message})
    //   return
    // }
    // const access_token = createToken({Username, Password})
    // console.log("Access Token:" + access_token);
    // res.status(200).json({"output_type": "json",
    // "response_code": 200,
    // "data": access_token})
  })



  app.post('/credential_service/get_group', (req, res) => {
    console.log("login endpoint called; request body:");
  
  
    const {info_data, key, per_page, page} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
        fs.readFile("./db.json", (err, data) => { 
            var data = JSON.parse(data.toString());
            res.status(200).json({
            "response_code": 200,
            "data": per_page?data.group.slice((parseInt(per_page)*(parseInt(page)-1)),parseInt(per_page)*parseInt(page)>data.group.length?data.group.length:parseInt(per_page)*parseInt(page)):data.group,
            "field_filter_name": data.group.slice((parseInt(per_page)*(parseInt(page)-1)),parseInt(per_page)*parseInt(page)>data.group.length?data.group.length:parseInt(per_page)*parseInt(page)),
            "count_data": data.group.length,
        });
            
            return
        })
    }
   
  })
  app.post('/credential_service/get_department', (req, res) => {
    console.log("login endpoint called; request body:");
  
  
    const {info_data, key, per_page, page} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
        fs.readFile("./db.json", (err, data) => { 
            var data = JSON.parse(data.toString());
            res.status(200).json({
            "response_code": 200,
            "data": per_page?data.department.slice((parseInt(per_page)*(parseInt(page)-1)),parseInt(per_page)*parseInt(page)>data.department.length?data.department.length:parseInt(per_page)*parseInt(page)):data.department,
            "field_filter_name": data.department.slice((parseInt(per_page)*(parseInt(page)-1)),parseInt(per_page)*parseInt(page)>data.department.length?data.department.length:parseInt(per_page)*parseInt(page)),
            "count_data": data.department.length,
        });
            
            return
        })
    }
  })

  app.post('/credential_service/get_role', (req, res) => {
 
  
    const {info_data, key, per_page, page} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
      console.log();
        fs.readFile("./db.json", (err, data) => { 
            var data = JSON.parse(data.toString());
            res.status(200).json({
            "response_code": 200,
            "data": per_page?data.role.slice((parseInt(per_page)*(parseInt(page)-1)),parseInt(per_page)*parseInt(page)>data.role.length?data.role.length:parseInt(per_page)*parseInt(page)):data.role,
            "field_filter_name": data.role.slice((parseInt(per_page)*(parseInt(page)-1)),parseInt(per_page)*parseInt(page)>data.role.length?data.role.length:parseInt(per_page)*parseInt(page)),
            "count_data": data.role.length,
        });
            
            return
        })
    }
  })
  app.post('/credential_service/get_branch', (req, res) => {
    console.log("login endpoint called; request body:");

  
    const {info_data, key, per_page, page} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
        fs.readFile("./db.json", (err, data) => { 
            var data = JSON.parse(data.toString());
            res.status(200).json({
            "response_code": 200,
            "data": per_page?data.branch.slice((parseInt(per_page)*(parseInt(page)-1)),parseInt(per_page)*parseInt(page)>data.branch.length?data.branch.length:parseInt(per_page)*parseInt(page)):data.branch,
            "field_filter_name": data.branch.slice((parseInt(per_page)*(parseInt(page)-1)),parseInt(per_page)*parseInt(page)>data.branch.length?data.branch.length:parseInt(per_page)*parseInt(page)),
            "count_data": data.branch.length,
        });
            
            return
        })
    }
  })
  app.post('/credential_service/get_log', (req, res) => {
    console.log("login endpoint called; request body:");

  
    const {info_data, key, per_page, page} = req.body;
    let verifyTokenResult;
    verifyTokenResult = verifyToken(key);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }else{
        fs.readFile("./db.json", (err, data) => { 
            var data = JSON.parse(data.toString());
            res.status(200).json({
            "response_code": 200,
            "data": data.log_action,
            "field_filter_name": data.log_action.slice((parseInt(per_page)*(parseInt(page)-1)),parseInt(per_page)),
            "count_data": data.log_action.length,
        });
            
            return
        })
    }
  })
 




// server.use(/^(?!\/auth).*$/,  (req, res, next) => {
//   if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
//     const status = 401
//     const message = 'Error in authorization format'
//     res.status(status).json({status, message})
//     return
//   }
//   try {
//     let verifyTokenResult;
//      verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);

//      if (verifyTokenResult instanceof Error) {
//        const status = 401
//        const message = 'Access token not provided'
//        res.status(status).json({status, message})
//        return
//      }
//      next()
//   } catch (err) {
//     const status = 401
//     const message = 'Error access_token is revoked'
//     res.status(status).json({status, message})
//   }
// })


// app.use(express.static('client'));
// var io = require('socket.io')(server);

server.listen(PORT, function() {
  console.log('Chat server running');
 
  // io.emit('messageSent', {
  //   data:"cuy"
  // })
    // io.on('connection', function(socket) {
    //   // console.log("User " + socket.id)
    // })
    //   socket.on('messageSent', function(msg) {
    //    console.log("hay")
    //     // socket.broadcast.emit('messageSent', msg);
       
    //   });
    // });
});


const wsServer = new webSocketServer({
  httpServer: server
});

const clients = {};

// This code generates unique userid for everyuser.
const getUniqueID = () => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4();
};

wsServer.on('request', function (request) {
  var userID = getUniqueID();
  // console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');

  // You can rewrite this part of the code to accept only the requests from allowed origin
  const connection = request.accept(null, request.origin);
  clients[userID] = connection;
  // console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients));

  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      // console.log('Received Message: ', message.utf8Data);

      // broadcasting message to all connected clients
      for(key in clients) {
        if(clients[userID]==clients[key]){
          console.log("hay")
        }else{
          clients[key].sendUTF(message.utf8Data);
          console.log('sent Message to: ', clients[key]);

        }
      }
    }
  })
});




