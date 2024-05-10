const mongoose = require('mongoose');
const redis = require('redis');
const exec = mongoose.Query.prototype.exec;
const util = require('util');

const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
client.get = util.promisify(client.get);

mongoose.Query.prototype.cache = function() {
    this.useCache = true;
    return this;
}

mongoose.Query.prototype.exec = async function() {
    console.log('Running a query');
    if(!this.useCache) {
        return exec.apply(this,arguments);
    }
   
    const key =JSON.stringify(Object.assign({},this.getQuery(),{
        collection: this.mongooseCollection.name
    }));
    const cacheValue = await client.get(key);
    if(cacheValue){
        var doc = JSON.parse(cacheValue);
        if(Array.isArray(doc)){
            doc = doc.map(d => new this.model(d));
        } else {
            doc = new this.model(doc);
        }
        console.log("Serving from cache");
        return doc;
    }
    console.log("Serving from mongodb");
    const result = await exec.apply(this,arguments);
    client.set(key,JSON.stringify(result));
    return result;
    
}