import fs from 'fs';

// Read the JSON file
const jsonString = fs.readFileSync('./src/assets/episodes.json', 'utf8');
const json = JSON.parse(jsonString);

// Read the plain text file with URLs
const plainTextUrls = fs.readFileSync('urls.txt', 'utf8').split('\n');
const plainTextNumbers = plainTextUrls.map((url) => url.match(/\d+$/)[0]);

// Loop through the plain text URLs, find the matching JSON object, and update the URL
for (let i = 0; i < plainTextUrls.length; i++) {
	let plainUrl = plainTextUrls[i];
	let newUrl = 'https://stitcher.com/' + plainUrl.replace(/\d+$/, '');
	let match = json.find((j) => j.url.startsWith(newUrl));
	if (match) {
		match.url = newUrl + plainTextNumbers[i];
	}
}

// Write the updated JSON back to the file
fs.writeFileSync('new-episodes.json', JSON.stringify(json));
