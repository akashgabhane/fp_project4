const validUrl = require('valid-url')
const shortid = require('shortid')

const urlModel = require("../model/urlModel")

const redis = require("redis");
const { promisify } = require("util");
const { json } = require('express/lib/response');

//---------------------------------------------< Connect to redis >-----------------------------------------------------------

const redisClient = redis.createClient(
    19631,
    "redis-19631.c264.ap-south-1-1.ec2.cloud.redislabs.com", { no_ready_check: true }
);
redisClient.auth("WGqnMu6b0QSWECZAEY3B8EFshoc6MSJI", function(err) {
    if (err) throw err;
});

redisClient.on("connect", async function() {
    console.log("Connected to Redis..");
});

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

//---------------------------------------------< Url Shortner >-----------------------------------------------------------

const urlShortner = async function(req, res) {
    try {
        const requestBody = req.body;

        if (Object.keys(requestBody).length === 0) {
            return res.status(400).send({ status: false, message: "No data provided" });
        }

        if (Object.keys(requestBody).length > 1) {
            return res.status(400).send({ status: false, message: "Please Enter the longUrl Only" });
        }

        const longUrl = requestBody.longUrl;
        const baseUrl = "http://localhost:3000"

        if (!longUrl) {
            return res.status(400).send({ status: false, message: 'Please Enter the longUrl' })
        }
        if (!validUrl.isUri(longUrl)) {
            return res.status(400).send({ status: false, message: 'Invalid longUrl' })
        }

        //Before creating the short URL,we check if the long URL was in the Cach ,else we create it.
        let urlAlreadyInCache = await GET_ASYNC(`${longUrl}`)
        console.log(urlAlreadyInCache)
        if (urlAlreadyInCache) {
            return res.status(200).send({ status: true, message: 'Url Short Successfully', data: JSON.parse(urlAlreadyInCache) })
        }
        //Before creating the short URL,we check if the long URL was in the DB ,else we create it.
        const urlAlreadyInDb = await urlModel.findOne({ longUrl }).select({ shortUrl: 1, longUrl: 1, urlCode: 1, _id: 0 });

        if (urlAlreadyInDb) {
            return res.status(200).send({ status: true, message: 'Url Shorten Successfully', data: urlAlreadyInDb })
        } else {
            const urlCode = shortid.generate().toLowerCase();
            const shortUrl = baseUrl + '/' + urlCode;

            const newUrl = {
                longUrl: longUrl.trim(),
                shortUrl: shortUrl,
                urlCode: urlCode
            }

            const urlCreated = await urlModel.create(newUrl);

            await SET_ASYNC(`${longUrl}`, JSON.stringify(newUrl), "EX", 90);
            console.log("yes")
            await SET_ASYNC(`${urlCode}`, JSON.stringify(newUrl.longUrl), "EX", 90);

            return res.status(201).send({ status: true, message: 'Url Shorten Successfully', data: urlCreated })
        }
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }
}

//-------------------------------------------------< Get Url >---------------------------------------------------------------

const urlRedirect = async function(req, res) {
    try {
        let urlCode = req.params.urlCode

        let cahcedUrlCode = await GET_ASYNC(urlCode)
        if (cahcedUrlCode) {
            return res.status(302).redirect(cahcedUrlCode)
        } else {

            let findUrl = await urlModel.findOne({ urlCode: urlCode })
            if (!findUrl) {
                return res.status(404).send({ status: false, message: "Url Code not found" })
            }

            await SET_ASYNC(urlCode, findUrl.longUrl)
            return res.status(302).redirect(findUrl.longUrl)
        }
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }
}


module.exports = { urlShortner, urlRedirect };
// const urlModel = require("../model/urlModel");
// const shortid = require('shortid');
// const validUrl = require('valid-url');
// const redis = require('redis');

// const { promisify } = require('util')




// // connect to redis
// const redisClient = redis.createClient(16740, "redis-16740.c212.ap-south-1-1.ec2.cloud.redislabs.com", { no_ready_check: true });
// redisClient.auth("rC9PI5UqJ4YhBuIiz5TLAb3xriyNd5ny", function(err) {
//     if (err) throw err;
// });
// ""
// redisClient.on("connect", async function() {
//     console.log("Connected to Redis..")
// });

// const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
// const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);





// // const isValid= function(value){
// //     if(typeof (value)==='undefined' || typeof (value)==='null') return false
// //     if(typeof (value) === 'string' && value.trim().length > 0) return false
// //     return true
// // }

// const baseUrl = 'http://localhost:3000/'

// const shortUrl = async function(req, res) {
//     try {
//         let { longUrl } = req.body
//             // console.log(longUrl)
//             // const longUrl =longUrl.toLowerCase()
//         if (Object.keys({ longUrl }).length == 0) {
//             return res.status(400).send({ status: false, msg: 'Please fill data' })
//         }
//         if (!validUrl.isUri(longUrl)) {
//             return res.status(400).send({ status: false, msg: 'Invalid long URL' })
//         }
//         if (!validUrl.isUri(baseUrl)) {
//             return res.status(400).send({ status: false, msg: 'The base URL is invalid' })
//         }
//         // db call
//         let islongUrl = await urlModel.findOne({ longUrl }).select({ _id: 0, longUrl: 1, shortUrl: 1, urlCode: 1 })
//         if (islongUrl) {
//             return res.status(400).send({ status: false, message: "already exist" })
//         }
//         // Generate :urlCode
//         const urlCode = shortid.generate(longUrl)
//             // check: if urlCode is already exist in DB
//         let isUrlCode = await urlModel.findOne({ urlCode: urlCode })
//         if (isUrlCode) {
//             return res.status(400).send({ status: false, message: "already exist" })
//         }
//         // create: short URL
//         const shortUrl = baseUrl + '/' + urlCode
//             // create: doc for database including(urlCode, shortUrl, longUrl)
//         const newUrl = {
//                 longUrl: longUrl,
//                 shortUrl: shortUrl,
//                 urlCode: urlCode,
//             }
//             // creating: document
//         const createUrl = await urlModel.create(newUrl)
//         return res.status(201).send({ data: createUrl })
//     } catch (err) {
//         res.status(500).send({ status: false, msg: err.massage })
//     }
// }

// const getShortUrl = async function(req, res) {
//     try {
//         let urlCode = req.params.urlCode.trim()

//         if (Object.keys(urlCode).length == 0) {
//             res.status(400).send({ status: false, msg: 'Please enter urlCode in the path params' })
//         }

//         let url = await urlModel.findOne({ urlCode: urlCode }).select({ _id: 0, urlCode: 1, shortUrl: 1, longUrl: 1 })
//         console.log(url)

//         if (!url) {
//             return res.status(404).send({ status: false, message: "url not found" })

//         } else {
//             let minUrl = url.longUrl
//             return res.status(302).redirect(minUrl.longUrl)

//         }

//     } catch (err) {

//         console.log(err);

//         res.status(500).send({ status: false, msg: err.massage })
//     }
// }


// module.exports = { shortUrl, getShortUrl }

//===========================================

//npm i redis@3.1.2
// const urlModel = require('../models/urlModel');


// const createUrl = async function(req, res) {
//     try {

//         let data = req.body

//         if (!validator.isValidRequestBody(data)) {
//             return res.status(400).send({ status: false, Message: 'Invalid request parameters. Please provide url details' })

//         }

//         const { urlCode, shortUrl, longUrl } = data


//         if (!validator.isValid(url)) {
//             res.status(400).send({ status: false, message: 'url is required' })
//             return
//         }

//         data = { urlCode, shortUrl, longUrl }


//         const urlDetails = await urlModel.create(data)
//         return res.status(201).send({ status: true, message: 'short url successfully created ', data: urlDetails })


//     } catch (err) {
//         res.status(500).send({ status: false, msg: err.message });
//     }

// }

// module.exports.createUrl = createUrl