import dns from "node:dns";
import mongoose from "mongoose";

// Force public DNS resolvers and prioritize IPv4
dns.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");

const connectToDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Mongodb  connected : ${connection.connection.host}`);
  } catch (error) {
    console.log(`error connecting to the DB ${error.message}`);
    process.exit(1);
  }
};

export default connectToDB;
