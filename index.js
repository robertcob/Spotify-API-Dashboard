// just specifying what we want from each of the libraries we have imported...
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

// will need to figure out a way to anonymously pass these values...

var client_id = '********************************'; // Your client id
var client_secret = '***************************'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

// simple func that generates a random string.
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  var stateKey = 'spotify_auth_state';


  // starting up the express framework...
  var app = express();


  // here we are serving a static files to the directory public (static files will be things like images and external css files)
  app.use(express.static(__dirname + '/public'))
  // cors is complicated its all  about accessing exterior files u can rea up on it
   .use(cors())
   // same here, a google search on this should sort u out
   .use(cookieParser());

// our application requests authorization
   app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);
  
    // our scope will be different as we will be requesting different user data...
    var scope = 'user-read-private user-read-email';
    
    //redirects to spotify auth with the mandatory field values given for the req (all concatted to url)
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
      }));
  });

  // when out app requests a refresh and access token renewal
  //will explain further...
  app.get('/callback', function(req, res) {

  // similar to 
  // if req.query.code{
  //   var code = req.query.code
  // } 
  // else{
  //   var code = null
  //  }

    var code = req.query.code || null;
    var state = req.query.state || null;
    // if req.cookies is not null, get statekey or else set it to null
    var storedState = req.cookies ? req.cookies[stateKey] : null;
  
    // if state variable wrong
    if (state === null || state !== storedState) {
      // do an error redirect...
      res.redirect('/#' +
        querystring.stringify({
          error: 'state_mismatch'
        }));
    } else {
      // deletes cookie
      res.clearCookie(stateKey);

      // these is the details needed for the post request, when we receive the code (found above)
      // we will use a post request of authOptions to obtain access token
      var authOptions = {
        // necessary params...
        url: 'https://accounts.spotify.com/api/token',
        form: {
          code: code,
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code'
        },
        headers: {
          'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        json: true
      };
      // relevant post request, with code error handling
      request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          // so if we get 200 back we have obtained our tokens!!!
          var access_token = body.access_token,
              refresh_token = body.refresh_token;
  
          // params for accessing spotify api
          var options = {
            url: 'https://api.spotify.com/v1/me',
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
          };
  
          // use the access token to access the Spotify Web API
          request.get(options, function(error, response, body) {
            console.log(body);
          });
  
          // we can also pass the token to the browser to make requests from there
          // used for more complex requests
          res.redirect('/#' +
            querystring.stringify({
              access_token: access_token,
              refresh_token: refresh_token
            }));
        } else {
          // redirect if token invalid....
          res.redirect('/#' +
            querystring.stringify({
              error: 'invalid_token'
            }));
        }
      });
    }
  });

  // obtaining refresh token...
  app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
      // info for reaccessing access token with refresh token
      url: 'https://accounts.spotify.com/api/token',
      headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
      form: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      },
      json: true
    };
  
    // post rquest to reaccess access token..
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token;
        res.send({
          'access_token': access_token
        });
      }
    });
  });
  
  console.log('Listening on 8888');
  app.listen(8888);
  
