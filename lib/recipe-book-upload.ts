import 'server-only';
import {mkdir,readFile,writeFile,readdir,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {BookInputError} from './recipe-book-store';
const root=join(process.env.OGP_BOOKS_DATA_DIR??join(process.cwd(),'.data'),'recipe-book-uploads');
export const bookChunkSize=512*1024;
const validId=(id:string)=>/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(id);
type Upload={owner:string;size:number;kind:'pdf'|'cover';created:number};
async function manifest(id:string,owner:string):Promise<Upload>{
 if(!validId(id))throw new BookInputError('La carga no es válida. Vuelve a seleccionar el archivo.');
 let data:Upload;try{data=JSON.parse(await readFile(join(root,id,'upload.json'),'utf8'));}catch{throw new BookInputError('La carga ya no está disponible. Vuelve a intentarlo.');}
 if(data.owner!==owner||Date.now()-data.created>24*60*60*1000)throw new BookInputError('La carga caducó o no pertenece a tu sesión. Vuelve a intentarlo.');
 return data;
}
export async function startBookUpload(owner:string,input:{size?:unknown;kind?:unknown}){
 const kind=input.kind,size=input.size;
 if((kind!=='pdf'&&kind!=='cover')||typeof size!=='number'||!Number.isInteger(size)||size<1||size>(kind==='pdf'?50:5)*1024*1024)throw new BookInputError('El PDF debe pesar hasta 50 MB y la portada hasta 5 MB.');
 await mkdir(root,{recursive:true});
 // Remove expired, incomplete uploads; completed books live in a separate directory.
 for(const id of (await readdir(root)).filter(validId)){
  try{const details=await stat(join(root,id,'upload.json'));if(Date.now()-details.mtimeMs>24*60*60*1000)await rm(join(root,id),{recursive:true,force:true});}catch{}
 }
 const id=randomUUID();await mkdir(join(root,id));await writeFile(join(root,id,'upload.json'),JSON.stringify({owner,kind,size,created:Date.now()} satisfies Upload));
 return {id,chunkSize:bookChunkSize};
}
export async function writeBookChunk(id:string,owner:string,part:number,bytes:Uint8Array){
 const upload=await manifest(id,owner);const parts=Math.ceil(upload.size/bookChunkSize);
 if(!Number.isInteger(part)||part<0||part>=parts||bytes.length!==Math.min(bookChunkSize,upload.size-part*bookChunkSize))throw new BookInputError('Una parte del archivo llegó incompleta. Vuelve a intentar la carga.');
 await writeFile(join(root,id,`${part}.part`),bytes);
}
export async function readBookUpload(id:string,owner:string,kind:'pdf'|'cover'){
 const upload=await manifest(id,owner);if(upload.kind!==kind)throw new BookInputError('El archivo no corresponde al tipo esperado.');
 const chunks:Buffer[]=[];
 for(let part=0;part<Math.ceil(upload.size/bookChunkSize);part++){
  let bytes:Buffer;try{bytes=await readFile(join(root,id,`${part}.part`));}catch{throw new BookInputError('La carga no terminó. Vuelve a intentarlo.');}
  if(bytes.length!==Math.min(bookChunkSize,upload.size-part*bookChunkSize))throw new BookInputError('El archivo llegó incompleto. Vuelve a intentarlo.');chunks.push(bytes);
 }
 return new File([Buffer.concat(chunks)],kind==='pdf'?'book.pdf':'cover.png',{type:kind==='pdf'?'application/pdf':'image/png'});
}
export async function discardBookUpload(id:string,owner:string){await manifest(id,owner);await rm(join(root,id),{recursive:true,force:true});}
