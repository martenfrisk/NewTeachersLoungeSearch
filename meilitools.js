import { MeiliSearch } from 'meilisearch';
import fs from 'fs';
import path from 'path';

function loadEnv() {
	const envPath = path.resolve(process.cwd(), '.env');
	const envData = fs.readFileSync(envPath, 'utf-8');
	const envLines = envData.split('\n');

	for (const line of envLines) {
		const [key, value] = line.split('=');
		if (key === 'VITE_MEILI_KEY') {
			return value;
		}
	}
	return null;
}

const MeiliKey = loadEnv();

const client = new MeiliSearch({
	host: 'https://ts.pcast.site/',
	apiKey: MeiliKey
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
	// const dataWithID = addID(data);
	try {
		const response = await client.index('teachers').updateDocuments(data);
		console.log(response);
	} catch (error) {
		console.log(error);
	}
}

// Example usage
// const filePath = './src/assets/transcripts/s01e01.json';

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

// function updateFilters() {
// 	client
// 		.index('teachers')
// 		.updateFilterableAttributes(['episode', 'season', 'edited', 'speaker'])
// 		.then((response) => {
// 			console.log(response);
// 		})
// 		.catch((error) => {
// 			console.log(error);
// 		});
// }

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

/**
 * @param {string} episodeName
 */
async function searchEpisode(episodeName) {
	try {
		const searchResponse = await client.index('teachers').search('', {
			filter: [`episode = "${episodeName}"`],
			limit: 400
		});

		const ids = searchResponse.hits.map((hit) => hit.id);
		return ids;
	} catch (error) {
		console.error('Error searching for episode:', error);
		return [];
	}
}

/**
 * @param {string} episodeName
 */
async function removeLinesFromEpisode(episodeName) {
	const ids = await searchEpisode(episodeName);

	if (ids.length === 0) {
		console.log(`No lines found for episode: ${episodeName}`);
		return;
	}

	try {
		const response = await client.index('teachers').deleteDocuments(ids);
		console.log(`Removed lines from episode: ${episodeName}`, response);
	} catch (error) {
		console.error('Error removing lines from episode:', error);
	}
}

/**
 * Convert centiseconds to H:MM:SS format
 * @param {number} centiseconds - Time in centiseconds (100 = 1 second)
 * @returns {string} Formatted time string
 */
function formatTime(centiseconds) {
	const totalSeconds = Math.floor(centiseconds / 100);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	
	return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Convert transcript from new format to expected format
 * @param {Array} inputTranscript - Array of transcript segments with start, stop, text, speaker
 * @param {string} episodeName - Name of the episode
 * @returns {Array} Converted transcript in expected format
 */
function convertTranscriptFormat(inputTranscript, episodeName) {
	return inputTranscript
		.map((segment, index) => {
			const trimmedText = segment.text.trim();
			
			// Skip empty lines or lines that are just hyphens
			if (!trimmedText || trimmedText === '-') {
				return null;
			}

			const startTime = formatTime(segment.start);
			const stopTime = formatTime(segment.stop);

			return {
				time: startTime, // Keep backwards compatibility
				startTime: startTime, // New detailed format
				stopTime: stopTime, // New detailed format
				speaker: `Speaker ${segment.speaker}`,
				line: trimmedText,
				episode: episodeName,
				edited: false
			};
		})
		.filter(item => item !== null);
}

/**
 * Convert transcript file from input format to expected format
 * @param {string} inputFilePath - Path to input transcript file
 * @param {string} outputFilePath - Path to save converted transcript
 * @param {string} episodeName - Name of the episode
 */
function convertTranscriptFile(inputFilePath, outputFilePath, episodeName) {
	try {
		const inputData = readJSONFile(inputFilePath);
		const convertedData = convertTranscriptFormat(inputData, episodeName);

		fs.writeFileSync(outputFilePath, JSON.stringify(convertedData, null, 2));
		console.log(`Converted transcript saved to: ${outputFilePath}`);
		console.log(`Converted ${convertedData.length} transcript segments`);
	} catch (error) {
		console.error('Error converting transcript:', error);
	}
}

async function getMeiliVersion() {
	try {
		const response = await client.getVersion();
		console.log(response);
	} catch (error) {
		console.log(error);
	}
}

async function createDump() {
	try {
		const response = await client.createDump();
		console.log(response);
	} catch (error) {
		console.log(error);
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
} else if (args['--search-episode'] !== undefined) {
	const episodeName = args['--search-episode'];
	searchEpisode(episodeName);
} else if (args['--remove-lines-from-episode'] !== undefined) {
	const episodeName = args['--remove-lines-from-episode'];
	removeLinesFromEpisode(episodeName);
} else if (args['--get-version'] !== undefined) {
	getMeiliVersion();
} else if (args['--create-dump'] !== undefined) {
	await createDump();
} else if (args['--convert-transcript'] !== undefined) {
	const inputPath = args['--convert-transcript'];
	const outputPath = args['--output'] || inputPath.replace('.json', '-converted.json');
	const episodeName = args['--episode'];

	if (!episodeName) {
		console.error('Error: Episode name is required. Use --episode=<episode_name>');
		process.exit(1);
	}

	convertTranscriptFile(inputPath, outputPath, episodeName);
} else {
	console.log('Usage:');
	console.log('  node meilitools.js --gettask=<task_id>');
	console.log('  node meilitools.js --import=<file_path>');
	console.log('  node meilitools.js --import-all=<folder_path>');
	console.log('  node meilitools.js --fix-episode=<file_path>');
	console.log('  node meilitools.js --fix-all-episodes=<folder_path>');
	console.log('  node meilitools.js --add-ids-to-file=<file_path>');
	console.log('  node meilitools.js --add-ids-to-all-files=<folder_path>');
	console.log('  node meilitools.js --remove-empty-lines=<file_path>');
	console.log('  node meilitools.js --remove-empty-lines-all=<folder_path>');
	console.log('  node meilitools.js --search-episode=<episode_name>');
	console.log('  node meilitools.js --remove-lines-from-episode=<episode_name>');
	console.log('  node meilitools.js --get-version');
	console.log(
		'  node meilitools.js --convert-transcript=<input_file> --episode=<episode_name> [--output=<output_file>]'
	);
}
