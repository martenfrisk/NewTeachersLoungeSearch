import fs from 'fs';

function parseArguments(args) {
	const parsedArgs = {};
	for (const arg of args) {
		const [key, value] = arg.split('=');
		parsedArgs[key] = value;
	}
	return parsedArgs;
}

function readJSONFile(filePath) {
	const rawData = fs.readFileSync(filePath, 'utf-8');
	return JSON.parse(rawData);
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
		.map((segment) => {
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
		.filter((item) => item !== null);
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

const args = parseArguments(process.argv.slice(2));

if (args['--convert-transcript'] !== undefined) {
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
	console.log(
		'  node scripts/transform-script.js --convert-transcript=<input_file> --episode=<episode_name> [--output=<output_file>]'
	);
}
