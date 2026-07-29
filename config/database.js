const mongoose = require('mongoose');

const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI environment variable is not set!');
    process.exit(1);
  }

  try {
    // Removed deprecated useNewUrlParser and useUnifiedTopology (not needed in Mongoose 8+)
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  Mongoose disconnected — will attempt to reconnect automatically');
    });

    // Graceful shutdown
    const gracefulExit = async () => {
      try {
        await mongoose.connection.close();
        console.log('Mongoose connection closed on app termination');
      } catch (err) {
        console.error('Error closing mongoose connection:', err);
      } finally {
        process.exit(0);
      }
    };

    process.on('SIGINT',  gracefulExit);
    process.on('SIGTERM', gracefulExit);

  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };
