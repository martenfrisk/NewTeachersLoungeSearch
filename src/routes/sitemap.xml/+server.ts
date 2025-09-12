import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import episodesData from '../../assets/episodes6.json';

interface Episode {
	ep: string;
	title: string;
	date?: string;
}

const baseUrl = dev ? 'http://localhost:5173' : 'https://seekerslounge.pcast.site';

export const GET: RequestHandler = async () => {
	const episodes: Episode[] = episodesData;

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
	<!-- Homepage -->
	<url>
		<loc>${baseUrl}/</loc>
		<lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
		<changefreq>daily</changefreq>
		<priority>1.0</priority>
	</url>
	
	<!-- Episodes Page -->
	<url>
		<loc>${baseUrl}/episodes</loc>
		<lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.8</priority>
	</url>
	
	<!-- Individual Episode Pages -->
	${episodes
		.map(
			(episode) => `
	<url>
		<loc>${baseUrl}/ep/${episode.ep}</loc>
		<lastmod>${episode.date ? new Date(episode.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
		<changefreq>monthly</changefreq>
		<priority>0.7</priority>
	</url>`
		)
		.join('')}
	
	<!-- Static Pages -->
	<url>
		<loc>${baseUrl}/login</loc>
		<lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
		<changefreq>yearly</changefreq>
		<priority>0.3</priority>
	</url>
</urlset>`.trim();

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600' // Cache for 1 hour
		}
	});
};

export const prerender = true;
