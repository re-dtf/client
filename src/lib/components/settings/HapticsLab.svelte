<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsButton from './SettingsButton.svelte';
	import { nativeHapticsEngine, type HapticsDiagnostics } from '$lib/haptics/hardware';

	let diagnostics = $state<HapticsDiagnostics | null>(null);
	let lastEffect = $state<string>('');
	let isLoading = $state(false);

	async function loadDiagnostics() {
		isLoading = true;
		try {
			diagnostics = await nativeHapticsEngine.getDiagnostics();
		} catch (e) {
			lastEffect = `Ошибка диагностики: ${e}`;
		} finally {
			isLoading = false;
		}
	}

	async function testAction(name: string, fn: () => Promise<boolean>) {
		lastEffect = `Вызов: ${name}...`;
		const ok = await fn();
		lastEffect = ok ? `Сработало: ${name}` : `Не поддерживается: ${name}`;
	}

	onMount(() => {
		loadDiagnostics();
	});
</script>

<SettingsGroup title="Тактильный отклик (Haptics Lab)" description="Тестирование аппаратных тактильных движков, примитивов и генераций отклика">
	{#if diagnostics}
		<SettingsRow title="Оборудование и ОС" subtitle="Данные аппаратного контроллера устройства">
			<div class="tags-cluster">
				<span class="value-tag value-tag--platform">{diagnostics.manufacturer} {diagnostics.model}</span>
				<span class="value-tag">API {diagnostics.apiLevel}</span>
			</div>
		</SettingsRow>

		<SettingsRow title="Активный уровень (Tier)" subtitle="Режим, автоматически выбираемый для устройства">
			<span class="value-tag value-tag--green">{diagnostics.tier}</span>
		</SettingsRow>

		<SettingsRow title="Возможности вибромотора" subtitle="Аппаратные датчики и регуляторы">
			<div class="tags-cluster">
				<span class="value-tag {diagnostics.hasVibrator ? 'value-tag--green' : 'value-tag--red'}">
					{diagnostics.hasVibrator ? 'Вибромотор: есть' : 'Вибромотор: нет'}
				</span>
				<span class="value-tag {diagnostics.hasAmplitudeControl ? 'value-tag--green' : 'value-tag--amber'}">
					{diagnostics.hasAmplitudeControl ? 'Контроль амплитуды: да' : 'Контроль амплитуды: нет'}
				</span>
			</div>
		</SettingsRow>

		<SettingsRow title="Примитивы Android 11+ (Cirrus / LRA)" subtitle="Аппаратные микропрограммы для чипа актуатора">
			<div class="tags-cluster">
				{#each Object.entries(diagnostics.primitives) as [name, supported]}
					<span class="value-tag {supported ? 'value-tag--green' : 'value-tag--muted'}">
						{name}: {supported ? '✓' : '—'}
					</span>
				{/each}
			</div>
		</SettingsRow>
	{/if}

	<SettingsRow title="Статус теста">
		<span class="value-tag value-tag--blue status-tag">{lastEffect || 'Нажмите кнопку для теста'}</span>
	</SettingsRow>

	<SettingsRow title="Новый адаптивный движок reDTF" subtitle="Умный выбор оптимального эффекта для текущего смартфона">
		<div class="haptic-buttons">
			<button type="button" class="haptic-btn haptic-btn--accent" onclick={() => testAction('tick (микро-щелчок)', () => nativeHapticsEngine.tick())}>
				tick
			</button>
			<button type="button" class="haptic-btn haptic-btn--accent" onclick={() => testAction('soft (мягкое снятие)', () => nativeHapticsEngine.soft())}>
				soft
			</button>
			<button type="button" class="haptic-btn haptic-btn--accent" onclick={() => testAction('click (обычный клик)', () => nativeHapticsEngine.click())}>
				click
			</button>
			<button type="button" class="haptic-btn haptic-btn--accent" onclick={() => testAction('like (лайк вверх)', () => nativeHapticsEngine.like())}>
				like
			</button>
			<button type="button" class="haptic-btn haptic-btn--accent" onclick={() => testAction('dislike (дизлайк вниз)', () => nativeHapticsEngine.dislike())}>
				dislike
			</button>
			<button type="button" class="haptic-btn haptic-btn--accent" onclick={() => testAction('heavy (акцент)', () => nativeHapticsEngine.heavy())}>
				heavy
			</button>
			<button type="button" class="haptic-btn haptic-btn--accent" onclick={() => testAction('double (успех)', () => nativeHapticsEngine.double())}>
				double
			</button>
			<button type="button" class="haptic-btn haptic-btn--danger" onclick={() => testAction('error (ошибка)', () => nativeHapticsEngine.error())}>
				error
			</button>
		</div>
	</SettingsRow>

	<SettingsRow title="Gen 4: Аппаратные примитивы (Android 11+)" subtitle="VibrationEffect.Composition с USAGE_TOUCH для Pixel 4–9 и флагманов">
		<div class="haptic-buttons">
			<button type="button" class="haptic-btn" onclick={() => testAction('PRIMITIVE_TICK (0.6x)', () => nativeHapticsEngine.testPrimitive('tick', 0.6))}>
				TICK 0.6x
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('PRIMITIVE_TICK (1.0x)', () => nativeHapticsEngine.testPrimitive('tick', 1.0))}>
				TICK 1.0x
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('PRIMITIVE_CLICK (0.8x)', () => nativeHapticsEngine.testPrimitive('click', 0.8))}>
				CLICK 0.8x
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('PRIMITIVE_CLICK (1.0x)', () => nativeHapticsEngine.testPrimitive('click', 1.0))}>
				CLICK 1.0x
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('PRIMITIVE_LOW_TICK', () => nativeHapticsEngine.testPrimitive('lowTick', 1.0))}>
				LOW_TICK
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('PRIMITIVE_THUD', () => nativeHapticsEngine.testPrimitive('thud', 1.0))}>
				THUD
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('PRIMITIVE_SPIN', () => nativeHapticsEngine.testPrimitive('spin', 1.0))}>
				SPIN
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('PRIMITIVE_QUICK_RISE', () => nativeHapticsEngine.testPrimitive('quickRise', 1.0))}>
				QUICK_RISE
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('PRIMITIVE_SLOW_RISE', () => nativeHapticsEngine.testPrimitive('slowRise', 1.0))}>
				SLOW_RISE
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('PRIMITIVE_QUICK_FALL', () => nativeHapticsEngine.testPrimitive('quickFall', 1.0))}>
				QUICK_FALL
			</button>
		</div>
	</SettingsRow>

	<SettingsRow title="Gen 3: Predefined Effects (Android 10+)" subtitle="Системные пресеты VibrationEffect.createPredefined">
		<div class="haptic-buttons">
			<button type="button" class="haptic-btn" onclick={() => testAction('EFFECT_TICK', () => nativeHapticsEngine.testPredefined('tick'))}>
				EFFECT_TICK
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('EFFECT_CLICK', () => nativeHapticsEngine.testPredefined('click'))}>
				EFFECT_CLICK
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('EFFECT_DOUBLE_CLICK', () => nativeHapticsEngine.testPredefined('double_click'))}>
				DOUBLE_CLICK
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('EFFECT_HEAVY_CLICK', () => nativeHapticsEngine.testPredefined('heavy_click'))}>
				HEAVY_CLICK
			</button>
		</div>
	</SettingsRow>

	<SettingsRow title="Gen 2: View performHapticFeedback" subtitle="Вызовы через системный WindowManager и View Tree">
		<div class="haptic-buttons">
			<button type="button" class="haptic-btn" onclick={() => testAction('CLOCK_TICK', () => nativeHapticsEngine.testViewHaptic('clock_tick'))}>
				CLOCK_TICK
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('KEYBOARD_TAP', () => nativeHapticsEngine.testViewHaptic('keyboard_tap'))}>
				KEYBOARD_TAP
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('CONTEXT_CLICK', () => nativeHapticsEngine.testViewHaptic('context_click'))}>
				CONTEXT_CLICK
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('CONFIRM', () => nativeHapticsEngine.testViewHaptic('confirm'))}>
				CONFIRM
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('REJECT', () => nativeHapticsEngine.testViewHaptic('reject'))}>
				REJECT
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('SEGMENT_TICK', () => nativeHapticsEngine.testViewHaptic('segment_tick'))}>
				SEGMENT_TICK
			</button>
		</div>
	</SettingsRow>

	<SettingsRow title="Gen 1: Микро-импульсы (Telegram Style)" subtitle="Короткие Waveform-паттерны с контролем амплитуды (1–7 мс)">
		<div class="haptic-buttons">
			<button type="button" class="haptic-btn" onclick={() => testAction('Telegram Selection (1 мс @ 65)', () => nativeHapticsEngine.testPreset('telegram_selection'))}>
				Selection (1 мс)
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('Telegram Light (7 мс @ 65)', () => nativeHapticsEngine.testPreset('telegram_light'))}>
				Light (7 мс)
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('Telegram Rigid (3 мс @ 225)', () => nativeHapticsEngine.testPreset('telegram_rigid'))}>
				Rigid (3 мс)
			</button>
			<button type="button" class="haptic-btn" onclick={() => testAction('Telegram Heavy (7 мс @ 255)', () => nativeHapticsEngine.testPreset('telegram_heavy'))}>
				Heavy (7 мс)
			</button>
		</div>
	</SettingsRow>

	<SettingsRow title="Сравнение: старое поведение Capacitor" subtitle="Длинные захардкоженные тайминги плагина @capacitor/haptics">
		<div class="haptic-buttons">
			<button type="button" class="haptic-btn haptic-btn--warn" onclick={() => testAction('Старый selectionChanged (100 мс гудения)', () => nativeHapticsEngine.testPreset('capacitor_old_selection'))}>
				Старый selection (100 мс)
			</button>
			<button type="button" class="haptic-btn haptic-btn--warn" onclick={() => testAction('Старый impact Light (50 мс гудения)', () => nativeHapticsEngine.testPreset('capacitor_old_light'))}>
				Старый light (50 мс)
			</button>
		</div>
	</SettingsRow>

	<SettingsRow title="Обновить диагностику" subtitle="Перечитать параметры аппаратного чипа и Android HAL">
		<SettingsButton disabled={isLoading} onclick={loadDiagnostics}>
			{isLoading ? 'Опрос...' : 'Обновить'}
		</SettingsButton>
	</SettingsRow>
</SettingsGroup>

<style>
	.tags-cluster {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		justify-content: flex-end;
	}

	.haptic-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		width: 100%;
		padding-top: 4px;
	}

	.haptic-btn {
		padding: 7px 14px;
		border-radius: 17px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		background: var(--st-button, rgba(0, 0, 0, 0.08));
		color: var(--st-text, currentColor);
		border: none;
		transition: background-color var(--duration-base, 0.15s), transform 0.08s ease;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.haptic-btn:active {
		transform: scale(0.96);
		opacity: 0.85;
	}

	.haptic-btn--accent {
		background: var(--st-accent, #3b82f6);
		color: #ffffff;
	}

	.haptic-btn--danger {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.haptic-btn--warn {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.status-tag {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.value-tag {
		padding: 4px 10px;
		border-radius: 6px;
		background: var(--st-track, rgba(0, 0, 0, 0.06));
		color: var(--st-text, currentColor);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 12px;
		font-weight: 600;
	}

	.value-tag--red {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.value-tag--green {
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
	}

	.value-tag--blue {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.value-tag--amber {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.value-tag--muted {
		opacity: 0.45;
	}

	.value-tag--platform {
		background: var(--st-accent, #3b82f6);
		color: #ffffff;
	}
</style>
