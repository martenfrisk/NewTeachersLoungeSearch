<div class="aligner-item coffee-container">
	<div class="steam-container">
		<div class="squiggle-container squiggle-container-1">
			<div class="squiggle">
				<svg
					version="1.1"
					id="Layer_1"
					xmlns="http://www.w3.org/2000/svg"
					xmlns:xlink="http://www.w3.org/1999/xlink"
					x="0px"
					y="0px"
					viewBox="0 0 28.1 80.6"
					style="enable-background:new 0 0 28.1 80.6;"
					xml:space="preserve"
				>
					<path
						class=""
						fill="none"
						stroke-width="11"
						stroke-linecap="round"
						stroke-miterlimit="10"
						d="M22.6,75.1c-8-5.6-15.2-10.5-15.2-19.9c0-12.1,14.1-17.2,14.1-29.6c0-9.1-6.7-15.7-16-20.1"
					/>
				</svg>
			</div>
			<!-- end .squiggle-->
		</div>
		<div class="squiggle-container squiggle-container-2">
			<div class="squiggle">
				<svg
					version="1.1"
					id="Layer_1"
					xmlns="http://www.w3.org/2000/svg"
					xmlns:xlink="http://www.w3.org/1999/xlink"
					x="0px"
					y="0px"
					viewBox="0 0 28.1 80.6"
					style="enable-background:new 0 0 28.1 80.6;"
					xml:space="preserve"
				>
					<path
						class=""
						fill="none"
						stroke="#fff"
						stroke-width="11"
						stroke-linecap="round"
						stroke-miterlimit="10"
						d="M22.6,75.1c-8-5.6-15.2-10.5-15.2-19.9c0-12.1,14.1-17.2,14.1-29.6c0-9.1-6.7-15.7-16-20.1"
					/>
				</svg>
			</div>
			<!-- end .squiggle-->
		</div>
		<div class="squiggle-container squiggle-container-3">
			<div class="squiggle">
				<svg
					version="1.1"
					id="Layer_1"
					xmlns="http://www.w3.org/2000/svg"
					xmlns:xlink="http://www.w3.org/1999/xlink"
					x="0px"
					y="0px"
					viewBox="0 0 28.1 80.6"
					style="enable-background:new 0 0 28.1 80.6;"
					xml:space="preserve"
				>
					<path
						class=""
						fill="none"
						stroke="#fff"
						stroke-width="11"
						stroke-linecap="round"
						stroke-miterlimit="10"
						d="M22.6,75.1c-8-5.6-15.2-10.5-15.2-19.9c0-12.1,14.1-17.2,14.1-29.6c0-9.1-6.7-15.7-16-20.1"
					/>
				</svg>
			</div>
			<!-- end .squiggle-->
		</div>
	</div>

	<div class="coffee-cup-container">
		<img src="/coffee.svg" alt="Coffee pot" />
	</div>
</div>

<style>
	/* START coffee pot */
	.steam-container {
		width: 18px;
		height: 30px;
		margin-left: 5px;
		-webkit-transform: scale(60%);
		transform: scale(60%);
	}

	.coffee-container {
		width: 40px;
		height: 40px;
		margin-bottom: 28px;
		margin-right: 15px;
		position: relative;
		z-index: 10;
	}

	.squiggle-container {
		width: 5px;
		height: 30px;
		display: inline-block;
	}

	.squiggle-container-1 {
		-webkit-transform: translateY(10px);
		transform: translateY(10px);
	}

	.squiggle-container-1 .squiggle {
		-webkit-animation: move-and-fade 5s linear infinite;
		animation: move-and-fade 5s linear infinite;
		-webkit-animation-delay: 0.2s;
		animation-delay: 0.2s;
		width: 4px;
	}

	@-webkit-keyframes move-and-fade {
		0% {
			opacity: 0;
			-webkit-transform: translateY(0);
			transform: translateY(0);
		}
		50% {
			opacity: 1;
		}
		75% {
			opacity: 0;
		}
		100% {
			-webkit-transform: translateY(-10px);
			transform: translateY(-10px);
			opacity: 0;
		}
	}

	@keyframes move-and-fade {
		0% {
			opacity: 0;
			-webkit-transform: translateY(0);
			transform: translateY(0);
		}
		50% {
			opacity: 1;
		}
		75% {
			opacity: 0;
		}
		100% {
			-webkit-transform: translateY(-10px);
			transform: translateY(-10px);
			opacity: 0;
		}
	}

	.squiggle-container-2 {
		-webkit-transform: translateY(0px);
		transform: translateY(0px);
	}

	.squiggle-container-2 .squiggle {
		-webkit-animation: move-and-fade 5s linear infinite;
		animation: move-and-fade 5s linear infinite;
		-webkit-animation-delay: 0s;
		animation-delay: 0s;
		width: 4px;
	}

	@keyframes move-and-fade {
		0% {
			opacity: 0;
			-webkit-transform: translateY(0);
			transform: translateY(0);
		}
		50% {
			opacity: 1;
		}
		75% {
			opacity: 0;
		}
		100% {
			-webkit-transform: translateY(-20px);
			transform: translateY(-20px);
			opacity: 0;
		}
	}

	.squiggle-container-3 {
		-webkit-transform: translateY(15px);
		transform: translateY(15px);
	}

	.squiggle-container-3 .squiggle {
		-webkit-animation: move-and-fade 5s linear infinite;
		animation: move-and-fade 5s linear infinite;
		-webkit-animation-delay: 0.4s;
		animation-delay: 0.4s;
		width: 4px;
	}

	@keyframes move-and-fade {
		0% {
			opacity: 0;
			-webkit-transform: translateY(0);
			transform: translateY(0);
		}
		50% {
			opacity: 1;
		}
		75% {
			opacity: 0;
		}
		100% {
			-webkit-transform: translateY(-15px);
			transform: translateY(-15px);
			opacity: 0;
		}
	}

	.squiggle {
		stroke-dasharray: 100;
	}

	.squiggle path {
		stroke: #5d5d5d;
	}

	@-webkit-keyframes dash {
		0% {
			stroke-dashoffset: 1000;
		}
		50% {
			stroke-dashoffset: 500;
		}
		100% {
			stroke-dashoffset: 0;
		}
	}

	@keyframes dash {
		0% {
			stroke-dashoffset: 1000;
		}
		50% {
			stroke-dashoffset: 500;
		}
		100% {
			stroke-dashoffset: 0;
		}
	}

	/* END coffee pot */
	/*# sourceMappingURL=App.css.map */
</style>
