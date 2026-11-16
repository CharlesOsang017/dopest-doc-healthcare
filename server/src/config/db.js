import mongoose from 'mongoose'

const connectToDB = async()=>{
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI)
    console.log(`Mongodb  connected : ${connection.connection.host}`)
  } catch (error) {
    console.log(`error connecting to the DB ${error.message}`)
    process.exit(1)
  }
}

export default connectToDB;