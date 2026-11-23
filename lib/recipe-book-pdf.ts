import 'server-only';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {Readable} from 'node:stream';
import type {RecipeBook} from '@/data/team-recipe-books';
import {recipeBookPDFPath} from '@/lib/recipe-book-store';
import {parseByteRange} from '@/lib/book-navigation';

export async function serveRecipeBookPDF(request:Request,book:RecipeBook,head=false){
  const path=recipeBookPDFPath(book);
  if(!path)return new Response(null,{status:404});
  const {size}=await stat(path);
  const headers:Record<string,string>={'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${book.filename}"`,'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
  const range=request.headers.get('range');const part=range?parseByteRange(range,size):{start:0,end:size-1};
  if(!part)return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${size}`}});
  headers['Content-Length']=String(part.end-part.start+1);
  if(range)headers['Content-Range']=`bytes ${part.start}-${part.end}/${size}`;
  if(head)return new Response(null,{status:range?206:200,headers});
  const stream=createReadStream(path,part);
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>,{status:range?206:200,headers});
}
