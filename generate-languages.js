const fs = require('fs');

// Configuration
const USERNAMES = ['AlexMcVay', 'alexM-glitch']; 

async function fetchLanguages(username, token) {
  const query = `
    query($username: String!) {
      user(login: $username) {
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          nodes {
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                  color
                }
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
  if (data.errors) return [];
  
  // Extract language edges from all repositories
  return data.data.user.repositories.nodes.flatMap(repo => repo.languages.edges);
}

async function run() {
  const token = process.env.GITHUB_TOKEN;
  const allLanguageEdges = (await Promise.all(USERNAMES.map(u => fetchLanguages(u, token)))).flat();

  // Aggregate bytes per language
  const stats = {};
  let totalBytes = 0;

  allLanguageEdges.forEach(edge => {
    const name = edge.node.name;
    const color = edge.node.color || '#cccccc';
    const size = edge.size;

    if (!stats[name]) {
      stats[name] = { color, bytes: 0 };
    }
    stats[name].bytes += size;
    totalBytes += size;
  });

  // Sort by size and take top 8
  const sorted = Object.entries(stats)
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .slice(0, 8);

  // Generate SVG (Progress bar style)
  const width = 400;
  const barHeight = 16;
  let currentX = 0;
  let barSvg = '';
  let legendSvg = '';

  sorted.forEach(([name, data], i) => {
    const percentage = (data.bytes / totalBytes) * 100;
    const itemWidth = (data.bytes / totalBytes) * width;
    
    // Progress Bar segments
    barSvg += `<rect x="${currentX}" y="0" width="${itemWidth}" height="${barHeight}" fill="${data.color}" />`;
    currentX += itemWidth;

    // Legend
    const row = Math.floor(i / 4);
    const col = i % 4;
    legendSvg += `
      <g transform="translate(${col * 100}, ${25 + (row * 20)})">
        <circle cx="5" cy="5" r="5" fill="${data.color}" />
        <text x="15" y="9" font-family="sans-serif" font-size="10" fill="#666">${name} ${percentage.toFixed(1)}%</text>
      </g>`;
  });

  const fullSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="100">
      <clipPath id="rect-clip"><rect width="${width}" height="${barHeight}" rx="8" /></clipPath>
      <g clip-path="url(#rect-clip)">${barSvg}</g>
      ${legendSvg}
    </svg>`;

  fs.writeFileSync('merged-languages.svg', fullSvg);
}

run();
