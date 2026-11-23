"use client";

import {useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {BookOpen,Search,Plus,MoreHorizontal,Pencil,Trash2} from 'lucide-react';
import {toast} from 'sonner';
import {ObservatorySidebar} from '@/components/dashboard/observatory-sidebar';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {AlertDialog,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
import {canManageRecipeBook,type RecipeBook} from '@/data/team-recipe-books';
import {readBookResponse} from '@/lib/book-upload-client';
import {RecipeBookForm} from './recipe-book-form';
import {useSessionUser} from '@/components/auth/session-provider';
import styles from './recipe-book-catalog.module.css';

const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-MX');
export function RecipeBookCatalog({initialBooks}:{initialBooks:RecipeBook[]}){
 const user=useSessionUser();
 const [books,setBooks]=useState(initialBooks);
 const [open,setOpen]=useState(false);const [editing,setEditing]=useState<RecipeBook>();
 const [pendingDelete,setPendingDelete]=useState<RecipeBook>();const [deleting,setDeleting]=useState(false);const [deleteError,setDeleteError]=useState('');
 const [search,setSearch]=useState('');const [filter,setFilter]=useState<'all'|'draft'|'published'>('all');
 const visible=books.filter(book=>(filter==='all'||book.status===filter)&&normalize(`${book.title} ${book.description} ${book.publisher} ${book.author??''} ${book.subtitle}`).includes(normalize(search.trim())));
 const filters=[{key:'all',label:'Todos',count:books.length},{key:'draft',label:'Borradores',count:books.filter(book=>book.status==='draft').length},{key:'published',label:'Publicados',count:books.filter(book=>book.status==='published').length}] as const;
 const remove=async()=>{
  if(!pendingDelete||deleting)return;const book=pendingDelete;setDeleting(true);setDeleteError('');
  try{await readBookResponse(await fetch(`/api/admin/recetarios/${book.id}`,{method:'DELETE'}));setBooks(current=>current.filter(item=>item.id!==book.id));setPendingDelete(undefined);toast.success('Recetario eliminado',{duration:10000,action:{label:'Deshacer',onClick:()=>{void (async()=>{try{const data=await readBookResponse<{book:RecipeBook}>(await fetch(`/api/admin/recetarios/${book.id}`,{method:'POST'}));setBooks(current=>[data.book,...current.filter(item=>item.id!==book.id)]);toast.success('Recetario restaurado');}catch(cause){toast.error(cause instanceof Error?cause.message:'No se pudo restaurar el recetario.');}})();}}});}
  catch(cause){setDeleteError(cause instanceof Error?cause.message:'No se pudo eliminar el recetario.');}finally{setDeleting(false);}
 };
 return <div className="acervo-page min-h-screen text-[#173257]"><ObservatorySidebar activeItem="Recetario"/><main className="admin-main"><div className="mx-auto max-w-[1360px]">
  <header className="acervo-heading"><div><h1>Recetario</h1><p>Libros, recetas y saberes de la cocina poblana para explorar entre páginas.</p></div>{user?.role!=='revisor'&&<button type="button" className="acervo-primary" onClick={()=>{setEditing(undefined);setOpen(true);}}><Plus size={16}/>Añadir recetario</button>}</header>
  <section className={`acervo-card mt-6 overflow-hidden ${styles.catalog}`} aria-label="Catálogo de recetarios">
   <div className="recipe-catalog-toolbar"><div className="recipe-catalog-filters" role="group" aria-label="Filtrar recetarios por estado">{filters.map(item=><button type="button" key={item.key} className={`recipe-catalog-filter ${filter===item.key?'is-active':''}`} aria-pressed={filter===item.key} onClick={()=>setFilter(item.key)}>{item.label}<span className="recipe-catalog-count">{item.count}</span></button>)}</div><div className="relative w-full sm:w-[320px]"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-[#8a97a9]"/><input type="search" className="acervo-input h-10 w-full !pl-10" aria-label="Buscar recetarios" placeholder="Buscar libro, tema o institución…" value={search} onChange={event=>setSearch(event.target.value)}/></div></div>
   {visible.length?<div className={styles.grid}>{visible.map(book=><article key={book.id} className={styles.card} aria-labelledby={`book-${book.id}`}>
    <Link href={`/admin/recetario/${book.id}`} className={styles.cover} aria-label={`Leer ${book.title}`}><Image src={book.cover} alt={`Portada de ${book.title}`} width={244} height={340} className={styles.coverImage} unoptimized/><span className={styles.coverHint}><BookOpen size={14}/>Abrir recetario</span></Link>
    <div className={styles.body}><div className={styles.meta}><span>Recetario</span><span>{book.pages} páginas</span></div><h2 id={`book-${book.id}`}><Link href={`/admin/recetario/${book.id}`}>{book.title}</Link></h2><p className={styles.description}>{book.description}</p><div className={styles.cardActions}><span className={`recipe-status ${book.status==='draft'?'status-draft':'status-verified'}`}>{book.status==='draft'?'Borrador':'Publicado'}</span>{user&&canManageRecipeBook(user,book)&&<DropdownMenu><DropdownMenuTrigger asChild><button type="button" className={styles.options} aria-label={`Opciones de ${book.title}`}><MoreHorizontal size={19}/></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>{setEditing(book);setOpen(true);}}><Pencil size={14}/>Editar recetario</DropdownMenuItem><DropdownMenuItem className="text-[#b65765]" onSelect={()=>{setDeleteError('');setPendingDelete(book);}}><Trash2 size={14}/>Eliminar recetario</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div></div>
   </article>)}</div>:<div className={styles.empty}><BookOpen size={28}/><h2>No encontramos recetarios</h2><p>Prueba otro estado, título o tema.</p><button type="button" className="acervo-secondary" onClick={()=>{setSearch('');setFilter('all');}}>Mostrar todos</button></div>}
  </section>
  <RecipeBookForm canPublish={user?.role==='administrador'} key={open?editing?.id??'new':'closed'} initial={editing} open={open} onOpenChange={setOpen} onSaved={book=>{setBooks(current=>[book,...current.filter(item=>item.id!==book.id)]);toast.success(book.status==='draft'?'Borrador guardado':'Recetario publicado');}}/>
  <AlertDialog open={!!pendingDelete} onOpenChange={value=>{if(!value&&!deleting)setPendingDelete(undefined);}}><AlertDialogContent className="rounded-xl"><AlertDialogHeader><AlertDialogTitle>¿Eliminar recetario?</AlertDialogTitle><AlertDialogDescription>«{pendingDelete?.title}» dejará de aparecer en el catálogo. Puedes deshacer la acción desde el aviso que aparecerá al eliminarlo.</AlertDialogDescription></AlertDialogHeader>{deleteError&&<p role="alert" className="text-xs text-red-700">{deleteError}</p>}<AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><button type="button" disabled={deleting} className={styles.deleteButton} onClick={()=>void remove()}>{deleting?'Eliminando…':'Eliminar recetario'}</button></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div></main></div>;
}
