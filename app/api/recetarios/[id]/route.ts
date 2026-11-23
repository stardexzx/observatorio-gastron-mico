import {NextRequest,NextResponse} from 'next/server';
import {findRecipeBook} from '@/lib/recipe-book-store';
import {serveRecipeBookPDF} from '@/lib/recipe-book-pdf';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function serve(request:NextRequest,context:{params:Promise<{id:string}>},head=false){
 try{
  const {id}=await context.params;const book=await findRecipeBook(id);
  if(!book||book.status!=='published')return NextResponse.json({error:'No encontramos ese recetario.'},{status:404});
  return await serveRecipeBookPDF(request,book,head);
 }catch(error){if(error && typeof error==='object' && 'code' in error && error.code==='ENOENT')return NextResponse.json({error:'El archivo de este recetario aún no está disponible.'},{status:404});return NextResponse.json({error:'No se pudo abrir el recetario. Vuelve a intentarlo.'},{status:503});}
}
export const GET=(request:NextRequest,context:{params:Promise<{id:string}>})=>serve(request,context);
export const HEAD=(request:NextRequest,context:{params:Promise<{id:string}>})=>serve(request,context,true);
