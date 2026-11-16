import dotenv from 'dotenv'
import app from './app.js'
import connectToDB from './config/db.js'

dotenv.config()

const port = process.env.PORT || 5000;

app.listen(port, async()=>{
  await connectToDB()
  console.log(`The server is running on port ${port}`)
})