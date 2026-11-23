"use client";
/* eslint-disable @next/next/no-img-element -- Preview uses a temporary browser object URL. */

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {BookOpen,FileUp,LoaderCircle,ImagePlus} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {readBookResponse,uploadBookFile} from '@/lib/book-upload-client';
import type {RecipeBook} from '@/data/team-recipe-books';
import styles from './recipe-book-form.module.css';

async function canvasPNG(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo preparar la portada.')),'image/png'));}
async function inspectPDF(file:File){
 const library=await import('pdfjs-dist');const assets=`/pdfjs/${library.version}/`;
 library.GlobalWorkerOptions.workerSrc=`${assets}pdf.worker.min.mjs`;library.GlobalWorkerOptions.rendererSrc=`${assets}pdf.renderer.min.mjs`;
 const task=library.getDocument({data:new Uint8Array(await file.arrayBuffer()),cMapUrl:`${assets}cmaps/`,cMapPacked:true,standardFontDataUrl:`${assets}standard_fonts/`,wasmUrl:`${assets}wasm/`});
 try{const pdf=await task.promise;if(pdf.numPages>10000)throw new Error('El PDF supera las 10 000 páginas.');const page=await pdf.getPage(1);const original=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(850/original.height,850/original.width,2)});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvas,viewport}).promise;return {pages:pdf.numPages,cover:new File([await canvasPNG(canvas)],'portada.png',{type:'image/png'})};}finally{await task.destroy();}
}
async function imagePNG(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.');
 const image=await createImageBitmap(file);
 try{if(image.width*image.height>40000000)throw new Error('La imagen es demasiado grande.');const scale=Math.min(850/image.width,850/image.height,1);const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);return new File([await canvasPNG(canvas)],'portada.png',{type:'image/png'});}finally{image.close();}
}
export function RecipeBookForm({open,onOpenChange,onSaved,initial,canPublish}:{canPublish:boolean;open:boolean;onOpenChange:(value:boolean)=>void;onSaved:(book:RecipeBook)=>void;initial?:RecipeBook}){
 const [pdf,setPdf]=useState<File|null>(null);const [cover,setCover]=useState<File|null>(null);const [automaticCover,setAutomaticCover]=useState<File|null>(null);const preview=useRef<HTMLImageElement>(null);const [pages,setPages]=useState(initial?.pages??0);const [preparing,setPreparing]=useState(false);const [saving,setSaving]=useState(false);const [uploadProgress,setUploadProgress]=useState(0);const [error,setError]=useState('');const sequence=useRef(0);
 useEffect(()=>{if(!cover||!preview.current)return;const url=URL.createObjectURL(cover);preview.current.src=url;return()=>URL.revokeObjectURL(url);},[cover]);
 useEffect(()=>()=>{sequence.current++;},[]);
 const selectPDF=async(file:File|undefined)=>{
  const revision=++sequence.current;setError('');setPdf(null);setPages(initial?.pages??0);setCover(null);setAutomaticCover(null);setPreparing(false);if(!file)return;
  if(!file.name.toLowerCase().endsWith('.pdf')||file.size>50*1024*1024||!file.size){setError('Selecciona un archivo PDF de hasta 50 MB.');return;}
  setPreparing(true);
  try{const result=await inspectPDF(file);if(revision!==sequence.current)return;setPdf(file);setPages(result.pages);setCover(result.cover);setAutomaticCover(result.cover);}
  catch{if(revision===sequence.current)setError('No se pudo leer el PDF. Elige un archivo válido que no tenga contraseña.');}
  finally{if(revision===sequence.current)setPreparing(false);}
 };
 const selectCover=async(file:File|undefined)=>{if(!file)return;const revision=++sequence.current;setError('');setPreparing(true);try{const image=await imagePNG(file);if(revision===sequence.current)setCover(image);}catch(cause){if(revision===sequence.current)setError(cause instanceof Error?cause.message:'No se pudo abrir la imagen.');}finally{if(revision===sequence.current)setPreparing(false);}};
 const submit=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if((!initial&&(!pdf||!cover))||preparing||saving){setError('Selecciona un PDF y espera a que termine de prepararse.');return;}
  const form=new FormData(event.currentTarget);const requested=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;form.set('status',!canPublish||requested?.value==='draft'?'draft':'published');form.set('pages',String(pages));setError('');setSaving(true);setUploadProgress(0);const uploads:string[]=[];let sent=0;
  const progress=(bytes:number)=>{sent+=bytes;setUploadProgress(Math.min(99,Math.floor(sent/Math.max(1,(pdf?.size??0)+(cover?.size??0))*100)));};
  try{
   if(pdf)form.set('pdfUploadId',await uploadBookFile(pdf,'pdf',progress,id=>uploads.push(id)));
   if(cover)form.set('coverUploadId',await uploadBookFile(cover,'cover',progress,id=>uploads.push(id)));
   const response=await fetch(initial?`/api/admin/recetarios/${initial.id}`:'/api/admin/recetarios',{method:initial?'PATCH':'POST',body:form});
   const data=await readBookResponse<{book?:RecipeBook}>(response);if(!data.book)throw new Error('No se recibió la ficha del libro.');uploads.length=0;setUploadProgress(100);onSaved(data.book);onOpenChange(false);
  }catch(cause){setError(cause instanceof TypeError?'Se interrumpió la conexión. Tus datos siguen en el formulario; vuelve a intentar la carga.':cause instanceof Error?cause.message:'No se pudo conectar. Vuelve a intentarlo.');}
  finally{await Promise.allSettled(uploads.map(id=>fetch(`/api/admin/recetarios/cargas/${id}`,{method:'DELETE'})));setSaving(false);}

 };
 return <Dialog open={open} onOpenChange={value=>{if(!saving)onOpenChange(value);}}><DialogContent className="recipe-create-dialog max-h-[90dvh] overflow-y-auto rounded-[24px] bg-white p-6 sm:max-w-[760px] sm:p-8" onInteractOutside={event=>{if(saving)event.preventDefault();}}><DialogHeader className="text-left"><DialogTitle className="text-2xl text-[#173257]">{initial?"Editar recetario":"Añadir recetario"}</DialogTitle><DialogDescription>Comparte un libro y presenta las historias y recetas que reúne.</DialogDescription></DialogHeader>
  <form onSubmit={event=>void submit(event)} className="mt-4 space-y-5"><fieldset disabled={saving} className="space-y-5">
   <div className={styles.upload}><div><label htmlFor="book-pdf" className="acervo-label"><FileUp size={16}/>Archivo PDF{!initial&&" *"}</label><input id="book-pdf" type="file" accept="application/pdf,.pdf" onChange={event=>void selectPDF(event.target.files?.[0])} className={styles.fileInput} disabled={preparing}/><p>{initial?"Selecciona otro PDF solo si deseas reemplazar el actual.":"PDF de hasta 50 MB. Usaremos su primera página como portada."}</p>{initial&&!pdf&&!preparing&&<span className={styles.ready}><BookOpen size={14}/>PDF actual · {initial.pages} páginas</span>}{preparing&&<span role="status" className={styles.processing}><LoaderCircle size={14} className="animate-spin"/>Preparando archivo…</span>}{pdf&&!preparing&&<span className={styles.ready}><BookOpen size={14}/>{pages} páginas · {(pdf.size/1024/1024).toFixed(1)} MB</span>}</div><div className={styles.preview}>{cover?<img ref={preview} alt="Vista previa de la portada"/>:initial?<img src={initial.cover} alt="Portada actual"/>:<span><BookOpen size={30}/>Portada</span>}</div></div>
   <div><label htmlFor="book-cover" className={`acervo-label ${styles.coverLabel}`}><ImagePlus size={14}/>Cambiar portada <span className={styles.optional}>Opcional</span></label><input id="book-cover" type="file" accept="image/png,image/jpeg,image/webp" disabled={(!pdf&&!initial)||preparing} onChange={event=>void selectCover(event.target.files?.[0])} className={styles.fileInput}/><p className={styles.hint}>JPG, PNG o WebP, hasta 5 MB.</p>{automaticCover&&cover!==automaticCover&&<button type="button" className={styles.reset} onClick={()=>setCover(automaticCover)}>Usar primera página del PDF</button>}{initial&&cover&&!pdf&&<button type="button" className={styles.reset} onClick={()=>setCover(null)}>Conservar portada actual</button>}</div>
   <div><label htmlFor="book-title" className="acervo-label">Título del recetario *</label><input id="book-title" name="title" defaultValue={initial?.title} required maxLength={200} placeholder="Ej. Sabores y memorias de Puebla" className="acervo-input w-full"/></div>
   <div><label htmlFor="book-description" className="acervo-label">¿De qué trata? *</label><textarea id="book-description" name="description" defaultValue={initial?.description} required maxLength={3000} rows={3} placeholder="Describe las recetas, el territorio o las historias que reúne el libro." className="acervo-input w-full"/><p className={styles.hint}>Esta descripción aparecerá junto a la portada en el catálogo.</p></div>
   <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="book-author" className="acervo-label">Autoría</label><input id="book-author" name="author" defaultValue={initial?.author} maxLength={200} placeholder="Persona, colectivo o institución" className="acervo-input w-full"/></div><div><label htmlFor="book-publisher" className="acervo-label">Institución editora</label><input id="book-publisher" name="publisher" defaultValue={initial?.publisher} maxLength={200} className="acervo-input w-full"/></div></div>
   <div className="grid gap-5 sm:grid-cols-3"><div><label htmlFor="book-year" className="acervo-label">Año de publicación</label><input id="book-year" name="year" defaultValue={initial?.year} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="2026" className="acervo-input w-full"/></div><div><label htmlFor="book-edition" className="acervo-label">Edición</label><input id="book-edition" name="edition" defaultValue={initial?.edition} maxLength={150} placeholder="Primera edición" className="acervo-input w-full"/></div><div><label htmlFor="book-isbn" className="acervo-label">ISBN</label><input id="book-isbn" name="isbn" defaultValue={initial?.isbn} maxLength={32} placeholder="Si cuenta con uno" className="acervo-input w-full"/></div></div>
  </fieldset>{error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}<div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e5eaf0] pt-5"><button type="button" className="acervo-secondary mr-auto" disabled={saving} onClick={()=>onOpenChange(false)}>Cancelar</button><button type="submit" value="draft" disabled={saving||preparing||(!initial&&(!pdf||!cover))} className="acervo-secondary">Guardar borrador</button>{canPublish&&<button type="submit" value="published" disabled={saving||preparing||(!initial&&(!pdf||!cover))} className="acervo-primary">{saving?<><LoaderCircle size={15} className="animate-spin"/>Guardando… {uploadProgress}%</>:initial?.status==='published'?'Guardar cambios':'Publicar recetario'}</button>}</div></form>
 </DialogContent></Dialog>;
}
