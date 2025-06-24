const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better performance
    await createIndexes();
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Text search indexes for fuzzy search
    await mongoose.connection.db.collection('children').createIndex({
      first_name: 'text',
      middle_name: 'text',
      last_name: 'text',
      social_worker_notes: 'text'
    });

    await mongoose.connection.db.collection('staff').createIndex({
      first_name: 'text',
      last_name: 'text',
      position: 'text'
    });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error.message);
  }
};

module.exports = connectDB;