const fs = require('fs');

const baseColleges = [
  { name: "Institute of Technology", place: "Bangalore", rating: 4.8 },
  { name: "Engineering College", place: "Mysore", rating: 4.5 },
  { name: "Academy of Sciences", place: "Mangalore", rating: 4.3 },
  { name: "Technological University", place: "Hubli", rating: 4.6 },
  { name: "School of Engineering", place: "Belgaum", rating: 4.2 },
  { name: "Polytechnic Institute", place: "Gulbarga", rating: 4.1 },
  { name: "Institute of Sciences", place: "Dharwad", rating: 4.4 },
  { name: "Tech Campus", place: "Shimoga", rating: 4.0 },
];

let generatedColleges = [];
let currentId = 9;

for (let i = 0; i < 192; i++) {
  let base = baseColleges[i % baseColleges.length];
  let newName = `Karnataka ${base.name} ${i + 1}`;
  let cutoff = 1500 + (i * 250);
  
  generatedColleges.push(`  {
    id: "${currentId++}",
    name: "${newName}",
    place: "${base.place}",
    rating: ${(base.rating - (i%5)*0.1).toFixed(1)},
    fees: ${200000 + (i * 1000)},
    established: ${1980 + (i % 40)},
    type: "Private",
    details: "A growing institution offering quality engineering programs with expanding campus facilities.",
    courses: [
      { courseName: "CSE", averagePackage: ${(8.0 - (i%3)*0.5).toFixed(1)}, highestPackage: 30, fees: ${200000 + (i * 1000)}, cutoffRank: ${cutoff} },
      { courseName: "ECE", averagePackage: ${(6.0 - (i%2)*0.5).toFixed(1)}, highestPackage: 20, fees: ${180000 + (i * 1000)}, cutoffRank: ${cutoff + 2000} }
    ],
    gallery: []
  }`);
}

const content = fs.readFileSync('src/data/colleges.ts', 'utf8');
const replaceMarker = '// GENERATED_COLLEGES_MARKER';

if (content.includes('];')) {
   const newContent = content.replace('];', ',\n' + generatedColleges.join(',\n') + '\n];');
   fs.writeFileSync('src/data/colleges.ts', newContent);
}

