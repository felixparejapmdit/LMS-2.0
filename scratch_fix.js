const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'react-frontend', 'src', 'pages', 'management', 'LetterTracker.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Match:
// </td>
// );
// })
// </tbody>
const regex = /(<\/td>\s*)\r?\n(\s*);\r?\n(\s*\}\))\r?\n(\s*<\/tbody>)/;

if (regex.test(content)) {
    content = content.replace(regex, (match, p1, p2, p3, p4) => {
        // p1 is "</td>"
        // p2 is the spaces before ");"
        // p3 is the spaces and "})"
        // p4 is the spaces and "</tbody>"
        // We want: </td>\n[same indent]</tr>\n[same indent]);\n[same indent]})\n[same indent]</tbody>
        // Let's align </tr> with the same indent as ); which is p2.
        return `${p1}\r\n${p2}</tr>\r\n${p2};\r\n${p3}\r\n${p4}`;
    });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Fixed tr closing tag!');
} else {
    console.log('FAILED: Regex pattern not found!');
    // Let's print the segment to see what we actually have
    const index = content.indexOf('</tbody>');
    if (index !== -1) {
        console.log('Found </tbody>. Context around it:');
        console.log(JSON.stringify(content.substring(index - 150, index + 50)));
    }
}
