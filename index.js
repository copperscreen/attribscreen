var process = require('./process.js');
//export 
exports.handler = async(event) => {
      const body = JSON.parse(event.body || '{}');
      if (body?.state){
        let {mime, encoded} = await process(body);
        const response = {
            statusCode: 200,
            body: JSON.stringify(encoded),
/*		headers: {
		        "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
		        "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
			'Access-Control-Allow-Methods': 'POST, PUT, GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With',
			Etag: "c561c68d0ba92bbeb8b0f612a9199f722e3a621a"
      		      }*/
        };
        return response;
    }else{
        return { statusCode: 400 };
    }
};

//module.exports.bmp2Attrib = handler;