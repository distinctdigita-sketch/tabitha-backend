const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    console.log('🔄 Testing MongoDB Atlas connection...');
    console.log('Connection string:', process.env.MONGODB_URI?.replace(/:[^:]*@/, ':***@'));
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Atlas connected successfully!');
    console.log('📊 Database name:', mongoose.connection.db.databaseName);
    console.log('🌐 Host:', mongoose.connection.host);
    
    // Test creating a simple collection
    const testCollection = mongoose.connection.db.collection('connection_test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('✅ Write test successful!');
    
    await testCollection.deleteOne({ test: true });
    console.log('✅ Delete test successful!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    process.exit(1);
  }
};

testConnection();