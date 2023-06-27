var process = require('./process.js');
exports.handler = async(event) => {
      const body = JSON.parse(event.body || '{}');
      if (body?.state){
        let {mime, encoded} = await process(body);
        const response = {
            statusCode: 200,
            body: JSON.stringify(encoded),
        };
        return response;
    }else{
        return { statusCode: 400 };
    }
};

