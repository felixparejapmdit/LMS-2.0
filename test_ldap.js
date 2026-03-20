const ldap = require('ldapjs');

const config = {
    url: 'ldap://172.18.121.37:389',
    bindDn: 'cn=admin,dc=pmdmc,dc=net',
    bindPassword: 'M@sunur1nldapofPMDIT',
    searchBase: 'dc=pmdmc,dc=net',
    testUser: 'felix.pareja',
    testPass: 'katapatan'
};

async function testLdap() {
    const client = ldap.createClient({ url: config.url });

    console.log("[LDAP TEST] Connecting to:", config.url);

    try {
        // Step 1: Bind with Admin
        await new Promise((resolve, reject) => {
            client.bind(config.bindDn, config.bindPassword, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log("[LDAP TEST] Admin bind successful");

        // Step 2: Search for all entries in the base to see what's there
        const searchOptions = {
            scope: 'sub',
            filter: '(objectClass=*)'
        };

        const exactDn = "uid=felix.pareja,cn=PMD-IT,dc=pmdmc,dc=net";
        console.log(`[LDAP TEST] Attempting bind with exact DN: ${exactDn}`);
        
        const userClient = ldap.createClient({ url: config.url });
        const success = await new Promise((resolve, reject) => {
            userClient.bind(exactDn, config.testPass, (err) => {
                if (err) {
                    console.error("[LDAP TEST] BIND FAILED:", err.message);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });

        if (success) {
            console.log("[LDAP TEST] SUCCESS! The password 'katapatan' is correct for this DN.");
        } else {
            console.log("[LDAP TEST] FAILED. Please double check the password.");
        }
        userClient.unbind();

    } catch (err) {
        console.error("[LDAP TEST] ERROR:", err.message);
    } finally {
        client.unbind();
    }
}

testLdap();
