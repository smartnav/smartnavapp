const { DataAPIClient } = require('@datastax/astra-db-ts');
require('dotenv').config();

class AstraDBClient {
  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
  }

  async connect() {
    try {
      // Initialize the client
      this.client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
      
      // Connect to the database
      this.db = this.client.db(process.env.ASTRA_DB_ENDPOINT, {
        namespace: process.env.ASTRA_DB_NAMESPACE
      });

      console.log('Connected to Astra DB successfully');
      
      // Create collections if they don't exist
      await this.createCollections();
      
    } catch (error) {
      console.error('Astra DB connection error:', error.message);
      throw error;
    }
  }

  async createCollections() {
    try {
      // Create realtime_data collection
      await this.db.createCollection('realtime_data', {
        vector: {
          dimension: 1, // Required but we won't use vectors
          metric: 'cosine'
        }
      });
      console.log('Created collection: realtime_data');

      // Create location_history collection  
      await this.db.createCollection('location_history', {
        vector: {
          dimension: 1,
          metric: 'cosine'
        }
      });
      console.log('Created collection: location_history');

    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Collections already exist');
      } else {
        console.error('Error creating collections:', error.message);
      }
    }
  }

  async insertLocation(collectionName, document) {
    try {
      const collection = this.db.collection(collectionName);
      const result = await collection.insertOne(document);
      return result;
    } catch (error) {
      console.error('Error inserting document:', error.message);
      throw error;
    }
  }

  async findLocations(collectionName, filter = {}, options = {}) {
    try {
      const collection = this.db.collection(collectionName);
      const result = await collection.find(filter, options);
      return result;
    } catch (error) {
      console.error('Error finding documents:', error.message);
      throw error;
    }
  }

  async findOne(collectionName, filter = {}) {
    try {
      const collection = this.db.collection(collectionName);
      const result = await collection.findOne(filter);
      return result;
    } catch (error) {
      console.error('Error finding document:', error.message);
      throw error;
    }
  }

  async shutdown() {
    // The Data API client doesn't require explicit shutdown
    console.log('Astra DB client disconnected');
  }
}

module.exports = new AstraDBClient();