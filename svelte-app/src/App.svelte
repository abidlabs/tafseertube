<script>
  	import { afterUpdate } from 'svelte';
	
	const surahs = [
	  {name: 'Al-Fatiha', ayahs: 7 },
	  {name: 'Al-Baqarah', ayahs: 286 },
	  // Add more Surahs here
	];
  
	let selectedSurah;
	let selectedAyah;
  
	$: {
		const queryParams = new URLSearchParams(window.location.search);
		selectedSurah = parseInt(queryParams.get('surah'))-1 || 0;
		selectedAyah = parseInt(queryParams.get('ayah'))-1 || 0;
	}

	function onSurahChange(event) {
	  selectedAyah = 0;
	}

	function updateQueryParams() {
		const queryParams = new URLSearchParams();
		queryParams.set('surah', selectedSurah+1);
		queryParams.set('ayah', selectedAyah+1);
		const newUrl = `${window.location.pathname}?${queryParams.toString()}`;
		window.history.replaceState(null, null, newUrl);
  	}
	
	afterUpdate(updateQueryParams);
  </script>
  
  <main>
	<div class="sidebar">
		<h2>Tafseer Tube</h2>
	  <select bind:value={selectedSurah} on:change={onSurahChange}>
		{#each surahs as surah, i}
		  <option value={i}>{i+1}. {surah.name}</option>
		{/each}
	  </select>
	  <select bind:value={selectedAyah}>
		{#if selectedSurah !== ""}
		  {#each Array.from({ length: surahs[selectedSurah].ayahs }) as _, i}
			<option value={i}>Ayah {i + 1}</option>
		  {/each}
		{:else}
		  <option disabled value="">Select a Surah first</option>
		{/if}
	  </select>
	</div>
  
	<div class="content">
		<h1>Selected Surah: {surahs[selectedSurah].name}</h1>
		<h2>Selected Ayah: {selectedAyah + 1}</h2>
	</div>
  </main>
  
  <style>
	/* Add your custom styles here */
	main {
	  display: flex;
	  flex-direction: column;
	}
  
	.sidebar {
	  background-color: #f0f0f0;
	  padding: 20px;
	}
  
	.content {
	  padding: 20px;
	}
  </style>
  