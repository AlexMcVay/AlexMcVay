const fs = require('fs');

// Configuration
const USERNAMES = ['account1', 'account2']; // Replace with your accounts
const THEME = {
  level0: '#ebedf0',
  level1: '#9be9a8',
  level2: '#40c463',
  level3: '#30a14e',
  level4: '#216e39',
  text: '#24292f'
};

async function fetchContributions(username, token) {
  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                count: contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables: { username } }),
  });
  const data = await response.json();
  return data.data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap(w => w.contributionDays);
}

function getLevel(count) {
  if (count === 0) return 0;
  if (count <= 5) return 1;
  if (count <= 10) return 2;
  if (count <= 15) return 3;
  return 4; // Levels based on library thresholds
}

async function run() {
  const token = process.env.GITHUB_TOKEN;
  const allData = await Promise.all(USERNAMES.map(u => fetchContributions(u, token)));
  
  // Merge logic
  const mergedMap = new Map();
  allData.flat().forEach(d => {
    mergedMap.set(d.date, (mergedMap.get(d.date) || 0) + d.count);
  });

  const contributions = Array.from(mergedMap.entries())
    .map(([date, count]) => ({ date, count, level: getLevel(count) }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-371); // Last year of data

  // Generate SVG
  const blockSize = 12;
  const margin = 3;
  let svgContent = '';
  
  contributions.forEach((day, i) => {
    const week = Math.floor(i / 7);
    const dayOfWeek = i % 7;
    const x = week * (blockSize + margin);
    const y = dayOfWeek * (blockSize + margin);
    const color = THEME[`level${day.level}`];
    svgContent += `<rect x="${x}" y="${y}" width="${blockSize}" height="${blockSize}" fill="${color}" rx="2" ry="2"><title>${day.date}: ${day.count}</title></rect>`;
  });

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="850" height="120">${svgContent}</svg>`;
  fs.writeFileSync('merged-calendar.svg', fullSvg);
}

run();
