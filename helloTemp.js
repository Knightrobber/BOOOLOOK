const webcamVideo = document.getElementById("webcam-video");

const inputCanvas = document.getElementById("input-canvas");
inputCanvas.width = 640;
inputCanvas.height = 480;

const overlayCanvas = document.getElementById("overlay-canvas");
overlayCanvas.width = 640;
overlayCanvas.height = 480;

const inputCanvasCtx = inputCanvas.getContext("2d");
const overlayCanvasCtx = overlayCanvas.getContext("2d");

const donnyBaseball = document.getElementById("donny-baseball");

var ID;var count=0;var start,end;
start = new Date();
start = start.getTime();
var outerPoints = [[49, 59], [50, 58], [51, 57], [52, 56], [53, 55]];
var innerPoints = [[61, 67], [62, 66], [63, 65]];
var calibrateState =0,calibrateCount=0;
var outerAvg = 0, innerAvg = 0;
var outer = [];
var look = [0,16,37,46,30]
var lookUD = [27,30,21]
function mainLoop() {
	++count;
	var distOuter = 0;var distInner = 0;
	inputCanvasCtx.drawImage(webcamVideo, 0, 0, 640, 480);

	const inputImgData = inputCanvasCtx.getImageData(0, 0, 640, 480);
	const inputBufImg = Module._malloc(inputImgData.data.length);
	
	Module.HEAP8.set(inputImgData.data, inputBufImg);

	const ptr = Module.ccall("detect", "number", "number", [inputBufImg]) / Uint16Array.BYTES_PER_ELEMENT;
	
	// Marshal the landmark data referenced by the pointer into a js array
	const len = Module.HEAPU16[ptr];
	const landmarks = [];
	for (let i = 1; i < len; i += 2) {
		const l = [Module.HEAPU16[ptr + i], Module.HEAPU16[ptr + i + 1]];
		landmarks.push(l);
	}
	/*if(calibrateState == 1)
	calibrate(landmarks)

	if(calibrateCount>=60){
		calibrateState =0;
		for(i=0;i<outerPoints.length;++i){
			point1 = outerPoints[i][0]
			point2 = outerPoints[i][1]
			distOuter = distOuter + (landmarks[point2][1]-landmarks[point1][1])
		}
		for(i=0;i<innerPoints.length;++i){
			point1 = innerPoints[i][0]
			point2 = innerPoints[i][1]
			distInner = distInner + (landmarks[point2][1]-landmarks[point1][1])
		}

		outerRatio = distOuter/outerAvg;
		outer.push(outerRatio);
		innerRatio = distInner/innerAvg;

		console.log("outer ratio = " + outerRatio);
		if(outerRatio>1.20)
		;
		//console.log("open");
		//console.log("Inner ratio = " + innerRatio);
	}*/

	findFacePos(landmarks);
	
	
	overlayCanvasCtx.clearRect(0, 0, 640, 480);

	// Visually enumerate each landmark we're currently tracking
	overlayCanvasCtx.fillStyle = "rgb(130, 255, 50)";
	overlayCanvasCtx.font = "6px Arial";

	for (let i = 1; i < landmarks.length; i += 1) {
		//overlayCanvasCtx.fillText(i, landmarks[i][0], landmarks[i][1]);
		overlayCanvasCtx.beginPath();
		overlayCanvasCtx.arc(landmarks[i][0], landmarks[i][1], 3, 0, 2 * Math.PI);
		overlayCanvasCtx.fillStyle="green"
		overlayCanvasCtx.fill();
		overlayCanvasCtx.stroke();
	}

	
	Module._free(ptr);
	Module._free(inputBufImg);
	if(count==240){
		cancelAnimationFrame(ID)
		avg=0;
		for(i=0;i<outer.length;++i)
		avg+= outer[i];
		avg = avg/outer.length
		console.log("avg ratio = " + avg)
		end = new Date().getTime();
		fps = 240/((end-start)/1000)
		console.log(fps)
	}
	else
	ID = requestAnimationFrame(mainLoop);
}

window.onload = () => {
	navigator.mediaDevices.getUserMedia({video: true}).then(stream => {
		webcamVideo.srcObject = stream;
		webcamVideo.style.display = "none";
	}).catch(err => {
		alert("F");
	});


	console.log("Detecting in 2 seconds...");

	setTimeout(() => {
		const req = new XMLHttpRequest();
		req.open("GET", "/shape_predictor_68_face_landmarks.dat", true);
		req.responseType = "arraybuffer";

		req.onload = (e) => {
			const payload = req.response;

			if (payload) {
				const model = new Uint8Array(payload);
					
				const inputBufModel = Module._malloc(model.length);
				Module.HEAPU8.set(model, inputBufModel);
				Module.ccall("init_shape_predictor", null, ["number", "number"], [inputBufModel, model.length]); // This pointer gets freed on the C++ side
				console.log("called predictor")
				// inputCanvasCtx.drawImage(donnyBaseball, 0, 0, 640, 480);
				
				requestAnimationFrame(mainLoop);
			}
		}

		req.send(null);
	}, 2000);
}

setCalibrateState = () =>{
	calibrateState =1;
}

calibrate = (landmarks) =>{
	statusT = document.getElementById("status");
	statusT.value = "Calibration started"
	++calibrateCount;
	for(i=0;i<outerPoints.length;++i){
		point1 = outerPoints[i][0]
		point2 = outerPoints[i][1]
		outerAvg = outerAvg + (landmarks[point2][1]-landmarks[point1][1])
	}
	for(i=0;i<innerPoints.length;++i){
		point1 = innerPoints[i][0]
		point2 = innerPoints[i][1]
		innerAvg = innerAvg + (landmarks[point2][1]-landmarks[point1][1])
	}

	if(calibrateCount==60){
		outerAvg = outerAvg/60;
		innerAvg = innerAvg/60;
		statusT.value = "Calibration Done";
		calibrateState=0;
	}
}

findFacePos = (landmarks) =>{
	points = [];
	pointsUD = [];
	for(i=0;i<look.length;++i)
	points.push([landmarks[look[i]][0],landmarks[look[i]][1]]);
	for(i=0;i<lookUD.length;++i)
	pointsUD.push([landmarks[lookUD[i]][0],landmarks[lookUD[i]][1]]);

	dist1 = findDist(points[0],points[4])
	dist2 = findDist(points[1],points[4])
	lookLeft1 = dist1/dist2;
	lookRight1 = dist2/dist1;
	//console.log("Look left high "+lookLeft1)
	//console.log("Look right high " + lookRight1);
	if(lookLeft1>1.92) // don't increase beyond 1
	console.log("Looking left\n")
	if(lookRight1>1.8)// don't decrease beyond 1.5
	console.log("Looking Right\n")

	distUD1 = findYDist(pointsUD[0],pointsUD[2])
	distUD2 = findYDist(pointsUD[1],pointsUD[2])
	distUD = distUD2/distUD1;
	//console.log(distUD);

	if(distUD>=2.5 && distUD<=3.1)
	;//console.log("lookin straight");
	if(distUD>3.5)
	console.log("lookin down")
	if(distUD<2.5)
	console.log("looking up")

}

findDist = (point1,point2) =>{
	return Math.sqrt(Math.pow(point1[0]-point2[0],2) + Math.pow(point1[1] - point2[1],2));
}

findYDist = (point1,point2) =>{
	dist = point1[1] - point2[1]
	if(dist<0)
	return 1;
	else
	return dist;

}