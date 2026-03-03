const argon2 = require('argon2');

async function testPassword() {
    const passwordInput = 'f@1th';
    const storedHash = '$argon2id$v=19$m=65536,t=3,p=4$SzkKfUd1Ixl5nHIfvtMYKw$8n1QYBqdjxQtcZTBLjFSBjMc98mHvRvyNgWgbIpLgiU';

    try {
        console.log(`Testing password: "${passwordInput}"`);
        console.log(`Against hash: ${storedHash}`);

        const isMatch = await argon2.verify(storedHash, passwordInput);

        if (isMatch) {
            console.log("✅ MATCH: The password is correct for this hash.");
        } else {
            console.log("❌ NO MATCH: The password does NOT match this hash.");

            // Generate a fresh hash for comparison
            const freshHash = await argon2.hash(passwordInput, { type: argon2.argon2id });
            console.log(`Fresh hash for "${passwordInput}": ${freshHash}`);
        }
    } catch (e) {
        console.error("Error during verification:", e.message);
    } finally {
        process.exit();
    }
}

testPassword();
