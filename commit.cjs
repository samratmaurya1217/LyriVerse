const { execSync } = require('child_process');
const fs = require('fs');

function run(cmd) {
    console.log(`Running: ${cmd}`);
    try {
        return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
    } catch (e) {
        console.error(`Command failed: ${cmd}\n${e.message}`);
        return '';
    }
}

// 1. Initialize Git and configure
run('git init');
run('git config user.name "samratmaurya1217"');
run('git config user.email "s.sam.11221177@gmail.com"');
run('git remote add origin https://github.com/samratmaurya1217/LyriVerse.git');

// 2. Add files individually to get many commits
const files = run('git ls-files --others --exclude-standard').split('\n').filter(Boolean);

if (files.length === 0) {
    console.log("No new files to commit.");
    process.exit(0);
}

let commitCount = 0;
for (const file of files) {
    run(`git add "${file}"`);
    run(`git commit -m "Add ${file.replace(/\\/g, '/')}"`);
    commitCount++;
}

console.log(`Successfully created ${commitCount} commits.`);
