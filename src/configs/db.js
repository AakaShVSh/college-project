
const mongoose = require("mongoose");
require("dotenv").config();

const connect = async () => {
    await mongoose.connect("mongodb://aakashvishwakarma059_db_user:0QfzBpcBOeZVNVeD@ac-4lqldqq-shard-00-00.jblycyi.mongodb.net:27017,ac-4lqldqq-shard-00-01.jblycyi.mongodb.net:27017,ac-4lqldqq-shard-00-02.jblycyi.mongodb.net:27017/?replicaSet=atlas-exrh8a-shard-0&ssl=true&authSource=admin");
    console.log("MongoDB connected");
};

module.exports = connect;