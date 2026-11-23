"use client";
/* eslint-disable @next/next/no-img-element -- Miniaturas externas servidas por YouTube. */
import {useEffect,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {useParams,useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,CalendarDays,ExternalLink,MapPin,Mic2,MoreHorizontal,Pencil,Play,Plus,Search,Trash2,Users,Clock3,RotateCcw,FileText,Layers,ListChecks,Leaf,ClipboardList} from 'lucide-react';
import {toast} from 'sonner';
import {useSessionUser} from '@/components/auth/session-provider';
import {ObservatorySidebar} from '@/components/dashboard/observatory-sidebar';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {AlertDialog,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {episodeParticipants,loadEpisodes,blankEpisode,deleteEpisode,readEpisodes,saveEpisode,youtubeVideoId,formatEpisodeTime,parseEpisodeTime,type Episode} from '@/data/podcasts';
import {loadRecipes} from '@/data/recipe-storage';
import {loadIngredients} from '@/data/ingredient-storage';
import {MunicipalityField,normalizeText} from '@/modules/recipes/recipe-form-controls';
import styles from './podcast.module.css';
import {YouTubePreview} from './youtube-preview';
import {getMunicipalityRegion} from '@/data/puebla-regions';

type Related = {id: string; name: string};
function usePodcastData() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [recipes, setRecipes] = useState<Related[]>([]);
  const [ingredients, setIngredients] = useState<Related[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadEpisodes(),loadIngredients()]).then(([records,related])=>{if(!cancelled){setEpisodes(records);setIngredients(related)}}).catch(cause=>{if(!cancelled)setError(cause instanceof Error?cause.message:"No se pudo abrir el catálogo. Recarga la página para volver a intentarlo.")}).finally(()=>{if(!cancelled)setLoaded(true)});
    loadRecipes().then(items => { if (!cancelled) setRecipes(items); }).catch(() => {
      if (!cancelled) toast.error("No se pudo cargar el catálogo de recetas relacionadas.");
    });
    return () => { cancelled = true; };
  }, []);
  return {episodes, setEpisodes, recipes, ingredients, loaded, error};
}
function Shell({children,editorial=false}:{children:ReactNode;editorial?:boolean}){
 if(!editorial)return <div className="acervo-page min-h-screen text-[#173257]"><ObservatorySidebar activeItem="Podcast"/><main className="admin-main"><div className="mx-auto max-w-[1360px]">{children}</div></main></div>;
 return <div className={`${styles.shell} acervo-page min-h-screen text-[#173257]`}><ObservatorySidebar activeItem="Podcast"/><main className={`admin-main ${styles.main}`}><div className={styles.container}>{children}</div></main></div>;
}
function dateLabel(value:string){const date=value?new Date(`${value}T12:00:00`):null;return date&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat('es-MX',{dateStyle:'long'}).format(date):'';}
function Thumbnail({episode,classic=false}:{episode:Episode;classic?:boolean}){
 const [failed,setFailed]=useState(false);
 if(classic)return <div className="podcast-thumbnail">{failed?<Mic2 className="podcast-cover-fallback" aria-hidden="true"/>:<img src={`https://i.ytimg.com/vi/${episode.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" onLoad={event=>{if(event.currentTarget.naturalWidth<=120)setFailed(true);}} onError={()=>setFailed(true)}/>}<span className="podcast-play-overlay"><span><Play className="size-5" fill="currentColor" aria-hidden="true"/></span></span></div>;
 return <div className={styles.thumbnail}>{failed?<div className={styles.coverFallback}><Mic2 size={38}/><span>VOCES DE PUEBLA</span></div>:<img src={`https://i.ytimg.com/vi/${episode.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" onLoad={event=>{if(event.currentTarget.naturalWidth<=120)setFailed(true);}} onError={()=>setFailed(true)}/>}<span className={styles.coverPlay}><Play size={18} fill="currentColor"/></span>{episode.duration&&<span className={styles.coverDuration}>{episode.duration}</span>}</div>;
}
function EpisodeActions({episode,onEdit,onDraft,onDelete}:{episode:Episode;onEdit:()=>void;onDraft:()=>void;onDelete:()=>void}){
 const user=useSessionUser();
 const canPublish=user?.role==='administrador'||user?.role==='revisor';
 return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="podcast-options-button" aria-label={`Opciones de ${episode.title}`}><MoreHorizontal size={19}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="rounded-lg p-1.5"><DropdownMenuItem onSelect={onEdit}><Pencil className="size-4"/>Editar episodio</DropdownMenuItem><DropdownMenuItem asChild><a href={`https://www.youtube.com/watch?v=${episode.youtubeId}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4"/>Ver en YouTube</a></DropdownMenuItem>{canPublish&&episode.status==='published'&&<DropdownMenuItem onSelect={onDraft}>Pasar a borrador</DropdownMenuItem>}{canPublish&&<DropdownMenuItem onSelect={onDelete} className="mt-1 gap-2 border-t pt-2 text-[#ad5542] focus:bg-red-50"><Trash2 className="size-4"/>Eliminar episodio</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>;
}
export function EpisodeCard({episode,onEdit,onDraft,onDelete}:{episode:Episode;onEdit:()=>void;onDraft:()=>void;onDelete:()=>void}){
 const date=episode.date?new Date(`${episode.date}T12:00:00`):null;
 const formatted=date&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium'}).format(date):'';
 return <article className="podcast-episode-card" aria-labelledby={`episode-title-${episode.id}`}>
  <Link href={`/podcast/${episode.id}`} className="podcast-cover-link" aria-label={`Abrir reproductor de ${episode.title}`}><Thumbnail key={episode.youtubeId} episode={episode} classic/></Link>
  <div className="podcast-episode-content"><div className="podcast-episode-topline"><span className="podcast-format-label">{episode.format==='podcast'?<Mic2 className="size-3.5"/>:<Play className="size-3.5"/>}{episode.format==='podcast'?'Podcast':'Video'}</span><div className="flex items-center gap-2"><span className={`recipe-status ${episode.status==='published'?'status-verified':'status-draft'}`}>{episode.status==='published'?'Publicado':'Borrador'}</span><EpisodeActions episode={episode} onEdit={onEdit} onDraft={onDraft} onDelete={onDelete}/></div></div>
   <h2 id={`episode-title-${episode.id}`} className="podcast-episode-title"><Link href={`/podcast/${episode.id}`}>{episode.title}</Link></h2>
   {episode.description.trim()&&<p className="podcast-episode-description">{episode.description}</p>}
   {(episode.participants.trim()||episode.municipality)&&<div className="podcast-episode-metadata">{episode.participants.trim()&&<span title={episode.participants}><Users className="size-3.5" aria-hidden="true"/>Con {episode.participants}</span>}{episode.municipality&&<span><MapPin className="size-3.5" aria-hidden="true"/>{episode.municipality}</span>}</div>}
   <div className="podcast-episode-footer">{formatted&&<time dateTime={episode.date}><CalendarDays className="size-3.5" aria-hidden="true"/>{formatted}</time>}<Link href={`/podcast/${episode.id}`} aria-label={`Abrir episodio: ${episode.title}`}>Abrir episodio<ArrowRight className="size-3.5"/></Link></div>
  </div>
 </article>;
}
export function PodcastManager(){
 const {episodes,setEpisodes,recipes,ingredients,loaded,error}=usePodcastData();
 const [filter,setFilter]=useState<'all'|Episode['status']>('all');
 const [search,setSearch]=useState('');
 const [open,setOpen]=useState(false);
 const [editing,setEditing]=useState<Episode|null>(null);
 const [pendingDelete,setPendingDelete]=useState<Episode|null>(null);
 const router=useRouter();
 const addEpisode=()=>{setEditing(null);setOpen(true);};
 const confirmDelete=async()=>{
  if(!pendingDelete)return;
  try{const removed=await deleteEpisode(pendingDelete.id);setEpisodes(readEpisodes());setPendingDelete(null);toast.success('Episodio eliminado',{duration:8000,action:{label:'Deshacer',onClick:async()=>{try{await saveEpisode(removed);setEpisodes(readEpisodes());toast.success('Episodio restaurado');}catch(cause){toast.error(cause instanceof Error?cause.message:'No se pudo restaurar el episodio.');}}}});}
  catch(cause){toast.error(cause instanceof Error?cause.message:'No se pudo eliminar el episodio.');}
 };
 const moveToDraft=async(episode:Episode)=>{try{await saveEpisode({...episode,status:'draft'});setEpisodes(readEpisodes());toast.success('Episodio guardado como borrador');}catch(cause){toast.error(cause instanceof Error?cause.message:'No se pudo actualizar el episodio.');}};
 const filters=[{key:'all',label:'Todos',count:episodes.length},{key:'draft',label:'Borradores',count:episodes.filter(e=>e.status==='draft').length},{key:'published',label:'Publicados',count:episodes.filter(e=>e.status==='published').length}] as const;
 const visible=episodes.filter(e=>(filter==='all'||e.status===filter)&&normalizeText(`${e.title} ${e.description} ${e.participants} ${e.municipality} ${e.format}`).includes(normalizeText(search)));
 return <Shell>
  <header className="acervo-heading"><div><h1>Podcast</h1><p>Conversaciones, historias y videos del patrimonio gastronómico de Puebla.</p></div><button className="acervo-primary" disabled={!loaded||!!error} onClick={addEpisode}><Plus className="size-4"/>Añadir episodio</button></header>
  {error&&<p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm">{error}</p>}
  <section aria-label="Catálogo de episodios" className="acervo-card podcast-catalog mt-6 overflow-hidden">
   <div className="recipe-catalog-toolbar"><div className="recipe-catalog-filters" role="group" aria-label="Filtrar episodios por estado">{filters.map(item=><button key={item.key} className={`recipe-catalog-filter ${filter===item.key?'is-active':''}`} aria-pressed={filter===item.key} onClick={()=>setFilter(item.key)}>{item.label}<span className="recipe-catalog-count">{loaded?item.count:'—'}</span></button>)}</div><div className="relative w-full sm:w-[320px]"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-[#8a97a9]"/><input className="acervo-input h-10 w-full !pl-10" aria-label="Buscar episodios" placeholder="Buscar episodio o participante…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
   {!loaded?<p role="status" className="p-12 text-center text-sm text-[#8190a4]">Cargando episodios…</p>:!visible.length?<div className="px-6 py-16 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf7fa] text-[#1684a5]"><Mic2 className="size-6"/></span><h2 className="mt-4 text-lg font-semibold">{episodes.length?'No encontramos episodios':'Tu próxima historia empieza aquí'}</h2><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[#8190a4]">{episodes.length?'Prueba otra búsqueda o cambia el estado seleccionado.':'Sube tu contenido a YouTube y añade el enlace para crear su ficha en el observatorio.'}</p>{!episodes.length&&!error&&<button className="acervo-primary mt-5" onClick={addEpisode}><Plus className="size-4"/>Añadir primer episodio</button>}</div>:<div className="podcast-episode-list">{visible.map(episode=><EpisodeCard key={episode.id} episode={episode} onEdit={()=>{setEditing(episode);setOpen(true);}} onDraft={()=>moveToDraft(episode)} onDelete={()=>setPendingDelete(episode)}/>)}</div>}
  </section>
  <AlertDialog open={!!pendingDelete} onOpenChange={value=>{if(!value)setPendingDelete(null);}}><AlertDialogContent className="rounded-xl"><AlertDialogHeader><AlertDialogTitle>¿Eliminar episodio?</AlertDialogTitle><AlertDialogDescription>«{pendingDelete?.title}» dejará de aparecer en el catálogo del observatorio. El video seguirá disponible en YouTube.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><button type="button" onClick={confirmDelete} className={styles.dangerButton}><Trash2 size={15}/>Eliminar episodio</button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  <EpisodeForm key={open?`form-${editing?.id??'new'}`:'closed'} open={open} onOpenChange={setOpen} initial={editing??blankEpisode()} recipes={recipes} ingredients={ingredients} onSaved={saved=>{setEpisodes(readEpisodes());setOpen(false);if(!editing)router.push(`/podcast/${saved.id}`);}}/>
 </Shell>;
}
export function PodcastDetail(){
 const {id}=useParams<{id:string}>();
 const {episodes,setEpisodes,recipes,ingredients,loaded,error}=usePodcastData();
 const [edit,setEdit]=useState(false);
 const [seek,setSeek]=useState({source:'',start:0,version:0});
 const episode=episodes.find(e=>e.id===id);
 if(!loaded)return <Shell editorial><p role="status" className={styles.loading}>Cargando episodio…</p></Shell>;
 if(error||!episode)return <Shell editorial><Link href="/podcast" className={styles.back}><ArrowLeft size={14}/>Volver a Podcast</Link><p role="alert" className={styles.error}>{error||'No encontramos este episodio.'}</p></Shell>;
 const source=`${episode.id}:${episode.youtubeId}`;
 const start=seek.source===source?seek.start:0;
 const shareUrl=`https://www.youtube.com/watch?v=${episode.youtubeId}`;
 const playAt=(seconds:number)=>setSeek(current=>({source,start:seconds,version:current.version+1}));
 const more=episodes.filter(item=>item.id!==episode.id&&item.status==='published').slice(0,3);
 const participants=episodeParticipants(episode);
 const region=getMunicipalityRegion(episode.municipalityCode);
 const linkedIngredients=ingredients.filter(item=>episode.ingredientIds.includes(item.id));
 const linkedRecipes=recipes.filter(item=>episode.recipeIds.includes(item.id));
 const durationSeconds=episode.duration?parseEpisodeTime(episode.duration):null;
 const hasIngredients=linkedIngredients.length>0||episode.extraIngredients.length>0;
 const hasRecipes=linkedRecipes.length>0||episode.extraRecipes.length>0;
 const hasFacts=Boolean(durationSeconds||episode.date||participants.length||episode.municipality||hasIngredients||hasRecipes);
 const durationLabel=durationSeconds===null?'':`${Math.floor(durationSeconds/60)} min${durationSeconds%60?` ${durationSeconds%60} seg`:''}`;
 return <Shell editorial>
  <div className={styles.detailTop}><Link href="/podcast" className={styles.back}><ArrowLeft size={14}/>Todas las conversaciones</Link><div className={styles.actions}><button type="button" onClick={()=>setEdit(true)}><Pencil size={14}/>Editar episodio</button></div></div>
  <header className={styles.detailHeading}><h1>{episode.title}</h1></header>
  <div className={`${styles.detailGrid} ${!hasFacts?styles.withoutFacts:''}`}>
   <div className={styles.detailMain}>
    <section className={styles.player} aria-label="Reproductor del episodio">{seek.source!==source?<button type="button" className={styles.playerPoster} aria-label={`Reproducir episodio: ${episode.title}`} onClick={()=>playAt(0)}><Thumbnail key={episode.youtubeId} episode={episode}/><span className={styles.posterCaption}>Reproducir episodio</span></button>:<iframe key={`${source}-${seek.version}`} src={`https://www.youtube-nocookie.com/embed/${episode.youtubeId}?rel=0&start=${start}&autoplay=${seek.source===source?1:0}`} title={`Reproducir ${episode.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>}<div className={styles.playerBar}><span><Play size={12}/>Reproductor de YouTube</span><button type="button" onClick={()=>playAt(0)}><RotateCcw size={12}/>Reiniciar</button><a href={shareUrl} target="_blank" rel="noopener noreferrer">Abrir en YouTube<ExternalLink size={12}/></a></div></section>
    <p className={styles.playerHelp}>Si el video no permite su reproducción aquí, puedes abrirlo en YouTube.</p>
    {episode.chapters.length>0&&<section className={styles.chapters}><div className={styles.sectionRule}><h2><ListChecks size={18}/>Capítulos y momentos clave</h2><span>Ir al minuto</span></div><ol>{episode.chapters.map(chapter=><li key={chapter.start}><button type="button" aria-pressed={seek.source===source&&start===chapter.start} onClick={()=>playAt(chapter.start)}><time>{formatEpisodeTime(chapter.start)}</time><span>{chapter.title}</span><Play size={12}/></button></li>)}</ol></section>}
    <article className={styles.notes}><div className={styles.sectionRule}><h2><FileText size={18}/>Notas del episodio</h2></div><div className={styles.notesBody}>{episode.description?episode.description.split(/\n\s*\n/).map((paragraph,index)=><p key={index}>{paragraph.split(/(\*\*[^*]+\*\*)/g).map((part,i)=>part.startsWith("**")&&part.endsWith("**")?<strong key={i}>{part.slice(2,-2)}</strong>:part)}</p>):<p className={styles.muted}>Todavía no se ha añadido una descripción.</p>}</div>{episode.transcript&&<details className={styles.transcription}><summary><FileText size={14}/>Leer transcripción</summary><p>{episode.transcript}</p></details>}{episode.transcript&&<section className={styles.printTranscript}><h2>Transcripción</h2><p>{episode.transcript}</p></section>}</article>
   </div>
   <aside className={styles.sidebar}>
    {hasFacts&&<section className={styles.factSheet} aria-labelledby="episode-facts-title">
     <div className={styles.factHeader}><ClipboardList size={19}/><h2 id="episode-facts-title">Ficha técnica del episodio</h2></div>
     <div className={styles.factBody}>
      {(durationSeconds||episode.date)&&<dl className={styles.statGrid}>{durationSeconds!==null&&<div><dt><Clock3 size={14}/>Duración</dt><dd>{durationLabel}</dd></div>}{episode.date&&<div><dt><CalendarDays size={14}/>Fecha de emisión</dt><dd>{dateLabel(episode.date)}</dd></div>}</dl>}
      {participants.length>0&&<section className={styles.factSection}><h3>Participantes en cabina<Users size={16}/></h3>{participants.map((person,index)=><div className={styles.person} key={`${person.name}-${index}`}><span className={styles.avatar} aria-hidden="true">{person.name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toLocaleUpperCase('es-MX')}</span><span><strong>{person.name}</strong>{person.role&&<small>{person.role}</small>}</span></div>)}</section>}
      {episode.municipality&&<section className={styles.factSection}><h3>Territorio y municipio destacado</h3><div className={styles.territory}><span className={styles.mapIcon}><MapPin size={20}/></span><div><strong>{episode.municipality}, Puebla</strong>{region&&<span>Región {region}</span>}</div></div></section>}
      {hasIngredients&&<section className={styles.factSection}><h3><Leaf size={16}/>Ingredientes vinculados</h3><div className={styles.tags}>{linkedIngredients.map(item=><span key={item.id}>{item.name}</span>)}{episode.extraIngredients.map(name=><span key={name}>{name}</span>)}</div></section>}
      {hasRecipes&&<section className={styles.factSection}><h3>Recetas relacionadas</h3><div className={styles.tags}>{linkedRecipes.map(item=><span key={item.id}>{item.name}</span>)}{episode.extraRecipes.map(name=><span key={name}>{name}</span>)}</div></section>}
     </div>
    </section>}
    <section className={styles.related}><div className={styles.sectionRule}><h2><Layers size={17}/>Otros episodios de la serie</h2></div>{more.length?more.map(item=><Link key={item.id} href={`/podcast/${item.id}`}><Thumbnail key={item.youtubeId} episode={item}/><span><strong>{item.title}</strong>{(item.municipality||item.duration)&&<small>{[item.municipality,item.duration].filter(Boolean).join(' · ')}</small>}</span><ArrowRight size={14}/></Link>):<p className={styles.muted}>Aún no hay otros episodios publicados.</p>}</section>
   </aside>
  </div>
  <EpisodeForm key={edit?episode.updatedAt:'closed'} open={edit} onOpenChange={setEdit} initial={episode} recipes={recipes} ingredients={ingredients} onSaved={()=>{setEpisodes(readEpisodes());setEdit(false);}}/>
 </Shell>;
}

function Field({label, id, children}: {label:string; id:string; children:ReactNode}) {
  return <div><label className="acervo-label" htmlFor={id}>{label}</label>{children}</div>;
}
function EpisodeForm({open, onOpenChange, initial, recipes, ingredients, onSaved}: {open:boolean; onOpenChange:(open:boolean)=>void; initial:Episode; recipes:Related[]; ingredients:Related[]; onSaved:(episode:Episode)=>void}) {
  const [form, setForm] = useState(()=>({...initial,participantEntries:episodeParticipants(initial)}));
  const [url, setUrl] = useState(initial.youtubeId ? `https://www.youtube.com/watch?v=${initial.youtubeId}` : "");
  const [error, setError] = useState("");
  const [chapters,setChapters]=useState(initial.chapters.map(chapter=>({title:chapter.title,time:formatEpisodeTime(chapter.start)})));
  const videoId = youtubeVideoId(url);
  const update = <K extends keyof Episode>(key:K, value:Episode[K]) => setForm(current => ({...current, [key]:value}));
  const user=useSessionUser();
  const canPublish=user?.role==="administrador"||user?.role==="revisor";
  const [busy,setBusy]=useState(false);
  const submit = async (status:Episode["status"]) => {
    if(busy||status==="published"&&!canPublish)return;
    if (!videoId) {setError("Pega un enlace válido a un video de YouTube; las listas de reproducción no identifican un episodio."); return;}
    if (!form.title.trim()) {setError("Escribe un título para el episodio."); return;}
    if (!form.format) {setError("Selecciona el formato del episodio."); return;}
    if (!form.description.trim()) {setError("Añade una descripción del episodio."); return;}
    setBusy(true);
    try {
      const parsedChapters=chapters.map(chapter=>{
        const start=parseEpisodeTime(chapter.time);
        if(start===null||!chapter.title.trim())throw new Error("Completa el título y el minuto de cada capítulo (mm:ss o hh:mm:ss).");
        return {title:chapter.title.trim(),start};
      });
      const saved = await saveEpisode({...form, title:form.title.trim(), participants:form.participantEntries.map(person=>[person.name.trim(),person.role.trim()].filter(Boolean).join(" · ")).join("; "), youtubeId:videoId, chapters:parsedChapters, status}); onSaved(saved); toast.success(status === "published" ? "Episodio publicado" : "Borrador guardado");}
    catch (cause) {setError(cause instanceof Error ? cause.message : "No se pudo guardar el episodio.");}
    finally{setBusy(false);}
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="recipe-create-dialog max-h-[90dvh] overflow-y-auto rounded-[24px] bg-white p-6 sm:max-w-[720px] sm:p-8"><DialogHeader className="text-left"><DialogTitle className="text-2xl text-[#173257]">{initial.id ? "Editar episodio" : "Añadir episodio"}</DialogTitle><DialogDescription>Vincula un video de YouTube y completa su ficha en el observatorio.</DialogDescription></DialogHeader><form className="mt-4 space-y-5" onSubmit={e => {e.preventDefault(); void submit(canPublish?"published":"draft");}}>
    <Field label="Enlace de YouTube *" id="podcast-url"><input id="podcast-url" required type="url" value={url} onChange={e => {const next=e.target.value;if(youtubeVideoId(next)!==videoId)update("duration","");setUrl(next);}} placeholder="https://www.youtube.com/watch?v=…" className="acervo-input w-full"/><p className="mt-2 text-[11px] leading-5 text-[#8190a4]">Sube primero el contenido a YouTube. Para reproducirlo aquí, permite su inserción y usa un video público o no listado.</p>{url && <p className={`mt-2 text-xs ${videoId ? "text-[#1684a5]" : "text-[#b65765]"}`}>{videoId ? "Enlace reconocido. Comprueba la disponibilidad en la vista previa." : "Introduce el enlace de un video, Short o transmisión de YouTube."}</p>}</Field>
    {open&&videoId&&<YouTubePreview key={videoId} videoId={videoId} onDuration={duration=>setForm(current=>current.duration?current:{...current,duration})}/>}
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Título del episodio *" id="podcast-title"><input id="podcast-title" required maxLength={200} value={form.title} onChange={e => update("title",e.target.value)} className="acervo-input w-full" placeholder="Ej. Los saberes detrás del mole"/></Field><Field label="Formato *" id="podcast-format"><select required id="podcast-format" value={form.format} onChange={e => update("format", e.target.value as Episode["format"])} className="acervo-input w-full"><option value="" disabled>Selecciona un formato</option><option value="podcast">Podcast</option><option value="video">Video</option></select></Field></div>
    <Field label="Descripción *" id="podcast-description"><textarea required id="podcast-description" rows={4} value={form.description} onChange={e => update("description",e.target.value)} className="acervo-input w-full" placeholder="¿Qué historia, preparación o saber se comparte?"/></Field>
    <section className={styles.participantEditor} aria-labelledby="podcast-participants-heading"><div className={styles.editorHeading}><h3 id="podcast-participants-heading">Participantes</h3><button type="button" className={styles.addRow} onClick={()=>update("participantEntries",[...form.participantEntries,{name:"",role:""}])}><Plus size={14}/>Añadir participante</button></div><p className={styles.formHint}>Nombre y puesto de cada persona.</p>{form.participantEntries.map((person,index)=><div className={styles.participantRow} key={index}><Field label="Nombre *" id={`person-name-${index}`}><input required id={`person-name-${index}`} maxLength={150} value={person.name} onChange={e=>update("participantEntries",form.participantEntries.map((item,i)=>i===index?{...item,name:e.target.value}:item))} placeholder="Nombre completo" className="acervo-input w-full"/></Field><Field label="Puesto *" id={`person-role-${index}`}><select required id={`person-role-${index}`} value={person.role} onChange={e=>update("participantEntries",form.participantEntries.map((item,i)=>i===index?{...item,role:e.target.value}:item))} className="acervo-input w-full"><option value="" disabled>Selecciona un puesto</option>{[...new Set(["Conductor/a","Investigador/a","Cocinero/a tradicional","Chef","Productor/a","Cronista","Promotor/a cultural","Invitado/a",...(person.role?[person.role]:[])])].map(role=><option key={role} value={role}>{role}</option>)}</select></Field><button type="button" className={styles.removeRow} aria-label={`Quitar participante ${index+1}`} onClick={()=>update("participantEntries",form.participantEntries.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></div>)}</section>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Fecha de emisión" id="podcast-date"><input id="podcast-date" type="date" value={form.date} onChange={e=>update("date",e.target.value)} className="acervo-input w-full"/></Field><Field label="Duración" id="podcast-duration"><input id="podcast-duration" value={form.duration} onChange={e=>update("duration",e.target.value)} placeholder="mm:ss o hh:mm:ss" className="acervo-input w-full"/><p className={styles.formHint}>Se completa desde la vista previa cuando YouTube proporciona la duración. Puedes ajustarla manualmente.</p></Field></div>
    <Field label="Municipio relacionado (opcional)" id="podcast-municipality"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><MunicipalityField id="podcast-municipality" value={form.municipalityCode} onChange={item => setForm(current => ({...current, municipality:item?.name ?? "", municipalityCode:item?.code ?? ""}))}/></div>{(form.municipalityCode||form.municipality)&&<button type="button" className="shrink-0 rounded-lg px-2 py-2 text-xs text-[#8190a4] hover:bg-[#edf7fa] hover:text-[#1684a5]" onClick={()=>setForm(current=>({...current,municipality:"",municipalityCode:""}))}>Quitar municipio</button>}</div></Field>
    <div className="grid gap-5 sm:grid-cols-2">{[{label:"Recetas relacionadas",items:recipes,key:"recipeIds" as const,extra:"extraRecipes" as const,singular:"receta"},{label:"Ingredientes relacionados",items:ingredients,key:"ingredientIds" as const,extra:"extraIngredients" as const,singular:"ingrediente"}].map(group=><fieldset key={group.key}><legend className="acervo-label">{group.label}</legend><div className="max-h-36 space-y-2 overflow-y-auto rounded-xl border border-[#e5eaf0] p-3">{group.items.length?group.items.map(item=><label key={item.id} className="flex items-start gap-2 text-xs leading-5 text-[#627187]"><input type="checkbox" className="mt-1 accent-[#1684a5]" checked={form[group.key].includes(item.id)} onChange={e=>update(group.key,e.target.checked?[...form[group.key],item.id]:form[group.key].filter(id=>id!==item.id))}/>{item.name}</label>):<p className="text-xs text-[#8190a4]">No hay registros disponibles.</p>}</div>{form[group.extra].map((name,index)=><div key={index} className={styles.extraRow}><input required aria-label={`Nombre de ${group.singular} adicional ${index+1}`} maxLength={150} className="acervo-input w-full" placeholder={`Nombre de ${group.singular}`} value={name} onChange={e=>update(group.extra,form[group.extra].map((item,i)=>i===index?e.target.value:item))}/><button type="button" className={styles.removeRow} aria-label={`Quitar ${group.singular} adicional ${index+1}`} onClick={()=>update(group.extra,form[group.extra].filter((_,i)=>i!==index))}><Trash2 size={14}/></button></div>)}<button type="button" className={styles.addRow} onClick={()=>update(group.extra,[...form[group.extra],""])}><Plus size={14}/>Añadir {group.singular}</button><p className={styles.formHint}>Los nombres añadidos aquí pertenecen solo a este episodio y no crean fichas en el acervo.</p></fieldset>)}</div>
    <details className={styles.additionalFields}><summary>Detalles adicionales<span>Capítulos y momentos clave</span></summary><div className="mt-5 space-y-5">
    <section className={styles.chapterEditor} aria-labelledby="podcast-chapters-heading"><div className={styles.editorHeading}><h3 id="podcast-chapters-heading">Capítulos y momentos clave <span>Opcional</span></h3><button type="button" className={styles.addRow} disabled={chapters.length>=50} onClick={()=>setChapters(current=>[...current,{title:"",time:""}])}><Plus size={14}/>Añadir capítulo</button></div><p className={styles.formHint}>Título y minuto de inicio de cada momento.</p>{chapters.map((chapter,index)=><div className={styles.chapterFields} key={index}><label><span>Minuto</span><input aria-label={`Minuto del capítulo ${index+1}`} placeholder="00:00" value={chapter.time} onChange={e=>setChapters(current=>current.map((item,i)=>i===index?{...item,time:e.target.value}:item))} className="acervo-input w-full"/></label><label><span>Título del capítulo</span><input aria-label={`Título del capítulo ${index+1}`} maxLength={250} placeholder="Tema de la conversación" value={chapter.title} onChange={e=>setChapters(current=>current.map((item,i)=>i===index?{...item,title:e.target.value}:item))} className="acervo-input w-full"/></label><button type="button" aria-label={`Quitar capítulo ${index+1}`} onClick={()=>setChapters(current=>current.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></div>)}</section>
    </div></details>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-5"><button type="button" className="acervo-secondary mr-auto" onClick={() => onOpenChange(false)}>Cancelar</button><button type="button" className="acervo-secondary" disabled={busy} onClick={() => void submit("draft")}>{initial.status === "published" ? "Pasar a borrador" : "Guardar borrador"}</button>{canPublish&&<button type="submit" disabled={busy} className="acervo-primary">{initial.status === "published" ? "Guardar cambios" : "Publicar episodio"}</button>}</div>
  </form></DialogContent></Dialog>;
}
