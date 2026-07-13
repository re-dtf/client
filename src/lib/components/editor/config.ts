import type { EditorConfig } from '@editorjs/editorjs';
import { api } from '$lib/api/index.svelte';
import { getLeonardoUrl } from '$lib/api/utils';
import SpoilerTune from './tools/SpoilerTune';
import AnchorTune from './tools/AnchorTune';
import QuizTool from './tools/QuizTool';
import PersonTool from './tools/PersonTool';

function createCustomList(List: any) {
	return class CustomList extends List {
		static get toolbox() {
			const tools = super.toolbox;
			if (Array.isArray(tools)) {
				return tools.filter((t: any) => t.data?.style !== 'checklist');
			}
			return tools;
		}
		
		renderSettings() {
			const settings = super.renderSettings();
			if (Array.isArray(settings)) {
				return settings.filter((s: any) => s.label !== 'Checklist' && s.title !== 'Checklist' && s.name !== 'checklist');
			}
			return settings;
		}
	};
}

export async function getEditorConfig(): Promise<{ tools: EditorConfig['tools'], tunes: string[] }> {
	const Header = (await import('@editorjs/header')).default;
	const List = (await import('@editorjs/list')).default;
	const Quote = (await import('@editorjs/quote')).default;
	const Delimiter = (await import('@editorjs/delimiter')).default;
	const Code = (await import('@editorjs/code')).default;
	const ImageTool = (await import('@editorjs/image')).default;

	const CustomList = createCustomList(List);

	return {
		tunes: ['spoiler', 'anchor'],
		tools: {
			header: Header,
			list: CustomList,
			quote: Quote,
			delimiter: Delimiter,
			code: Code,
			image: {
				class: ImageTool,
				config: {
					types: 'image/*, video/mp4, video/webm, image/gif, video/quicktime',
					endpoints: {
						byFile: ''
					},
					uploader: {
						async uploadByFile(file: File) {
							try {
								const result = await api.uploadMedia(file);
								const isVideo = result.type === 'movie' || result.type === 'video/mp4' || result.type === 'video/webm' || result.type === 'mp4' || file.type.startsWith('video/');
								const extension = isVideo ? 'mp4' : 'webp';
								
								return {
									success: 1,
									file: {
										url: getLeonardoUrl(result.uuid, { format: extension }),
										uuid: result.uuid,
										width: result.width,
										height: result.height,
										type: result.type || (isVideo ? 'movie' : 'image'),
										size: result.size,
										color: result.color
									}
								};
							} catch (e: any) {
								console.error('Upload failed:', e);
								return {
									success: 0,
									file: {}
								};
							}
						}
					}
				}
			},
			spoiler: SpoilerTune,
			anchor: AnchorTune,
			quiz: {
				class: QuizTool,
				inlineToolbar: true
			},
			person: {
				class: PersonTool,
				inlineToolbar: true
			}
		}
	};
}
