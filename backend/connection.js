const mongoose = require("mongoose");

let cachedConnectionPromise = null;

async function connectMongoDb(url) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!cachedConnectionPromise) {
    cachedConnectionPromise = mongoose.connect(url).catch((error) => {
      cachedConnectionPromise = null;
      throw error;
    });
  }

  return cachedConnectionPromise;
}

module.exports = {
  connectMongoDb,
};
