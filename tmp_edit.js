const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'backend/src/controllers/LetterAssignmentController.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Add empty_entry to the if block
const search1 = `} else if (named_filter === 'hold') {
                    where['$letter.status.status_name$'] = { [Op.or]: ['Hold', 'On Hold'] };
                }`;
const replace1 = `} else if (named_filter === 'hold') {
                    where['$letter.status.status_name$'] = { [Op.or]: ['Hold', 'On Hold'] };
                } else if (named_filter === 'empty_entry') {
                    where['$letter.status.status_name$'] = 'Incoming';
                    where['$step.id$'] = null;
                    where[Op.and] = where[Op.and] || [];
                    where[Op.and].push({
                        [Op.or]: [
                            { '$letter.sender$': null },
                            { '$letter.sender$': '' },
                            { '$letter.summary$': null },
                            { '$letter.summary$': '' }
                        ]
                    });
                }`;
content = content.replace(search1, replace1);

// 2. Change pending to filter out empty entries
const search2 = `if (named_filter === 'pending') {`;
const replace2 = `if (named_filter === 'pending' || named_filter === 'empty_entry') {`;
content = content.replace(search2, replace2);

// 3. Update the map logic
const search3 = `const purelyUnassigned = unassignedLetters.filter(l => (l.assignments || []).length === 0);
                const mappedMocks = purelyUnassigned.map(l => ({`;
const replace3 = `const purelyUnassigned = unassignedLetters.filter(l => (l.assignments || []).length === 0);
                const targetUnassigned = named_filter === 'empty_entry' 
                    ? purelyUnassigned.filter(l => !l.sender || l.sender.trim() === '' || !l.summary || l.summary.trim() === '')
                    : purelyUnassigned.filter(l => l.sender && l.sender.trim() !== '' && l.summary && l.summary.trim() !== '');
                const mappedMocks = targetUnassigned.map(l => ({`;
content = content.replace(search3, replace3);

fs.writeFileSync(file, content);
console.log('Success');
