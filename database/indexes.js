const mongoose = require('mongoose');
const Note = require('../models/Note');
const File = require('../models/File');
const ActivityLog = require('../models/ActivityLog');

const createIndexes = async () => {
  try {
    console.log('Creating database indexes...');
    
    await Note.collection.createIndex({ workspaceId: 1, category: 1, isDeleted: 1 });
    console.log('Created compound index on Note');
    
    await File.collection.createIndex({ workspaceId: 1, category: 1, isDeleted: 1 });
    console.log('Created compound index on File');
    
    await Note.collection.createIndex({ title: 'text', content: 'text' });
    console.log('Created text index on Note');
    
    await File.collection.createIndex({ originalName: 'text', displayName: 'text' });
    console.log('Created text index on File');
    
    await ActivityLog.collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
    console.log('Created TTL index on ActivityLog');
    
    console.log('Database indexes creation complete');
  } catch (error) {
    console.error('Error creating database indexes:', error);
  }
};

module.exports = { createIndexes };
