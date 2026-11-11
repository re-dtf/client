<script lang="ts">
	import { untrack } from 'svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import SourceAvatar from './SourceAvatar.svelte';
	import type { SourceManifest, SourcePermission } from '$lib/api/sources/types';
	import { getPermissionDescription } from './utils';

	let {
		manifest,
		onConfirm,
		onCancel
	}: {
		manifest: SourceManifest;
		onConfirm: (grantedPermissions: string[]) => void;
		onCancel: () => void;
	} = $props();

	function preparePermissions(m: SourceManifest) {
		let perms = (m.permissions || []).map(p => 
			p.id === 'auth:bio_write' ? { ...p, required: true } : p
		);
		if (m.auth?.type === 'bio_verification') {
			if (!perms.find((p) => p.id === 'auth:bio_write')) {
				perms.push({
					id: 'auth:bio_write',
					description: '',
					required: true
				});
			}
		}
		return perms;
	}

	let permissionsToReview = $derived(preparePermissions(manifest));

	function initCheckedState(perms: SourcePermission[]) {
		const state: Record<string, boolean> = {};
		for (const p of perms) {
			state[p.id] = p.required ? true : false;
		}
		return state;
	}

	let checkedState = $state<Record<string, boolean>>(
		untrack(() => initCheckedState(preparePermissions(manifest)))
	);

	const PARAM_DESCRIPTIONS: Record<string, string> = {
		postId: 'ID постов, которые вы открываете',
		commentId: 'ID комментариев',
		subsiteId: 'ID подсайтов и блогов',
		userId: 'ID профилей пользователей',
		authorId: 'ID авторов'
	};

	let serverHost = $derived.by(() => {
		try {
			return new URL(manifest.api.baseUrl).host;
		} catch {
			return manifest.api.baseUrl;
		}
	});

	let disclosedParams = $derived.by(() => {
		const found = new Set<string>();
		const paramRegex = /\{([a-zA-Z0-9_]+)\}/g;
		for (const ep of Object.values(manifest.endpoints || {})) {
			let m: RegExpExecArray | null;
			while ((m = paramRegex.exec(ep.path)) !== null) {
				found.add(m[1]);
			}
			if (ep.params) {
				for (const p of Object.values(ep.params)) {
					while ((m = paramRegex.exec(p)) !== null) {
						found.add(m[1]);
					}
				}
			}
		}
		return Array.from(found).map((key) => PARAM_DESCRIPTIONS[key] || `Параметр {${key}}`);
	});

	/** Меняют то, что вы видите, или пишут в ваш профиль: такие разрешения выделяем */
	const isRisky = (p: SourcePermission) => p.id.startsWith('mutate:') || p.id.startsWith('auth:');

	function handleConfirm() {
		const granted = permissionsToReview
			.filter(p => p.required || checkedState[p.id])
			.map(p => p.id);
		onConfirm(granted);
	}
</script>

<Dialog label="Подключение источника" width="540px" flush onClose={onCancel}>
	<header class="head">
		<SourceAvatar name={manifest.name} icon={manifest.icon} size={48} />
		<div class="head__text">
			<p class="eyebrow">Подключение источника</p>
			<h2>{manifest.name} <span class="version">v{manifest.version}</span></h2>
			{#if manifest.author?.name}<p class="muted">от {manifest.author.name}</p>{/if}
		</div>
	</header>

	<div class="body">
		{#if manifest.description}
			<p class="lead">{manifest.description}</p>
		{/if}

		<section>
			<h3>Откуда берутся данные</h3>
			<ul class="rows">
				{#each Object.values(manifest.endpoints || {}) as endpoint}
					<li class="row">
						<span class="method">{endpoint.method}</span>
						<div class="row__text">
							<strong>{endpoint.label}</strong>
							<span>{endpoint.description}</span>
						</div>
					</li>
				{:else}
					<li class="row muted">У источника нет запросов</li>
				{/each}
			</ul>
		</section>

		<section>
			<h3>Приватность</h3>
			<ul class="rows notes">
				<li>Сервер <strong>{serverHost}</strong> видит ваш IP-адрес при запросах.</li>
				{#if disclosedParams.length > 0}
					<li>Серверу передаются: {disclosedParams.join(', ')}.</li>
				{/if}
				{#if manifest.auth?.type === 'none'}
					<li>Токены и пароли от DTF этому источнику <strong>не передаются</strong>.</li>
				{/if}
			</ul>
		</section>

		{#if permissionsToReview.length > 0}
			<section>
				<h3>Разрешения</h3>
				<ul class="rows">
					{#each permissionsToReview as perm (perm.id)}
						<li>
							<label class={['row', 'perm', { 'perm--warn': isRisky(perm), 'perm--locked': perm.required }]}>
								<input type="checkbox" bind:checked={checkedState[perm.id]} disabled={perm.required} />
								<span class="row__text">
									<span>{getPermissionDescription(perm)}</span>
									{#if perm.required}<span class="muted">Без этого разрешения источник не работает</span>{/if}
								</span>
							</label>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>

	<footer class="foot">
		<button class="act" onclick={onCancel}>Отмена</button>
		<button class="act suggested" onclick={handleConfirm}>Подключить</button>
	</footer>
</Dialog>

<style>
	.head,
	.foot {
		display: flex;
		flex: none;
		padding: 20px 24px;
	}

	.head {
		align-items: center;
		gap: 16px;
		border-bottom: 1px solid var(--st-separator, var(--border-subtle, rgba(128, 128, 128, 0.2)));
	}

	.head__text {
		min-width: 0;
	}

	.eyebrow,
	.muted,
	h3 {
		color: var(--st-muted, var(--text-muted, #66646b));
		font-size: 13px;
		line-height: 19px;
	}

	h2 {
		font-size: 20px;
		font-weight: 600;
		line-height: 28px;
		overflow-wrap: anywhere;
	}

	.version {
		margin-left: 4px;
		padding: 0 6px;
		border-radius: 6px;
		background: var(--st-button, rgba(128, 128, 128, 0.15));
		color: var(--st-muted, var(--text-muted, #66646b));
		font-size: 12px;
		font-weight: 500;
		vertical-align: 2px;
	}

	.body {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		gap: 24px;
		min-height: 0;
		padding: 20px 24px;
		overflow-y: auto;
	}

	.lead {
		font-size: 15px;
		line-height: 22px;
	}

	section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	h3 {
		font-weight: 600;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow: hidden;
		border-radius: 14px;
		background: color-mix(in srgb, currentColor 5%, transparent);
	}

	.row {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px 16px;
		font-size: 14px;
		line-height: 20px;
	}

	.row + .row,
	li + li > .row {
		border-top: 1px solid var(--st-separator, rgba(128, 128, 128, 0.15));
	}

	.row__text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.row__text > .muted,
	.row__text > span:not(:first-child) {
		font-size: 13px;
	}

	.row strong {
		font-weight: 500;
	}

	.method {
		flex: none;
		min-width: 44px;
		padding: 0 6px;
		border-radius: 6px;
		background: var(--st-button, rgba(128, 128, 128, 0.15));
		color: var(--st-muted, var(--text-muted, #66646b));
		font-family: ui-monospace, monospace;
		font-size: 11px;
		font-weight: 600;
		line-height: 20px;
		text-align: center;
	}

	.notes {
		gap: 0;
		padding: 4px 0;
	}

	.notes li {
		position: relative;
		padding: 6px 16px 6px 32px;
		font-size: 14px;
		line-height: 20px;
	}

	.notes li::before {
		content: '';
		position: absolute;
		top: 14px;
		left: 16px;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--st-muted, var(--text-muted, #66646b));
	}

	.perm {
		cursor: pointer;
	}

	/* Глобально у input сброшен вид (appearance: none), поэтому галочку рисуем сами */
	.perm input {
		display: grid;
		flex: none;
		place-content: center;
		width: 20px;
		height: 20px;
		margin-top: 0;
		border: 2px solid var(--st-muted, var(--text-muted, #66646b));
		border-radius: 6px;
		cursor: inherit;
		transition: background-color var(--duration-base), border-color var(--duration-base);
	}

	.perm input:checked {
		border-color: var(--st-accent, var(--color-blue, #3584e4));
		background: var(--st-accent, var(--color-blue, #3584e4));
	}

	.perm input:checked::after {
		content: '';
		width: 5px;
		height: 10px;
		margin-top: -2px;
		border: solid #fff;
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
	}

	.perm input:disabled {
		opacity: 0.6;
	}

	.perm input:focus-visible {
		outline: 2px solid var(--st-accent, var(--color-blue, #3584e4));
		outline-offset: 2px;
	}

	.perm--locked {
		cursor: default;
	}

	.perm--warn {
		background: color-mix(in srgb, #e5a50a 14%, transparent);
	}

	.foot {
		justify-content: flex-end;
		gap: 12px;
		border-top: 1px solid var(--st-separator, var(--border-subtle, rgba(128, 128, 128, 0.2)));
	}

	@media (max-width: 560px) {
		.head,
		.body,
		.foot {
			padding-inline: 16px;
		}

		.foot .act {
			flex: 1;
		}
	}
</style>
