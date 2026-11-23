import { catalogRequest } from "./catalog-storage";

export type EpisodeParticipant = {name:string;role:string};
export type Episode = {
  id: string;
  title: string;
  youtubeId: string;
  format: "podcast" | "video";
  description: string;
  participants: string;
  participantEntries: EpisodeParticipant[];
  extraRecipes: string[];
  extraIngredients: string[];
  duration: string;
  chapters: {title: string; start: number}[];
  transcript: string;
  date: string;
  municipality: string;
  municipalityCode: string;
  recipeIds: string[];
  ingredientIds: string[];
  status: "draft" | "published";
  updatedAt: string;
  publishedAt?: string;
  links?: {label:string;url:string}[];
  audio?: {id:string;name:string;url:string;type:string;size:number;caption?:string}[];
};

export const blankEpisode = (): Episode => ({
  id: "", title: "", youtubeId: "", format: "podcast", description: "",
  participants: "", participantEntries: [], extraRecipes: [], extraIngredients: [], duration: "", chapters: [], transcript: "", date: "", municipality: "", municipalityCode: "", recipeIds: [], ingredientIds: [],
  status: "draft", updatedAt: "",
});

// Accept video links only, and construct embed URLs from the validated ID.
export function youtubeVideoId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split("/")[2];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function episodeParticipants(episode:Episode): EpisodeParticipant[] {
  return episode.participantEntries.length?episode.participantEntries:episode.participants.split(/[;\n]+/).filter(name=>name.trim()).map(value=>{const [name,...role]=value.split("·");return {name:name.trim(),role:role.join("·").trim()};});
}
export function parseEpisodeTime(value: string): number | null {
  const parts=value.trim().split(":");
  if(parts.length<2||parts.length>3||parts.some(part=>!/^\d+$/.test(part)))return null;
  const numbers=parts.map(Number);
  if(numbers.at(-1)!>=60||(numbers.length===3&&numbers[1]>=60))return null;
  const seconds=numbers.reduce((total,number)=>total*60+number,0);
  return Number.isSafeInteger(seconds)&&seconds>=0&&seconds<=86400?seconds:null;
}
export function formatEpisodeTime(seconds: number): string {
  const safe=Math.max(0,Math.trunc(seconds));
  const hours=Math.floor(safe/3600),minutes=Math.floor(safe%3600/60),remaining=safe%60;
  return hours?`${hours}:${String(minutes).padStart(2,"0")}:${String(remaining).padStart(2,"0")}`:`${String(minutes).padStart(2,"0")}:${String(remaining).padStart(2,"0")}`;
}
export function validateEpisodeExtras(episode: Pick<Episode,"duration"|"chapters">): void {
  const duration=episode.duration.trim()?parseEpisodeTime(episode.duration):null;
  if(episode.duration.trim()&&(duration===null||duration===0))throw new Error("Escribe la duración en formato mm:ss o hh:mm:ss.");
  if(episode.chapters.length>50)throw new Error("Puedes registrar hasta 50 capítulos por episodio.");
  const starts=new Set<number>();
  for(const chapter of episode.chapters){
    if(!chapter.title.trim()||chapter.title.length>250||!Number.isSafeInteger(chapter.start)||chapter.start<0||chapter.start>86400)throw new Error("Completa el título y el minuto de cada capítulo.");
    if(starts.has(chapter.start))throw new Error("Dos capítulos no pueden comenzar en el mismo momento.");
    if(duration!==null&&chapter.start>=duration)throw new Error("Los capítulos deben comenzar antes de que termine el episodio.");
    starts.add(chapter.start);
  }
}

export const podcastStorageKey = "observatorio-podcast-v1";
let cache:Episode[]=[];
export function readEpisodes():Episode[]{return cache}
export async function loadEpisodes():Promise<Episode[]>{
  const {records}=await catalogRequest<{records:Episode[]}>("episodes");
  cache=records.map(item=>({...blankEpisode(),...item}));return cache;
}
export async function saveEpisode(episode:Episode):Promise<Episode>{
  if(cache.some(item=>item.youtubeId===episode.youtubeId&&item.id!==episode.id))throw new Error("Este video ya está registrado. Abre su ficha para editarlo.");
  const exists=cache.some(item=>item.id===episode.id);
  const {record}=await catalogRequest<{record:Episode}>("episodes",exists?episode.id:undefined,exists?"PUT":"POST",episode);
  const saved={...blankEpisode(),...record};cache=[saved,...cache.filter(item=>item.id!==saved.id)];return saved;
}
export async function deleteEpisode(id:string):Promise<Episode>{
  const episode=cache.find(item=>item.id===id);
  if(!episode)throw new Error("No encontramos este episodio. Recarga el catálogo.");
  await catalogRequest("episodes",id,"DELETE");cache=cache.filter(item=>item.id!==id);return episode;
}
