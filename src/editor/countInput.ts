import type { Extension } from "@codemirror/state";
import { StateField, Transaction, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { debounce } from "obsidian";

// Use bit flags for configuration
const CONFIG_FLAGS = {
	COUNT_CHARS: 1 << 0,
	COUNT_PUNCTUATION: 1 << 1,
	TRACK_PASTE: 1 << 2,
	TRACK_DROP: 1 << 3,
	TRACK_COMPOSE_END: 1 << 4,
} as const;

const compositionEndEffect = StateEffect.define<boolean>();

// Convert config to bit flags for faster checks
function getConfigFlags(config: CountConfig): number {
	let flags = 0;
	if (config.countChars) flags |= CONFIG_FLAGS.COUNT_CHARS;
	if (config.countPunctuation) flags |= CONFIG_FLAGS.COUNT_PUNCTUATION;
	if (config.trackPaste) flags |= CONFIG_FLAGS.TRACK_PASTE;
	if (config.trackDrop) flags |= CONFIG_FLAGS.TRACK_DROP;
	if (config.trackComposeEnd) flags |= CONFIG_FLAGS.TRACK_COMPOSE_END;
	return flags;
}

// Reusable punctuation regex
const PUNCTUATION_REGEX =
	/[.,!?;:。，！？；：＂＃＄％＆＇（）＊＋，－／：；＜＝＞＠［＼］＾＿｀｛｜｝～｟｠｢｣､　、〃〈〉《》「」『』【】〔〕〖〗〘〙〚〛〜〝〞〟〰〾〿–—‘’‛“”„‟…‧﹏﹑﹔·]*[！？｡。][」﹂”』’》）］｝〕〗〙〛〉】]*]/g;

function createCountStateField(config: CountConfig) {
	const configFlags = getConfigFlags(config);

	return StateField.define<InputCounts>({
		create() {
			return (
				config.getCounts?.() ?? {
					characters: 0,
					punctuation: 0,
					pasteCount: 0,
					dropCount: 0,
					compositionLength: 0,

					compositionStartPos: 0,
					compositionEndPos: 0,
				}
			);
		},

		update(counts: InputCounts, tr: Transaction) {
			if (
				!tr.docChanged &&
				!tr.effects.some((e) => e.is(compositionEndEffect))
			) {
				return counts;
			}

			// Use object pooling for better memory management
			const newCounts = { ...counts };
			const userEvent = tr.annotation(Transaction.userEvent);

			if (userEvent === "input.paste" || userEvent === "input.drop") {
				return newCounts;
			}

			// Fast path for paste and drop events
			if (
				userEvent === "input.paste" &&
				configFlags & CONFIG_FLAGS.TRACK_PASTE
			) {
				newCounts.pasteCount++;
				return newCounts;
			}

			if (
				userEvent === "input.drop" &&
				configFlags & CONFIG_FLAGS.TRACK_DROP
			) {
				newCounts.dropCount++;
				return newCounts;
			}

			// Handle composition end
			if (
				tr.effects.some((e) => e.is(compositionEndEffect)) &&
				configFlags & CONFIG_FLAGS.COUNT_CHARS
			) {
				newCounts.compositionEndPos = tr.state.selection.main.anchor;
				newCounts.characters += Math.max(
					tr.state.doc
						.toString()
						.slice(
							newCounts.compositionStartPos,
							newCounts.compositionEndPos
						).length,
					newCounts.compositionLength
				);
				newCounts.compositionLength = 0;
				newCounts.compositionStartPos = 0;
				newCounts.compositionEndPos = 0;
				return newCounts;
			}

			// Optimize normal input handling
			if (
				userEvent?.startsWith("input.type") &&
				!userEvent.startsWith("input.type.compose")
			) {
				tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
					const insertedText = inserted.toString();

					if (configFlags & CONFIG_FLAGS.COUNT_CHARS) {
						newCounts.characters += insertedText.length;
					}

					if (configFlags & CONFIG_FLAGS.COUNT_PUNCTUATION) {
						const matches = insertedText.match(PUNCTUATION_REGEX);
						if (matches) {
							newCounts.punctuation += matches.length;
						}
					}
				});
			}

			if (userEvent?.startsWith("input.type.compose.start")) {
				tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
					newCounts.compositionStartPos = fromA;
				});

				return newCounts;
			}

			// Handle composition
			if (
				userEvent?.startsWith("input.type.compose") &&
				!userEvent.startsWith("input.type.compose.end")
			) {
				tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
					newCounts.compositionLength = inserted.toString().length;
				});

				return newCounts;
			}

			return newCounts;
		},
	});
}

export function inputCounter(config: CountConfig = {}): Extension {
	const countStateField = createCountStateField(config);
	const debouncedOnChange = config.onChange
		? debounce(config.onChange, 100)
		: undefined;

	return [
		countStateField,
		EditorView.domEventHandlers({
			compositionend: (event: CompositionEvent, view) => {
				view.dispatch({
					effects: compositionEndEffect.of(true),
					userEvent: "input.type.compose.end",
				});
				return false;
			},
		}),
		EditorView.updateListener.of((update) => {
			if (
				(update.docChanged ||
					update.transactions.some((t) =>
						t.effects.some((e) => e.is(compositionEndEffect))
					)) &&
				debouncedOnChange
			) {
				debouncedOnChange(update.state.field(countStateField));
			}
		}),
	];
}
