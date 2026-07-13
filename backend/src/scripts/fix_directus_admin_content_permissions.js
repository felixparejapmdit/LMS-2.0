const sequelize = require("../config/db");

const ADMIN_POLICY_IDS = [
  "033fe4eb-5c8e-4b58-85fe-0a33de46434c",
  "c4a5c6a2-e234-422d-89b6-39e4b14219b8",
];

const ACTIONS = ["create", "read", "update", "delete"];

async function ensureDirectusAdminContentPermissions() {
  console.log("Repairing Directus admin content permissions...");

  const [collections] = await sequelize.query(
    "SELECT collection FROM directus_collections WHERE collection NOT LIKE 'directus_%' ORDER BY collection",
  );

  const collectionNames = collections.map((row) => row.collection).filter(Boolean);
  console.log(`Found ${collectionNames.length} app collections.`);

  for (const policyId of ADMIN_POLICY_IDS) {
    console.log(`Processing policy: ${policyId}`);

    for (const collection of collectionNames) {
      for (const action of ACTIONS) {
        const [existing] = await sequelize.query(
          `SELECT id FROM directus_permissions WHERE policy = :policyId AND collection = :collection AND action = :action LIMIT 1`,
          { replacements: { policyId, collection, action } },
        );

        if (existing.length > 0) {
          await sequelize.query(
            `UPDATE directus_permissions
             SET permissions = '{}',
                 validation = NULL,
                 presets = NULL,
                 fields = '*'
             WHERE policy = :policyId AND collection = :collection AND action = :action`,
            { replacements: { policyId, collection, action } },
          );
        } else {
          await sequelize.query(
            `INSERT INTO directus_permissions
               (collection, action, permissions, validation, presets, fields, policy)
             VALUES
               (:collection, :action, '{}', NULL, NULL, '*', :policyId)`,
            { replacements: { policyId, collection, action } },
          );
        }
      }
    }
  }

  console.log("Directus admin content permissions repaired successfully.");
}

if (require.main === module) {
  ensureDirectusAdminContentPermissions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Failed to repair Directus admin content permissions:", error);
      process.exit(1);
    });
}

module.exports = {
  ensureDirectusAdminContentPermissions,
};
