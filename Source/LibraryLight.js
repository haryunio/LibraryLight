process.on("uncaughtException", function(error) {
		console.error("A FATAL UNCAUGHT ERROR HAS OCCURRED!", error);
	});

/************************************************************************************************************************/

function socketManager()
{
	this.sockets = [];
	this.currentSocketID = 0;
}
socketManager.prototype = {
		addSocket: function addSocket(socket) {
				var that = this;

				const socketID = this.currentSocketID++;
				this.sockets[socketID] = socket; // Add a newly connected socket.
				socket.once("close", function unsubscribeTheSocket() {
						delete that.sockets[socketID];
					});
			},
		destroyAllTheSocket: function destroyAll() {
				this.sockets.forEach(function(socket) {
						socket.destory();
					});
			}
	};
var socketManager_HTTP = new socketManager, socketManager_HTTPS = new socketManager;

const cleanUpTheServer = function cleanUpTheServer() {
		console.info("Closing gracefully. Wait a while please.");

		var cleanUpPromise_HTTP = global.httpServer ? new Promise(function(resolve, reject) {
						console.info("Trying closing HTTP server.");
						global.httpServer.close(resolve);
						socketManager_HTTP.destroyAllTheSocket();
					}) : true;
		var cleanUpPromise_HTTPS = global.httpsServer ? new Promise(function(resolve, reject) {
						console.info("Trying closing HTTPS server.");
						global.httpsServer.close(resolve);
						socketManager_HTTPS.destroyAllTheSocket();
					}) : true;
		Promise.all([cleanUpPromise_HTTP, cleanUpPromise_HTTPS]).then(function() {
				if(global.db)
				{
					console.info("Trying closing the connection to the MongoDB server.");
					global.db.close(true); // Force closing the connection
				}
				console.info("The process is to be terminated.");
				process.exit();
			});
	};
const exitRequest = (function closure() {
		exitRequestCount = 0;
		return function exitRequest() {
				if(++exitRequestCount >= 3)
				{
					console.info("Force closing the process.");
					process.exit();
				}
				else
					cleanUpTheServer();
			};
	})();
process.on("SIGINT", exitRequest);
process.on("SIGTERM", exitRequest);

// If the connections alive too many, this application will not work without any information message.
/************************************************************************************************************************/

//http://blog.saltfactory.net/node/implements-nodejs-based-https-server.html
//http://zetawiki.com/wiki/%EC%9C%88%EB%8F%84%EC%9A%B0_openssl_%EC%84%A4%EC%B9%98
//http://stackoverflow.com/questions/14459078/unable-to-load-config-info-from-usr-local-ssl-openssl-cnf

global.debugging = true;
global.domain = "localhost";
global.base64Encode = function btoa(binary) {
		return new Buffer(binary).toString("base64");
	};
global.base64Decode = function atob(base64String) {
		return new Buffer(base64String, "base64").toString();
	};

const M_MongoDB = require("mongodb");
const M_expressSession = require("express-session");
const M_connectMongo = require("connect-mongo");
const M_HTTP = require("http");
const M_HTTPS = require("https");
const M_express = require("express");
const M_bodyParser = require("body-parser");
const M_cookieParser = require("cookie-parser");
const M_FS = require("fs");
const M_path = require("path");
const M_expressForceSSL = require("express-force-ssl");

const MongoStore = M_connectMongo(M_expressSession);
var app = M_express();
app.use(M_cookieParser());
app.use(M_bodyParser.urlencoded({limit: "10kb", extended: false}));
app.use(M_expressForceSSL);
app.set("forceSSLOptions", {enable301Redirects: true, trustXFPHeader: false, httpsPort: 443, sslRequiredMessage: "SSL required."});

(new Promise(function(resolve, reject) {
		M_MongoDB.MongoClient.connect("mongodb://localhost:27017/LibraryLight", function(error, db) {
				if(error)
				{
					console.error("Unable to connect to the MongoDB server. This Node.js process will be exited.\nThe error is:", error);

					reject(process.exit(1));
				}
				else
				{
					global.db = db;
					console.log("MongoDB: connection established to mongodb://localhost:27017/LibraryLight.");

					db.on("close", () => console.info("A socket closed against a single server or mongos proxy."));
					db.on("error", () => console.info("An error occurred against a single server or mongos proxy."));
					db.on("reconnect", () => console.info("The driver has reconnected and re-authenticated."));
					db.on("timeout", () => console.info("A socket timeout occurred against a single server or mongos proxy."));
					// http://mongodb.github.io/node-mongodb-native/2.0/api/Db.html#event:close

					resolve(db);
				}
			});
	})).then(function(_MongoDBInstance) {
		app.use(M_expressSession({
				cookie: {secure: true, maxAge: 100 * 60 * 1000/* 세션 유지 시간(milisecond 단위; 재요청 시, 새로 갱신됨.) */},
				//name: "LibraryLightSession",
				proxy: false,
				resave: true,
				rolling: true,
				saveUninitialized: true,
				secret: "LibraryLight secret!",
				store: new MongoStore({db: _MongoDBInstance, ttl: 100 * 60})
			}));

		(require(M_path.resolve(__dirname, "modules/global")))();
		app.use("/API", require(M_path.resolve(__dirname, "routers/general")));
		app.use("/API", require(M_path.resolve(__dirname, "routers/bookcase")));
		app.use("/API/user", require(M_path.resolve(__dirname, "routers/user")));
		app.use("/API/admin(istrator)", require(M_path.resolve(__dirname, "routers/administrator")));

		app.get("/", function(request, response) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.end("Hello world, is it secure? " + request.secure);
			});

		app.get("/test", function (request, response) {
				response.writeHead(200, {"Content-Type": "text/html"});
				console.log(request.session);
				response.end("end" + request.session);
			});

		try
		{
			var privateKey = M_FS.readFileSync(M_path.resolve(__dirname, "privateKey.pem"));
			var certificate = M_FS.readFileSync(M_path.resolve(__dirname, "certificate.pem"));
		}
		catch(error)
		{
			console.error(error.message);
			return exitRequest();
		}
		(global.httpsServer = M_HTTPS.createServer({key: privateKey, cert: certificate}, app)
			.listen(443, function() {
				console.info("The HTTPS server is listening on port 443.");
			})).on("error", function(error) {
				console.error(error);
			});
	});

(global.httpServer = M_HTTP.createServer(app).listen(80, function() {
		console.info("The HTTP server is listening on port 80.");
	})).on("error", function(error) {
		console.error(error);
	}); // In order to make this process keep work.