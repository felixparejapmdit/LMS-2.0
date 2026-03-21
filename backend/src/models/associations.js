const Letter = require('./Letter');
const User = require('./User');
const Tray = require('./Tray');
const Department = require('./Department');
const Status = require('./Status');
const LetterKind = require('./LetterKind');
const ProcessStep = require('./ProcessStep');
const LetterAssignment = require('./LetterAssignment');
const LetterLog = require('./LetterLog');
const Comment = require('./Comment');
const LinkLetter = require('./LinkLetter');
const Role = require('./Role');
const Attachment = require('./Attachment');
const Person = require('./Person');
const RolePermission = require('./RolePermission');
const SystemPage = require('./SystemPage');
const Endorsement = require('./Endorsement');
const UserDeptAccess = require('./UserDeptAccess');
const sequelize = require('../config/db');

// --- Letter Relationships ---
Letter.belongsTo(LetterKind, { foreignKey: 'kind', as: 'letterKind' });
Letter.belongsTo(Status, { foreignKey: 'global_status', as: 'status' });
Letter.belongsTo(User, { foreignKey: 'encoder_id', as: 'encoder' });
Letter.belongsTo(Attachment, { foreignKey: 'attachment_id', as: 'attachment' });

// --- Workflow Relationships (Unified Inbox Feature) ---
Letter.hasMany(LetterAssignment, { foreignKey: 'letter_id', as: 'assignments' });
LetterAssignment.belongsTo(Letter, { foreignKey: 'letter_id', as: 'letter' });

LetterAssignment.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
LetterAssignment.belongsTo(ProcessStep, { foreignKey: 'step_id', as: 'step' });
ProcessStep.hasMany(LetterAssignment, { foreignKey: 'step_id', as: 'assignments' });
LetterAssignment.belongsTo(Status, { foreignKey: 'status_id', as: 'statusInfo' });
LetterAssignment.belongsTo(User, { foreignKey: 'assigned_by', as: 'assigner' });

// --- History & Collaboration ---
Letter.hasMany(LetterLog, { foreignKey: 'letter_id', as: 'logs' });
LetterLog.belongsTo(Letter, { foreignKey: 'letter_id' });
LetterLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Letter.hasMany(Comment, { foreignKey: 'letter_id', as: 'comments' });
Comment.belongsTo(Letter, { foreignKey: 'letter_id' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// --- Organization ---
Letter.belongsTo(Tray, { foreignKey: 'tray_id', as: 'tray' });
Tray.hasMany(Letter, { foreignKey: 'tray_id', as: 'letters' });

// --- Linked Letters ---
Letter.hasMany(LinkLetter, { foreignKey: 'main_letter_id', as: 'attachedLetters' });
LinkLetter.belongsTo(Letter, { foreignKey: 'main_letter_id', as: 'mainLetter' });
LinkLetter.belongsTo(Letter, { foreignKey: 'attached_letter_id', as: 'attachedLetter' });

// --- User & Dept ---
User.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });
Department.hasMany(User, { foreignKey: 'dept_id', as: 'members' });
User.belongsTo(Role, { foreignKey: 'role', as: 'roleData' });
Role.hasMany(User, { foreignKey: 'role', as: 'users' });
Role.hasMany(RolePermission, { foreignKey: 'role_id', as: 'permissions' });
RolePermission.belongsTo(Role, { foreignKey: 'role_id' });

// --- Pluggable DNA Associations ---
Tray.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });
Status.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });
LetterKind.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });
ProcessStep.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });
Attachment.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });
Role.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });
Letter.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });
Department.hasMany(Letter, { foreignKey: 'dept_id', as: 'letters' });

// --- Endorsements ---
Letter.hasMany(Endorsement, { foreignKey: 'letter_id', as: 'endorsements' });
Endorsement.belongsTo(Letter, { foreignKey: 'letter_id', as: 'letter' });
Endorsement.belongsTo(User, { foreignKey: 'endorsed_by', as: 'endorser' });

// --- Interdepartment Access ---
User.hasMany(UserDeptAccess, { foreignKey: 'user_id', as: 'deptAccess' });
UserDeptAccess.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserDeptAccess.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(UserDeptAccess, { foreignKey: 'department_id', as: 'userAccess' });

module.exports = {
    Letter,
    User,
    Tray,
    Department,
    Status,
    LetterKind,
    ProcessStep,
    LetterAssignment,
    LetterLog,
    Comment,
    LinkLetter,
    Role,
    Attachment,
    Person,
    RolePermission,
    SystemPage,
    Endorsement,
    UserDeptAccess,
    sequelize
};
