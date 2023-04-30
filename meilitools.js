// meilitool.js
import { MeiliSearch } from 'meilisearch';
import fs from 'fs';
import path from 'path';
// import { MeiliKey } from './src/lib/Env';

const client = new MeiliSearch({
	host: 'https://ts.pcast.site/'
	// apiKey: MeiliKey
});

/**
 * @typedef {Object} TranscriptLine
 * @property {string} time
 * @property {string} speaker
 * @property {string} line
 * @property {string} episode
 * @property {boolean} edited
 */

/**
 * @typedef {Object} TranscriptLineWithID
 * @property {string} id
 * @property {string} time
 * @property {string} speaker
 * @property {string} line
 * @property {string} episode
 * @property {boolean} edited
 */

/**
 * @param {number} taskId
 */
function getTask(taskId) {
	client
		.getTask(taskId)
		.then((response) => {
			console.log(response);
		})
		.catch((error) => {
			console.log(error);
		});
}

/**
 * @param {string} folderPath
 */
async function importAllDocuments(folderPath) {
	const files = fs.readdirSync(folderPath);

	for (const file of files) {
		const filePath = path.join(folderPath, file);
		const fileStats = fs.statSync(filePath);

		if (fileStats.isFile() && path.extname(file) === '.json') {
			console.log(`Importing: ${file}`);
			await importDocuments(filePath);
		}
	}
}

/**
 * @param {string[]} args
 * @returns {{ [key: string]: string }}
 */
function parseArguments(args) {
	const parsedArgs = {};
	for (const arg of args) {
		const [key, value] = arg.split('=');
		parsedArgs[key] = value;
	}
	return parsedArgs;
}

/**
 * @param {string} filePath
 * @returns {TranscriptLine[]}
 */
function readJSONFile(filePath) {
	const rawData = fs.readFileSync(filePath, 'utf-8');
	return JSON.parse(rawData);
}

/**
 * @param {TranscriptLine[]} dataArray
 * @returns {TranscriptLineWithID[]}
 */
function addID(dataArray) {
	const firstEpisode = dataArray[0].episode.replace(/\.json$/, '');

	return dataArray
		.map((item, index) => {
			if (!item.episode) {
				console.warn(
					`Warning: In episode file ${firstEpisode} - Line ${
						index + 1
					} is missing the "episode" field.`
				);
			}
			const cleanEpisode = (item.episode || firstEpisode).replace(/\.json$/, '');
			const season = getSeason(cleanEpisode);

			if (season === null) {
				console.error(`Error: ${cleanEpisode} - Invalid episode name.`);
				return null;
			}

			return {
				id: `${cleanEpisode}-${index + 1}`,
				episode: cleanEpisode,
				season,
				time: item.time,
				speaker: item.speaker,
				line: item.line,
				edited: item.edited
			};
		})
		.filter((item) => item !== null);
}

function getSeason(episodeName) {
	const seasonRegex = /^s(\d{2})/;
	const miniRegex = /^mini/;
	const specialRegex = /^Peecast/;

	if (seasonRegex.test(episodeName)) {
		return `s${episodeName.match(seasonRegex)[1]}`;
	} else if (miniRegex.test(episodeName)) {
		return 'mini';
	} else if (specialRegex.test(episodeName)) {
		return 'special';
	} else {
		return null;
	}
}

/**
 * @param {string} filePath
 */
async function importDocuments(filePath) {
	const data = readJSONFile(filePath);
	const dataWithID = addID(data);
	try {
		const response = await client.index('teachers').updateDocuments(dataWithID);
		console.log(response);
	} catch (error) {
		console.log(error);
	}
}

// Example usage
const filePath = './src/assets/transcripts/s01e01.json';

function fixEpisodeField(filePath) {
	const data = readJSONFile(filePath);
	const fixedData = data.map((item) => {
		if (item.episode && item.episode.endsWith('.json')) {
			return { ...item, episode: item.episode.replace(/\.json$/, '') };
		}
		return item;
	});

	// Write the fixed data back to the JSON file
	fs.writeFileSync(filePath, JSON.stringify(fixedData, null, 2));
	console.log(`Fixed episode field in ${filePath}`);
}

function fixAllEpisodeFields(folderPath) {
	const files = fs.readdirSync(folderPath);

	files.forEach((file) => {
		if (file.endsWith('.json')) {
			fixEpisodeField(`${folderPath}/${file}`);
		}
	});
}

function updateFilters() {
	client
		.index('teachers')
		.updateFilterableAttributes(['episode', 'season', 'edited', 'speaker'])
		.then((response) => {
			console.log(response);
		})
		.catch((error) => {
			console.log(error);
		});
}

/**
 * @param {string} folderPath
 */
async function addIdsToFile(folderPath) {
	const files = fs.readdirSync(folderPath);

	for (const file of files) {
		const filePath = path.join(folderPath, file);
		const fileStats = fs.statSync(filePath);

		if (fileStats.isFile() && path.extname(file) === '.json') {
			console.log(`Adding IDs: ${file}`);
			const data = readJSONFile(filePath);
			const dataWithID = addID(data);
			fs.writeFileSync(filePath, JSON.stringify(dataWithID, null, 2));
		}
	}
}

/**
 * @param {string} folderPath
 */
async function removeEmptyLinesAndAddIds(folderPath) {
	const files = fs.readdirSync(folderPath);

	for (const file of files) {
		const filePath = path.join(folderPath, file);
		const fileStats = fs.statSync(filePath);

		if (fileStats.isFile() && path.extname(file) === '.json') {
			console.log(`Removing empty lines and adding IDs: ${file}`);
			const data = readJSONFile(filePath);
			const filteredData = data.filter((item) => item.line.trim() !== '');
			const dataWithID = addID(filteredData);
			fs.writeFileSync(filePath, JSON.stringify(dataWithID, null, 2));
		}
	}
}

const args = parseArguments(process.argv.slice(2));

if (args['--gettask'] !== undefined) {
	const taskId = parseInt(args['--gettask'], 10);

	if (!isNaN(taskId)) {
		getTask(taskId);
	} else {
		console.log('Error: Invalid task ID.');
	}
} else if (args['--import'] !== undefined) {
	const filePath = args['--import'];
	importDocuments(filePath);
} else if (args['--import-all'] !== undefined) {
	const folderPath = args['--import-all'];
	importAllDocuments(folderPath);
} else if (args['--fix-episode'] !== undefined) {
	const filePath = args['--fix-episode'];
	fixEpisodeField(filePath);
} else if (args['--fix-all-episodes'] !== undefined) {
	const folderPath = args['--fix-all-episodes'];
	fixAllEpisodeFields(folderPath);
} else if (args['--add-ids'] !== undefined) {
	const folderPath = args['--add-ids'];
	addIdsToFile(folderPath);
} else if (args['--remove-empty-lines'] !== undefined) {
	const folderPath = args['--remove-empty-lines'];
	removeEmptyLinesAndAddIds(folderPath);
} else {
	console.log('Usage:');
	console.log('  node meilitool.js --gettask=<task_id>');
	console.log('  node meilitool.js --import=<file_path>');
	console.log('  node meilitool.js --import-all=<folder_path>');
}
