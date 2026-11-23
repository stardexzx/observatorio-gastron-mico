import 'server-only';
import {mkdir,readdir,readFile,writeFile,rename,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {canManageRecipeBook,recipeBooks,type RecipeBook} from '@/data/team-recipe-books';
import type {SessionUser} from '@/lib/auth/types';
const root=join(process.env.OGP_BOOKS_DATA_DIR??join(process.cwd(),'.data'),'recipe-books');
const validId=(id:string)=>/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(id);
const validStoreId=(id:string)=>validId(id)||recipeBooks.some(book=>book.id===id);
const normalize=(book:RecipeBook):RecipeBook=>({...book,status:book.status??'published'});
export async function listRecipeBooks():Promise<RecipeBook[]>{
 let names:string[];try{names=await readdir(root);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return recipeBooks.map(normalize);throw error;}
 const stored=await Promise.all(names.filter(validStoreId).map(async id=>{try{return normalize(JSON.parse(await readFile(join(root,id,'metadata.json'),'utf8')) as RecipeBook);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}}));
 const overrides=stored.filter((book):book is RecipeBook=>book!==null);
 return [...overrides.filter(book=>!book.deletedAt&&!recipeBooks.some(base=>base.id===book.id)).sort((a,b)=>a.title.localeCompare(b.title,'es')),...recipeBooks.map(base=>overrides.find(book=>book.id===base.id)??normalize(base)).filter(book=>!book.deletedAt)];
}
export async function findRecipeBook(id:string){return (await listRecipeBooks()).find(book=>book.id===id);}
export async function listPublishedRecipeBooks(){
 const books=(await listRecipeBooks()).filter(book=>book.status==='published');
 return Promise.all(books.map(async book=>{
  const path=recipeBookPDFPath(book);
  const file=path?await stat(/* turbopackIgnore: true */ path).catch(()=>null):null;
  return {...book,available:!!file?.isFile()&&file.size>0};
 }));
}
export function recipeBookPDFPath(book:RecipeBook){
 if(book.pdfAsset&&validStoreId(book.id)&&/^[0-9a-f-]{36}\.pdf$/.test(book.pdfAsset))return join(root,book.id,book.pdfAsset);
 return recipeBooks.some(item=>item.id===book.id)?join(process.cwd(),'assets','recetarios',book.filename):validId(book.id)?join(root,book.id,'book.pdf'):null;
}
export function recipeBookCoverPath(id:string,asset='cover'){return validStoreId(id)&&(asset==='cover'||/^[0-9a-f-]{36}\.png$/.test(asset))?join(root,id,asset):null;}
export class BookInputError extends Error{}
export class BookPermissionError extends Error{}
function assertCanManage(user:SessionUser, book:RecipeBook) {
 if(!canManageRecipeBook(user,book)) throw new BookPermissionError('No tienes permiso para modificar este recetario.');
}
function assertStatus(user:SessionUser, status:RecipeBook['status']) {
 if(user.role==='revisor'||(status==='published'&&user.role!=='administrador')) throw new BookPermissionError('Solo administración puede publicar recetarios.');
}
function editorialFields(form:FormData){
 const field=(name:string,max:number)=>{const value=form.get(name);if(value!==null&&typeof value!=='string')throw new BookInputError('Revisa los datos del libro.');const text=(value??'').trim();if(text.length>max)throw new BookInputError('Uno de los textos supera la longitud permitida.');return text;};
 const title=field('title',200),description=field('description',3000),publisher=field('publisher',200),author=field('author',200),year=field('year',4),edition=field('edition',150),isbn=field('isbn',32),status=field('status',20)||'published';
 if(!title||!description)throw new BookInputError('Completa el título y la descripción.');
 if(year&&!/^\d{4}$/.test(year))throw new BookInputError('Escribe el año con cuatro dígitos.');
 if(status!=='draft'&&status!=='published')throw new BookInputError('Selecciona publicar o guardar borrador.');
 return {title,description,publisher,author,year,edition,isbn,status:status as RecipeBook['status'],subtitle:['Recetario',year].filter(Boolean).join(' · ')};
}
function pageCount(form:FormData){const pages=Number(form.get('pages'));if(!Number.isInteger(pages)||pages<1||pages>10000)throw new BookInputError('No se pudo verificar el número de páginas.');return pages;}
async function pdfBytes(file:FormDataEntryValue|null){
 if(!(file instanceof File)||!file.size||file.size>50*1024*1024)throw new BookInputError('Selecciona un PDF de hasta 50 MB.');
 const bytes=Buffer.from(await file.arrayBuffer());if(!bytes.subarray(0,1024).includes(Buffer.from('%PDF-')))throw new BookInputError('El archivo no es un PDF válido.');return bytes;
}
async function coverBytes(file:FormDataEntryValue|null){
 if(!(file instanceof File)||!file.size||file.size>5*1024*1024)throw new BookInputError('La portada debe ser una imagen de hasta 5 MB.');
 const bytes=Buffer.from(await file.arrayBuffer());if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new BookInputError('No se pudo procesar la portada. Vuelve a seleccionarla.');return bytes;
}
async function persist(book:RecipeBook){
 if(!validStoreId(book.id))throw new BookInputError('No encontramos ese recetario.');
 const directory=join(root,book.id);await mkdir(directory,{recursive:true});const temporary=join(directory,`metadata-${randomUUID()}.tmp`);
 try{await writeFile(temporary,JSON.stringify(book));await rename(temporary,join(directory,'metadata.json'));}catch(error){await rm(temporary,{force:true});throw error;}
}
export async function createRecipeBook(form:FormData,user:SessionUser):Promise<RecipeBook>{
 const fields=editorialFields(form);assertStatus(user,fields.status);const pages=pageCount(form);const pdf=await pdfBytes(form.get('pdf')),cover=await coverBytes(form.get('cover'));
 const id=randomUUID(),directory=join(root,id);const book:RecipeBook={...fields,ownerId:user.id,id,pages,filename:'book.pdf',cover:`/api/admin/recetarios/${id}/portada`,contents:[{title:'Portada',page:1}]};
 await mkdir(directory,{recursive:true});
 try{await writeFile(join(directory,'book.pdf'),pdf);await writeFile(join(directory,'cover'),cover);await persist(book);}catch(error){await rm(directory,{recursive:true,force:true});throw error;}return book;
}
const globalBooks=globalThis as typeof globalThis & { recipeBookWrites?:Map<string,Promise<void>> };
const writes=globalBooks.recipeBookWrites??=new Map<string,Promise<void>>();
async function withBookWrite<T>(id:string,write:()=>Promise<T>){
 const pending=(writes.get(id)??Promise.resolve()).then(write);
 const settled=pending.then(()=>{},()=>{});
 writes.set(id,settled);
 try{return await pending;}finally{if(writes.get(id)===settled)writes.delete(id);}
}
export async function updateRecipeBook(id:string,form:FormData,user:SessionUser):Promise<RecipeBook>{
 return withBookWrite(id,async()=>{
  const previous=await findRecipeBook(id);if(!previous)throw new BookInputError('No encontramos ese recetario.');
  assertCanManage(user,previous);
  const book:RecipeBook={...previous,...editorialFields(form)};assertStatus(user,book.status);
  const pdf=form.get('pdf'),cover=form.get('cover');const newPDF=pdf instanceof File&&pdf.size>0,newCover=cover instanceof File&&cover.size>0;
  const pdfBuffer=newPDF?await pdfBytes(pdf):null,coverBuffer=newCover?await coverBytes(cover):null;
  if(newPDF){book.pages=pageCount(form);book.contents=[{title:'Portada',page:1}];book.pdfAsset=`${randomUUID()}.pdf`;}
  if(newCover){book.coverAsset=`${randomUUID()}.png`;book.cover=`/api/admin/recetarios/${id}/portada?v=${randomUUID()}`;}
  const written:string[]=[];await mkdir(join(root,id),{recursive:true});
  try{if(pdfBuffer&&book.pdfAsset){const path=join(root,id,book.pdfAsset);written.push(path);await writeFile(path,pdfBuffer);}if(coverBuffer&&book.coverAsset){const path=join(root,id,book.coverAsset);written.push(path);await writeFile(path,coverBuffer);}await persist(book);}catch(error){await Promise.allSettled(written.map(path=>rm(path,{force:true})));throw error;}return book;
 });
}
export async function deleteRecipeBook(id:string,user:SessionUser){
 return withBookWrite(id,async()=>{
  const book=await findRecipeBook(id);
  if(!book)throw new BookInputError('No encontramos ese recetario.');
  assertCanManage(user,book);
  await persist({...book,deletedAt:new Date().toISOString()});
 });
}
export async function restoreRecipeBook(id:string,user:SessionUser){
 return withBookWrite(id,async()=>{
  if(!validStoreId(id))throw new BookInputError('No encontramos ese recetario.');
  let book:RecipeBook;try{book=normalize(JSON.parse(await readFile(join(root,id,'metadata.json'),'utf8')));}catch{throw new BookInputError('No se pudo recuperar el recetario.');}
  assertCanManage(user,book);
  delete book.deletedAt;await persist(book);return book;
 });
}
