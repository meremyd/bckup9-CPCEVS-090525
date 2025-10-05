const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fixBallotIndexes() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('ballots');
    
    console.log('\n=== Current Indexes ===');
    const existingIndexes = await collection.indexes();
    existingIndexes.forEach(index => {
      if (index.name.includes('voterId')) {
        console.log(JSON.stringify(index, null, 2));
      }
    });
    
    // Drop the problematic indexes
    console.log('\n=== Dropping Old Indexes ===');
    try {
      await collection.dropIndex('voterId_1_deptElectionId_1');
      console.log('✓ Dropped voterId_1_deptElectionId_1');
    } catch (e) {
      console.log('- voterId_1_deptElectionId_1 not found (already dropped or never existed)');
    }
    
    try {
      await collection.dropIndex('voterId_1_ssgElectionId_1');
      console.log('✓ Dropped voterId_1_ssgElectionId_1');
    } catch (e) {
      console.log('- voterId_1_ssgElectionId_1 not found (already dropped or never existed)');
    }
    
    // Create new partial indexes
    console.log('\n=== Creating New Partial Indexes ===');
    await collection.createIndex(
      { voterId: 1, deptElectionId: 1 },
      { 
        unique: true, 
        partialFilterExpression: { deptElectionId: { $type: 'objectId' } },
        name: 'voterId_1_deptElectionId_1'
      }
    );
    console.log('✓ Created partial index for departmental ballots');
    
    await collection.createIndex(
      { voterId: 1, ssgElectionId: 1 },
      { 
        unique: true, 
        partialFilterExpression: { ssgElectionId: { $type: 'objectId' } },
        name: 'voterId_1_ssgElectionId_1'
      }
    );
    console.log('✓ Created partial index for SSG ballots');
    
    // Verify the new indexes
    console.log('\n=== New Indexes ===');
    const newIndexes = await collection.indexes();
    newIndexes.forEach(index => {
      if (index.name.includes('voterId')) {
        console.log(JSON.stringify(index, null, 2));
      }
    });
    
    console.log('\n✓ All done! Ballot indexes fixed successfully.');
    console.log('You can now restart your application.\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('Error fixing ballot indexes:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixBallotIndexes();