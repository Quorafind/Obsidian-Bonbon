interface CountConfig {
	countChars?: boolean; // Count characters
	countPunctuation?: boolean; // Count punctuation
	trackPaste?: boolean; // Track pasted content
	trackDrop?: boolean; // Track dropped content
	trackComposeEnd?: boolean; // Track composition end events
	onChange?: (counts: InputCounts) => void; // Callback for count changes
	getCounts?: () => InputCounts; // Get the current counts
}

interface InputCounts {
	characters: number;
	punctuation: number;
	pasteCount: number;
	dropCount: number;
	compositionLength: number;
	compositionStartPos: number;
	compositionEndPos: number;
}