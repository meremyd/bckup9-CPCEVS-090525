const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

async function cleanupDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('ballots');
    
    // Find SSG ballot duplicates
    console.log('\n=== Finding SSG Ballot Duplicates ===');
    const ssgDuplicates = await collection.aggregate([
      {
        $match: { ssgElectionId: { $ne: null } }
      },
      {
        $group: {
          _id: { voterId: '$voterId', ssgElectionId: '$ssgElectionId' },
          ballots: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();
    
    console.log(`Found ${ssgDuplicates.length} SSG duplicate groups`);
    
    let ssgDeleted = 0;
    for (const dup of ssgDuplicates) {
      // Keep the most recent ballot
      const sorted = dup.ballots.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      const toDelete = sorted.slice(1).map(b => b._id);
      
      await collection.deleteMany({ _id: { $in: toDelete } });
      ssgDeleted += toDelete.length;
      
      console.log(`  Voter ${dup._id.voterId}: Kept 1, deleted ${toDelete.length}`);
    }
    
    // Find Departmental ballot duplicates
    console.log('\n=== Finding Departmental Ballot Duplicates ===');
    const deptDuplicates = await collection.aggregate([
      {
        $match: { deptElectionId: { $ne: null } }
      },
      {
        $group: {
          _id: { 
            voterId: '$voterId', 
            deptElectionId: '$deptElectionId',
            currentPositionId: '$currentPositionId'
          },
          ballots: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();
    
    console.log(`Found ${deptDuplicates.length} Departmental duplicate groups`);
    
    let deptDeleted = 0;
    for (const dup of deptDuplicates) {
      const sorted = dup.ballots.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      const toDelete = sorted.slice(1).map(b => b._id);
      
      await collection.deleteMany({ _id: { $in: toDelete } });
      deptDeleted += toDelete.length;
      
      console.log(`  Voter ${dup._id.voterId}: Kept 1, deleted ${toDelete.length}`);
    }
    
    console.log('\n=== Cleanup Summary ===');
    console.log(`SSG duplicates removed: ${ssgDeleted}`);
    console.log(`Departmental duplicates removed: ${deptDeleted}`);
    console.log(`Total duplicates removed: ${ssgDeleted + deptDeleted}`);
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanupDuplicates();