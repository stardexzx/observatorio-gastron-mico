"use client";

import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import {BookOpen,BookMarked,ChevronLeft,ChevronRight,Minus,Plus,File,LoaderCircle,RotateCcw,PanelLeft,X,ArrowLeft} from 'lucide-react';
import {ObservatorySidebar} from '@/components/dashboard/observatory-sidebar';
import {recipeBooks,type RecipeBook} from '@/data/team-recipe-books';
import {bookPages,bookSpread,turnBook} from '@/lib/book-navigation';
import styles from './team-recipe-book-reader.module.css';

export function RecipeBookReader({initialBookId=recipeBooks[0].id,books=recipeBooks}:{initialBookId?:string;books?:RecipeBook[]}){
 const bookId=initialBookId;
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 const [progress,setProgress]=useState(0);
 const [page,setPage]=useState(1);
 const [pageInput,setPageInput]=useState('1');
 const [zoom,setZoom]=useState(1);
 const [spread,setSpread]=useState(true);
 const [narrow,setNarrow]=useState(false);
 const [focus,setFocus]=useState(false);
 const [drawer,setDrawer]=useState(true);
 const [direction,setDirection]=useState(1);
 const [size,setSize]=useState({width:900,height:500});
 const root=useRef<HTMLDivElement>(null);
 const stage=useRef<HTMLDivElement>(null);
 const toolbar=useRef<HTMLDivElement>(null);
 const footer=useRef<HTMLElement>(null);
 const drawerBeforeFocus=useRef(true);
 const viewBeforeFocus=useRef({zoom:1,spread:true});
 const book=books.find(item=>item.id===bookId)??books[0];
 const total=pdf?.numPages??0;
 const double=spread&&!narrow;
 const visible=bookPages(page,total,double);
 const current=bookSpread(page,total,double);
 const previousDisabled=!pdf||current===1;
 const nextDisabled=!pdf||visible.at(-1)===total;

 useEffect(()=>{
  let cancelled=false;let destroy:(()=>void)|undefined;
  async function open(){
   setPdf(null);setError('');setProgress(0);setPage(1);setPageInput('1');
   try{
    const library=await import('pdfjs-dist');if(cancelled)return;
    const assets=`/pdfjs/${library.version}/`;
    library.GlobalWorkerOptions.workerSrc=`${assets}pdf.worker.min.mjs`;
    library.GlobalWorkerOptions.rendererSrc=`${assets}pdf.renderer.min.mjs`;
    const task=library.getDocument({url:`/api/admin/recetarios/${book.id}`,cMapUrl:`${assets}cmaps/`,cMapPacked:true,standardFontDataUrl:`${assets}standard_fonts/`,wasmUrl:`${assets}wasm/`,disableAutoFetch:true,disableStream:true,rangeChunkSize:262144});
    destroy=()=>{void task.destroy();};
    task.onProgress=({loaded,total:bytes}:{loaded:number;total:number})=>{if(!cancelled&&bytes)setProgress(Math.min(100,Math.round(loaded/bytes*100)));};
    const document=await task.promise;if(cancelled)return;setPdf(document);
   }catch{if(!cancelled)setError('No se pudo abrir el PDF. Vuelve a intentarlo.');}
  }
  void open();return()=>{cancelled=true;destroy?.();};
 },[book.id,attempt]);

 useEffect(()=>{
  const media=window.matchMedia('(max-width: 800px)');
  const update=()=>{setNarrow(media.matches);if(media.matches)setDrawer(false);};update();
  media.addEventListener('change',update);return()=>media.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  const element=stage.current;if(!element)return;
  const measure=()=>{
   const chrome=(toolbar.current?.offsetHeight??56)+(footer.current?.offsetHeight??64)+(focus?28:190);
   setSize({width:Math.max(200,element.clientWidth-(focus?(window.innerWidth<=800?80:160):window.innerWidth<=800?32:130)),height:Math.max(focus?180:420,window.innerHeight-(focus?chrome:280))});
  };
  const observer=new ResizeObserver(measure);observer.observe(element);
  window.addEventListener('resize',measure);measure();
  return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
 },[focus]);
 useEffect(()=>{
  if(!focus)return;
  const previous=document.body.style.overflow;
  const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const element=root.current;document.body.style.overflow='hidden';element?.focus();
  const trap=(event:KeyboardEvent)=>{
   if(event.key!=='Tab'||!element)return;
   const controls=Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')).filter(control=>control.getClientRects().length>0);
   const first=controls[0],last=controls.at(-1);
   if(event.shiftKey&&(document.activeElement===first||document.activeElement===element)){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===element)){event.preventDefault();first?.focus();}
  };
  element?.addEventListener('keydown',trap);
  return()=>{document.body.style.overflow=previous;element?.removeEventListener('keydown',trap);previousFocus?.focus();};
 },[focus]);

 const goTo=(number:number)=>{
  if(!total)return;
  const next=Math.trunc(Math.min(total,Math.max(1,number||1)));
  setDirection(next>=page?1:-1);setPage(next);setPageInput(String(next));
 };
 const move=(way:1|-1)=>{
  if(!total)return;
  setDirection(way);const next=turnBook(page,total,double,way);setPage(next);setPageInput(String(next));
 };
 const jump=(event:FormEvent)=>{event.preventDefault();goTo(Number(pageInput));};
 const exitFocus=()=>{setFocus(false);setDrawer(drawerBeforeFocus.current);setZoom(viewBeforeFocus.current.zoom);setSpread(viewBeforeFocus.current.spread);};
 const toggleFocus=()=>{if(focus){exitFocus();return;}drawerBeforeFocus.current=drawer;viewBeforeFocus.current={zoom,spread};setDrawer(false);setZoom(1);setSpread(true);setFocus(true);};


 return <div className={styles.shell}>
  <ObservatorySidebar activeItem="Recetario"/>
  <main className={`admin-main ${styles.main}`}>
   <div ref={root} className={`${styles.reader} ${focus?styles.focus:styles.preview}`} onKeyDown={event=>{
    if(event.key==='Escape'&&focus){exitFocus();return;}
    if(event.target instanceof HTMLElement&&event.target.closest('input,select,textarea,button,a'))return;
    if(event.key==='ArrowRight'){event.preventDefault();move(1);}
    if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}
   }} tabIndex={-1} role={focus?'dialog':undefined} aria-modal={focus||undefined} aria-label={focus?'Modo lectura del recetario':undefined}>
    <header className={styles.heading}>
     <div className={styles.headerTrail}><Link href="/admin/recetario"><ArrowLeft size={17}/>Todos los recetarios</Link><span aria-hidden="true">/</span><span className={styles.libraryBadge}>BIBLIOTECA GASTRONÓMICA DE PUEBLA</span></div>
     <div className={styles.headerTitle}><h1>{book.title}</h1><p>La memoria de Puebla, entre páginas.</p></div>
    </header>

    <div className={styles.readingRoom}>
     <div ref={toolbar} className={styles.toolbar}>
      {focus?<><h2 className={styles.focusTitle} title={book.title}>{book.title}</h2><button type="button" className={styles.exitReading} aria-label="Salir de lectura" title="Salir de lectura (Esc)" onClick={exitFocus}><X size={20}/></button></>:<>
      <button type="button" className={styles.infoToggle} aria-label="Ficha del libro" aria-expanded={drawer} aria-controls="reader-book-info" onClick={()=>setDrawer(value=>!value)}><PanelLeft size={17}/><span>Ficha del libro</span></button>
      <div className={styles.toolbarRight}>
       <div className={styles.tools}>
        <button type="button" disabled={!pdf||narrow} aria-label="Ver dos páginas" aria-pressed={double} onClick={()=>setSpread(true)}><BookOpen size={17}/><span>Dos páginas</span></button>
        <button type="button" disabled={!pdf} aria-label="Ver una página" aria-pressed={!double} onClick={()=>setSpread(false)}><File size={16}/><span>Una página</span></button>
       </div>
       <div className={`${styles.tools} ${styles.zoomTools}`}>
        <button type="button" disabled={!pdf||zoom<=.75} aria-label="Reducir zoom" onClick={()=>setZoom(value=>Math.max(.75,Math.round((value-.25)*100)/100))}><Minus size={17}/></button>
        <button type="button" disabled={!pdf} aria-label="Ajustar páginas a la pantalla" onClick={()=>setZoom(1)} className={styles.zoomValue}>{Math.round(zoom*100)}%</button>
        <button type="button" disabled={!pdf||zoom>=2} aria-label="Ampliar zoom" onClick={()=>setZoom(value=>Math.min(2,value+.25))}><Plus size={17}/></button>
       </div>
      </div>
      <button type="button" className={styles.focusButton} aria-label="Modo lectura" onClick={toggleFocus}><BookOpen size={18}/><span>Modo lectura</span></button>
      </>}
     </div>

     <div className={`${styles.readingArea} ${drawer?styles.withDrawer:''}`}>
      {drawer&&<aside id="reader-book-info" className={styles.bookInfo} aria-label="Ficha del libro">
       <div className={styles.infoHeading}><BookMarked size={18}/><h2>Ficha del libro</h2></div>
       <div className={styles.bookDetails}><h3>{book.title}</h3><p>{book.description}</p><span className={styles.pageCount}><File size={16}/>{total||book.pages} páginas</span></div>
      </aside>}

      <div ref={stage} className={styles.stage} tabIndex={0} aria-label="Libro de recetas. Usa las flechas izquierda y derecha para pasar las páginas.">
       <div className={styles.stageCaption}><span>COCINA, MEMORIA Y TERRITORIO</span><span>{total?`${String(current).padStart(2,'0')} / ${total}`:'Recetario de Puebla'}</span></div>
       {error?<div className={styles.empty} role="alert"><BookOpen size={32}/><h2>No pudimos abrir el recetario</h2><p>{error}</p><button type="button" onClick={()=>setAttempt(value=>value+1)}><RotateCcw size={14}/>Reintentar</button></div>:!pdf?<div className={styles.empty} role="status"><LoaderCircle className="animate-spin" size={28}/><h2>Abriendo las páginas de Puebla…</h2><p>{progress>0?`${progress}% cargado`:'Preparando el libro para su lectura.'}</p></div>:<>
        <button type="button" className={`${styles.edgeButton} ${styles.edgePrevious}`} disabled={previousDisabled} aria-label="Hojear hacia atrás" onClick={()=>move(-1)}><ChevronLeft size={22}/></button>
        <div className={styles.bookScroller}><div key={`${book.id}-${current}-${double}`} className={`${styles.openBook} ${visible.length===1?styles.single:''} ${direction<0?styles.backwards:''}`} role="group" aria-label={`Páginas ${visible.join(' y ')} de ${total}`}>
         {visible.map((number,index)=><div key={`${number}-${size.width}-${size.height}-${zoom}`} className={`${styles.paper} ${visible.length>1?(index===0?styles.left:styles.right):''}`}>
          <div className={styles.folio}><span>{focus?(number===1?'PUEBLA · COCINA DE MÉXICO':'BIBLIOTECA GASTRONÓMICA'):(index===0?'COCINA, MEMORIA Y TERRITORIO':'BIBLIOTECA GASTRONÓMICA')}</span><span>{focus?'':'PÁG. '}{String(number).padStart(2,'0')}</span></div>
          <PdfSheet pdf={pdf} number={number} maxWidth={Math.min(visible.length>1?(size.width-(focus?48:96))/2:size.width-(focus?32:48),650)} maxHeight={focus?Math.max(100,size.height-(narrow?78:94)):size.height} zoom={zoom}/>
          <div className={styles.paperFoot}><span>Observatorio Gastronómico de Puebla</span><span className={styles.pageNumber}>{number}</span></div>
         </div>)}
        </div></div>
        <button type="button" className={`${styles.edgeButton} ${styles.edgeNext}`} disabled={nextDisabled} aria-label="Hojear hacia adelante" onClick={()=>move(1)}><ChevronRight size={22}/></button>
       </>}
      </div>
     </div>

     <footer ref={footer} className={styles.footer}>
      <span className={styles.footerIdentity}><span aria-hidden="true">✦</span> Un recorrido por el sabor de Puebla</span>
      <div className={styles.pageControls}>
       <button type="button" disabled={previousDisabled} aria-label="Página anterior" onClick={()=>move(-1)}><ChevronLeft size={17}/><span>Anterior</span></button>
       <form onSubmit={jump}><label htmlFor="reader-page">{focus?'Página':'Ir a página:'}</label><input id="reader-page" type="number" min={1} max={total||1} value={pageInput} disabled={!pdf} onChange={event=>setPageInput(event.target.value)} onBlur={()=>goTo(Number(pageInput))}/><span>de {total||'—'}</span></form>
       <button type="button" disabled={nextDisabled} aria-label="Página siguiente" onClick={()=>move(1)}><span>Siguiente</span><ChevronRight size={17}/></button>
      </div>
      <div className={styles.readingProgress}><div><span style={{width:total?`${((visible.at(-1)??1)/total)*100}%`:'0%'}}/></div><p role="status">{total?`Página${visible.length>1?'s':''} ${visible.join('–')} de ${total}`:'Cargando recetario'}</p></div>
     </footer>
    </div>

   </div>
  </main>
 </div>;
}

function PdfSheet({pdf,number,maxWidth,maxHeight,zoom}:{pdf:PDFDocumentProxy;number:number;maxWidth:number;maxHeight:number;zoom:number}){
 const canvas=useRef<HTMLCanvasElement>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);const [text,setText]=useState('');const [dimensions,setDimensions]=useState({width:maxWidth,height:maxHeight});
 useEffect(()=>{
  let cancelled=false;let task:RenderTask|undefined;
  async function render(){try{
   const page=await pdf.getPage(number);if(cancelled||!canvas.current)return;
   const base=page.getViewport({scale:1});const scale=Math.min(maxWidth/base.width,maxHeight/base.height)*zoom;const viewport=page.getViewport({scale});const ratio=Math.min(window.devicePixelRatio||1,2);
   const element=canvas.current;element.width=Math.floor(viewport.width*ratio);element.height=Math.floor(viewport.height*ratio);setDimensions({width:viewport.width,height:viewport.height});
   task=page.render({canvas:element,viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:undefined});await task.promise;if(cancelled)return;setLoading(false);
   const content=await page.getTextContent();if(!cancelled)setText(content.items.map(item=>'str' in item?item.str:'').join(' '));
  }catch{if(!cancelled){setError(true);setLoading(false);}}}
  void render();return()=>{cancelled=true;task?.cancel();};
 },[pdf,number,maxWidth,maxHeight,zoom]);
 return <div className={styles.sheet} style={{width:dimensions.width,height:dimensions.height}} aria-busy={loading}><canvas ref={canvas} role="img" aria-label={`Página ${number} del recetario`} style={{width:dimensions.width,height:dimensions.height,opacity:loading?0:1}}/>{loading&&<span className={styles.sheetLoading}><LoaderCircle size={22} className="animate-spin"/></span>}{error&&<p className={styles.sheetLoading}>No se pudo mostrar la página {number}.</p>}<p className="sr-only">{text}</p></div>;
}
