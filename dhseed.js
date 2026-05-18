// seed.js for dreamhouse database
// Run with: node seed.js
// Install dependency: npm install mysql2 prompt

const mysql = require('mysql2/promise');
const readline = require('readline');

// Database configuration - UPDATE THESE VALUES
const DB_CONFIG = {
    host: '127.0.0.1',
    user: 'root',           // Your MySQL username
    password: 'root',           // Your MySQL password
    database: 'dreamhouse',
    port: 3306,
    multipleStatements: true
};

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// ============ SEED DATA ============

const TENANTS = [
    {
        tenant_id: 1,
        tenant_name: 'Dream House Pvt Ltd',
        tenant_domain: 'dreamhouse.com',
        tenant_app_name: 'Dream House ERP',
        tenant_app_logo: 'uploads/logos/dreamhouse.png',
        tenant_app_font: 'Poppins',
        tenant_app_themes: '0',
        is_active: 1,
        created_at: '2026-02-17 20:08:37',
        created_by: 'SYSTEM',
        updated_at: '2026-03-30 21:37:20',
        updated_by: null,
        head_branch: '1'
    }
];

const BRANCHES = [
    {
        branch_id: 1,
        tenant_id: 1,
        branch_name: 'MADURAI',
        branch_code: 'MDU001',
        address: 'THALLAKULAM',
        city: 'MADURAI',
        state: 'TAMILNADU',
        pincode: '625529',
        email: null,
        phone: '8783235678',
        is_active: 1,
        created_at: '2026-03-02 13:11:47',
        created_by: 'SYSTEM',
        updated_at: null,
        updated_by: null
    }
];

// Base user data (keycloak_id and username will be prompted)
const USER_BASE = {
    user_id: 1,
    tenant_id: 1,
    first_name: 'DHADMIN',
    last_name: null,
    email: null,
    dateofbirth: '2006-04-17',
    phone_number: null,
    password_hash: '1234',
    created_at: '2026-02-02 00:00:00',
    created_by: 'VIJAY',
    updated_by: null,
    updated_at: '2026-05-05 18:09:51',
    user_photo: null,
    id_card_photo: null,
    aadhaar_number: null,
    address: null,
    district: null,
    state: null,
    country: null,
    pincode: null,
    last_login: '2026-05-05 18:09:51',
    role: 'SUPERUSER',
    status: 'A',
    city: null,
    failed_attempt_count: 0,
    account_locked: 0
};

const USER_BRANCH = {
    tenant_id: 1,
    branch_id: 1,
    user_id: 1,
    created_by: 'DHADMIN',
    created_at: '2026-03-03 10:59:17',
    updated_by: 'admin',
    updated_at: '2026-03-05 11:14:40'
};

// Helper function to build INSERT IGNORE queries
function buildInsertIgnoreQuery(table, data, idColumn) {
    if (!data.length) return '';
    
    const columns = Object.keys(data[0]);
    const values = data.map(row => 
        `(${columns.map(col => {
            let val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return val;
        }).join(', ')})`
    ).join(',\n');
    
    return `INSERT IGNORE INTO ${table} (${columns.join(', ')}) VALUES\n${values};`;
}

async function seed() {
    let connection;
    
    try {
        console.log('========================================');
        console.log('Dreamhouse Database Seeder');
        console.log('========================================\n');
        
        // Get user input for keycloak_id and username
        console.log('Please enter the following details for the SUPERUSER:\n');
        const keycloakId = await question('  Keycloak ID (UUID format, e.g., fc201f67-c778-46a9-b14c-a223b9e2094a): ');
        const username = await question('  Username (e.g., DHADMIN): ');
        
        if (!keycloakId || !username) {
            console.error('\n❌ Error: Both Keycloak ID and Username are required!');
            process.exit(1);
        }
        
        // Build user object with provided values
        const USERS = [{
            ...USER_BASE,
            keycloak_id: keycloakId,
            username: username
        }];
        
        console.log('\nConnecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);
        
        console.log('Starting seed process...\n');
        
        // Check if data already exists
        const [tenantExists] = await connection.execute('SELECT COUNT(*) as count FROM tenant WHERE tenant_id = 1');
        const [branchExists] = await connection.execute('SELECT COUNT(*) as count FROM branch WHERE branch_id = 1');
        const [userExists] = await connection.execute('SELECT COUNT(*) as count FROM user WHERE user_id = 1');
        
        // Seed tenant
        if (tenantExists[0].count === 0) {
            console.log('Seeding tenant...');
            const query = buildInsertIgnoreQuery('tenant', TENANTS, 'tenant_id');
            await connection.execute(query);
            console.log('✓ Tenant seeded successfully');
        } else {
            console.log('⚠ Tenant already exists, skipping...');
        }
        
        // Seed branch
        if (branchExists[0].count === 0) {
            console.log('\nSeeding branch...');
            const query = buildInsertIgnoreQuery('branch', BRANCHES, 'branch_id');
            await connection.execute(query);
            console.log('✓ Branch seeded successfully');
        } else {
            console.log('\n⚠ Branch already exists, skipping...');
        }
        
        // Seed user
        if (userExists[0].count === 0) {
            console.log('\nSeeding user...');
            const userQuery = buildInsertIgnoreQuery('user', USERS, 'user_id');
            await connection.execute(userQuery);
            console.log('✓ User seeded successfully');
        } else {
            console.log('\n⚠ User already exists, skipping...');
        }
        
        // Seed userbranch (check if mapping exists)
        const [userBranchExists] = await connection.execute(
            'SELECT COUNT(*) as count FROM userbranch WHERE tenant_id = 1 AND branch_id = 1 AND user_id = 1'
        );
        
        if (userBranchExists[0].count === 0) {
            console.log('\nSeeding userbranch...');
            const userBranchQuery = buildInsertIgnoreQuery('userbranch', [USER_BRANCH], null);
            await connection.execute(userBranchQuery);
            console.log('✓ User branch mapping seeded successfully');
        } else {
            console.log('\n⚠ User branch mapping already exists, skipping...');
        }
        
        console.log('\n========================================');
        console.log('Seed completed successfully!');
        console.log('========================================');
        console.log(`- Tenant: ${TENANTS.length} record`);
        console.log(`- Branch: ${BRANCHES.length} record`);
        console.log(`- User: 1 record (${username})`);
        console.log(`- UserBranch: 1 record`);
        
        console.log('\n📋 Summary:');
        console.log(`   Tenant: ${TENANTS[0].tenant_name} (ID: 1)`);
        console.log(`   Branch: ${BRANCHES[0].branch_name} (ID: 1, Code: ${BRANCHES[0].branch_code})`);
        console.log(`   User: ${username} (Role: SUPERUSER)`);
        
    } catch (error) {
        console.error('\n❌ Error during seeding:', error.message);
        if (error.code === 'ER_NOT_SUPPORTED_AUTH_MODE') {
            console.error('\nMySQL authentication issue. Try updating your password plugin:');
            console.error('ALTER USER \'root\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'your_password\';');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\nCannot connect to MySQL. Make sure MySQL is running and credentials are correct.');
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('\nMake sure the database "dreamhouse" exists and tables are created.');
            console.error('Run your SQL schema first to create the tables.');
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
        rl.close();
    }
}

// Run the seed function
seed();