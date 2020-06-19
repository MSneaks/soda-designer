/*
=-=-=-=-=-=-=-=-=-=-=-=-
Soda Designer
=-=-=-=-=-=-=-=-=-=-=-=-
Student ID:15277138
Comment (Required): Many of my comments will be in-line. I had trouble with loading the image 
into memory. I tried a variety of ways. I found somethig that worked when making the create_can
method. There may be leftovers from my mistakes. The cache is a simple array. I check if the file is
in the cache, if not I create it and add it and if it is I just serve the image. I also 
implemented a feature that checks the files in the tmp folder at the beginning of the program.
That way, cans can persist through server shutdowns. Sometimes if cans are requested too fast the 
server will crash. Generally I wait for about 3-5 seconds before requesting a new can.

=-=-=-=-=-=-=-=-=-=-=-=-
*/


const http = require("http");
const Jimp = require("jimp");
let cache = [];

const fs = require('fs');
//this line I use to check the folder with my cache.
var files = fs.readdirSync('./tmp/');
for(let i= 0; i<files.length;i++)
{
	files[i]='./tmp/' + files[i];
	cache.push(files[i]);
}

console.log(cache);


const can = {
	lid: {path: "assets/can/can-lid.png"},
	body: {path: "assets/can/can-body.png"},
	label: {path: "assets/can/can-label.png"}
};

const flavors = [
	{id: "apple", path: "assets/flavor/apple.png", x: 120, y: 265},
	{id: "banana", path: "assets/flavor/banana.png", x: 80, y: 285},
	{id: "cherry", path: "assets/flavor/cherry.png", x: 100, y: 250},
	{id: "coconut", path: "assets/flavor/coconut.png", x: 110, y: 270},
	{id: "crab", path: "assets/flavor/crab.png", x: 83, y: 305},
	{id: "grape", path: "assets/flavor/grape.png", x: 93, y: 268},
	{id: "mango", path: "assets/flavor/mango.png", x: 100, y: 295},
	{id: "orange", path: "assets/flavor/orange.png", x: 90, y: 265},
	{id: "watermelon", path: "assets/flavor/watermelon.png", x: 75, y: 280}
];


async function open_assets(){

	for(let property in can){
		
		
		const rs = await Jimp.read(can[property].path); 
		can[property].resource = rs;
	}
	let count = 3;
	for(let i= 0;i<flavors.length;i++)
	{
		const rs = await Jimp.read(flavors[i].path);
		flavors[i].resource = rs;
		count++;
		if (count ===3+flavors.length)
		{
			start_server(can,flavors);
		}
	}
	
	
}

function connection_handler(req, res){
	console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);
	
	if(req.url === "/")
	{
		const main = fs.createReadStream('html/form.html');
		res.writeHead(200,{'Content-Type':'text/html'});
		main.pipe(res);
	}
	else if (req.url === "/image-credits.txt")
	{
		const main = fs.createReadStream('assets/image-credits.txt');
		res.writeHead(200,{'Content-Type':'text/plain'});
		main.pipe(res);
	}
	else if (req.url.startsWith("/design"))
	{
		let user_input = (url.parse(req.url,true).path);
		//splitting the url to get the parameters
		let u_i = user_input.split('=')
		let flav = u_i[2]
		let color = (u_i[1].split("&")[0]);
		console.log(flav);
		color = color.substring(3);
		const rgbcolor = hexToRgb(color);
		//I had trouble with this so i just used a for loop to find to index
		//let i = flavors.findIndex(flavor => flavors.id === flav);
		//console.log(i);
		let p = -1;
		for(let k =0;k<flavors.length; k++)
		{
			if(flavors[k].id ===flav)
			{
				p = k;
			}
		}
		//return 404
		if(p === -1)
		{
			res.writeHead(404, {"Content-Type": "text/plain"});
			res.write("404 Not Found");
			res.end();
		}
		else
		{
			//changed i to my p. and color to my rgbcolor
			let filename = `./tmp/${flavors[p].id}-${rgbcolor.r}-${rgbcolor.g}-${rgbcolor.b}.png`;
			if(cache.includes(filename))
			{
				deliver_can(filename, res)
				console.log("serving cached version of" + filename);
			}
			else{
				console.log(filename);
			create_can(can, rgbcolor, flavors[p], filename, res);}
		}
	}
	else 
	{
		res.writeHead(404, {"Content-Type": "text/plain"});
		res.write("404 Not Found");
		res.end();
	}
	
	
}

async function create_can (can, color, flav, filename, res) {
	
	let new_can = can.body.resource.clone();
    let colored_can = new_can.color([
        {apply: "red", params: [color.r]},
        {apply: "green", params: [color.g]},
        {apply: "blue", params: [color.b]}
    ]);

	await can.lid.resource.blit(colored_can,0,0)
		.blit(can.label.resource,40,210)
		.blit(flav.resource,flav.x,flav.y)
		.write(filename);
		
	deliver_can(filename, res)

};
   
   
function deliver_can(filename, res)
{
	//add to cache
	if(cache.includes(filename) == false)
	{
		cache.push(filename);
	}
	
	let image_stream = fs.createReadStream(filename);

	image_stream.on('ready',function(){
		res.writeHead(200, {'Content-Type':'image/jpeg'});
		image_stream.pipe(res);
	});
	
}





function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return (
        result
        ? {r: parseInt(result[1], 16), 
           g: parseInt(result[2], 16), 
           b: parseInt(result[3], 16)}
        : {r: 255, g: 255, b: 255}
    );
};


const url = require('url');
const port = 3000;
function listening_handler(){
	console.log(`Now Listening on Port ${port}`);
}

function start_server(can,flavors)
{
	
	const server = http.createServer();
	server.on("request", connection_handler);
	server.on("listening", listening_handler);
	server.listen(port);

}

open_assets();
