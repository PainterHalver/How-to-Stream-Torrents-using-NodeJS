const app = require("./app");
const os = require("os");
const http = require("http");
const cluster = require("cluster");

const port = process.env.PORT || 8888;

//
//	  Create, meaning spawn multiple instances of the same app to take
//		advantage of multi-core processors.
//
//		IF 		the cluster is the master one, then this is the cluster
//				that ins control. This means that the master will spawn
//				children processes, while also listening for crashes.
//
//				If a process exits, then we span a new process in it place
//				so we can make sure that we constantly have X amount of
//				processes.
//
//		ELSE 	The spawned processes on the other hand are those that creates
//				servers and do the heavy lifting.
//
// if (cluster.isPrimary) {
//   //	1.	Count the machine's CPUs.
//   let cpuCount = os.cpus().length;

//   //	2.	Assign the port to the app.
//   app.set("port", port);

//   //	3.	Create a worker for each CPU core.
//   while (cpuCount--) {
//     cluster.fork();
//   }

//   //	4.	Listen for when the process exits because of a crash, and spawn a new process in it place.
//   cluster.on("exit", function (worker) {
//     //	If a worker dies, lets create a new one to replace him
//     cluster.fork();
//     console.log("Worker %d died :(", worker.id);
//   });
// } else {
//   http
//     .createServer((req, res) => {
//       res.writeHead(200);
//       res.end("hello world\n");
//     })
//     .listen(8000);

//   console.log(`Worker ${process.pid} started`);
// }

app.listen(port, () => {
  console.log(`Server ${process.pid} is running on port ${port}`);
});
