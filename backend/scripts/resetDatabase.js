const { sequelize } = require('../config/database');
require('dotenv').config();

/**
 * Reset Database - Drops all tables and recreates them fresh
 * WARNING: This will delete ALL data!
 */

async function resetDatabase() {
  try {
    console.log('⚠️  WARNING: This will DELETE ALL DATA in the database!');
    console.log('⚠️  All tables will be dropped and recreated fresh.\n');

    console.log('🗑️  Dropping all existing tables...\n');

    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✓ Disabled foreign key checks');

    // Drop all tables
    const tablesToDrop = [
      'quiz_results',
      'quizzes',
      'certificates',
      'progress',
      'enrollments',
      'notifications',
      'feedbacks',
      'materials',
      'topics',
      'courses',
      'categories',
      'users',
      'admins',  // Old table if it exists
    ];

    for (const table of tablesToDrop) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✓ Dropped table: ${table}`);
      } catch (err) {
        console.log(`  Table ${table} doesn't exist or already dropped`);
      }
    }

    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Re-enabled foreign key checks\n');

    console.log('📋 Creating fresh tables with new schema...\n');

    // Force sync all models (this will create all tables fresh)
    await sequelize.sync({ force: true });

    console.log('\n✅ Database reset complete!');
    console.log('\n📊 New tables created:');
    console.log('   - users (with roles: student, expert, admin, superadmin + permissions)');
    console.log('   - categories');
    console.log('   - courses (with userId foreign key + thumbnailImage)');
    console.log('   - topics');
    console.log('   - materials');
    console.log('   - feedbacks');
    console.log('   - enrollments');
    console.log('   - progress');
    console.log('   - quizzes');
    console.log('   - quiz_results');
    console.log('   - certificates');
    console.log('   - notifications');

    console.log('\n🔑 Next step: Create superadmin');
    console.log('   Run: npm run seed');
    console.log('\n   Or login will work with:');
    console.log('   Email: skillspheresuperadmin@admin.com');
    console.log('   Password: skillsphere@123');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  }
}

// Confirm before running
console.log('\n' + '='.repeat(60));
console.log('DATABASE RESET SCRIPT');
console.log('='.repeat(60));
console.log('\nThis script will:');
console.log('  1. Drop ALL existing tables');
console.log('  2. Delete ALL data (users, courses, everything)');
console.log('  3. Recreate tables with new schema');
console.log('\n⚠️  THIS CANNOT BE UNDONE!\n');
console.log('Starting in 3 seconds...\n');

setTimeout(() => {
  resetDatabase();
}, 3000);
