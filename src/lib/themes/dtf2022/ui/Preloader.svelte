<!-- Три пульсирующие точки -->
<span class="preloader" role="status" aria-label="Загрузка">
	<span class="preloader__dot"></span>
	<span class="preloader__dot"></span>
	<span class="preloader__dot"></span>
</span>

<style>
	.preloader {
		display: flex;
		gap: 4px;
		width: 20px;
		height: 4px;
		pointer-events: none;
	}

	.preloader__dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background-color: var(--text-primary);
		opacity: 0.2;
		animation: preloader-pulse 1s infinite;
	}

	.preloader__dot:nth-child(2) {
		animation-delay: 0.1s;
	}

	.preloader__dot:nth-child(3) {
		animation-delay: 0.2s;
	}

	@keyframes preloader-pulse {
		0%,
		50%,
		100% {
			opacity: 0.2;
		}

		25% {
			opacity: 1;
		}
	}
</style>
