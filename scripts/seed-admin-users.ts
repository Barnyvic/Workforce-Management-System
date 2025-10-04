import 'dotenv/config';
import { AuthServiceImpl } from '../src/services/auth.service';
import { dataSource } from '../src/config/database';

interface AdminUser {
  name: string;
  email: string;
  password: string;
  role: string;
  departmentId: number;
}

async function seedAdminUsers() {
  try {
    console.log('🚀 Starting admin users seeding process...');
    
    const authService = new AuthServiceImpl();
    
    // Define admin users with their plain text passwords
    const adminUsers: AdminUser[] = [
      {
        name: 'System Administrator',
        email: 'admin@company.com',
        password: 'Admin123!',
        role: 'ADMIN',
        departmentId: 1
      },
      {
        name: 'Super Admin',
        email: 'superadmin@company.com',
        password: 'SuperAdmin456!',
        role: 'ADMIN',
        departmentId: 1
      },
      {
        name: 'IT Manager',
        email: 'itmanager@company.com',
        password: 'ITManager789!',
        role: 'MANAGER',
        departmentId: 1
      },
      {
        name: 'HR Manager',
        email: 'hrmanager@company.com',
        password: 'HRManager101!',
        role: 'MANAGER',
        departmentId: 2
      }
    ];

    // Initialize database connection
    if (!dataSource.isInitialized) {
      console.log('📡 Initializing database connection...');
      await dataSource.initialize();
    }

    console.log('🔐 Generating password hashes...');
    
    // Process each admin user
    for (const user of adminUsers) {
      console.log(`\n👤 Processing user: ${user.name} (${user.email})`);
      
      // Generate hash for the password
      const hashedPassword = await authService.hashPassword(user.password);
      console.log(`✅ Password hash generated for ${user.email}`);
      
      // Verify the hash works
      const isValid = await authService.comparePassword(user.password, hashedPassword);
      if (!isValid) {
        console.error(`❌ Hash validation failed for ${user.email}`);
        continue;
      }
      
      // Check if user already exists
      const existingUser = await dataSource.query(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );
      
      if (existingUser.length > 0) {
        // Update existing user
        console.log(`🔄 Updating existing user: ${user.email}`);
        await dataSource.query(
          'UPDATE users SET name = ?, password = ?, role = ?, departmentId = ?, updatedAt = NOW() WHERE email = ?',
          [user.name, hashedPassword, user.role, user.departmentId, user.email]
        );
      } else {
        // Insert new user
        console.log(`➕ Creating new user: ${user.email}`);
        await dataSource.query(
          'INSERT INTO users (name, email, password, role, departmentId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [user.name, user.email, hashedPassword, user.role, user.departmentId]
        );
      }
      
      console.log(`✅ User ${user.email} processed successfully`);
    }

    // Verify all users were created/updated
    console.log('\n📊 Verification - Admin users in database:');
    const adminUsersInDb = await dataSource.query(
      "SELECT id, name, email, role, departmentId FROM users WHERE role IN ('ADMIN', 'MANAGER') ORDER BY role, email"
    );
    
    console.table(adminUsersInDb);

    await dataSource.destroy();
    
    console.log('\n🎉 Admin users seeding completed successfully!');
    console.log('\n📋 ADMIN CREDENTIALS SUMMARY:');
    console.log('=' .repeat(60));
    
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Role: ${user.role}`);
      console.log('   ' + '-'.repeat(40));
    });
    
    console.log('\n⚠️  IMPORTANT: Store these credentials securely!');
    console.log('💡 You can now use any of these credentials to log into the system.');
    
  } catch (error) {
    console.error('❌ Error seeding admin users:', error);
    process.exit(1);
  }
}

seedAdminUsers();
