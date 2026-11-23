import {canReadRecipeBook} from '@/data/team-recipe-books';
import {isAllowedWriteOrigin} from '@/lib/request-origin';
import {readBookUpload,discardBookUpload} from '@/lib/recipe-book-upload';
import {NextRequest,NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth/session';
import {BookInputError,BookPermissionError,updateRecipeBook,deleteRecipeBook,restoreRecipeBook,findRecipeBook} from '@/lib/recipe-book-store';
import {serveRecipeBookPDF} from '@/lib/recipe-book-pdf';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function serve(request:NextRequest,context:{params:Promise<{id:string}>},head=false){
 try{
  const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para leer el recetario.'},{status:401});
  const {id}=await context.params;const book=await findRecipeBook(id);
  if(!book||!canReadRecipeBook(user,book))return NextResponse.json({error:'No encontramos ese recetario.'},{status:404});
  return await serveRecipeBookPDF(request,book,head);
 }catch{return NextResponse.json({error:'No se pudo abrir el recetario. Vuelve a intentarlo.'},{status:503});}
}
export const GET=(request:NextRequest,context:{params:Promise<{id:string}>})=>serve(request,context);
export const HEAD=(request:NextRequest,context:{params:Promise<{id:string}>})=>serve(request,context,true);

async function mutate(request:NextRequest,context:{params:Promise<{id:string}>},action:'edit'|'delete'|'restore'){
 try{
  const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});
  if(user.role==='revisor'||!isAllowedWriteOrigin(request))return NextResponse.json({error:'No tienes permiso para modificar este recetario.'},{status:403});
  const {id}=await context.params;
  if(action==='delete'){await deleteRecipeBook(id,user);return NextResponse.json({ok:true});}
  if(action==='restore')return NextResponse.json({book:await restoreRecipeBook(id,user)});
  if(!request.headers.get('content-type')?.startsWith('multipart/form-data'))return NextResponse.json({error:'Formato de solicitud no válido.'},{status:415});
  const form=await request.formData();const pdfId=form.get('pdfUploadId'),coverId=form.get('coverUploadId');
  if(typeof pdfId==='string')form.set('pdf',await readBookUpload(pdfId,user.id,'pdf'));
  if(typeof coverId==='string')form.set('cover',await readBookUpload(coverId,user.id,'cover'));
  const book=await updateRecipeBook(id,form,user);
  await Promise.allSettled([pdfId,coverId].filter((value):value is string=>typeof value==='string').map(value=>discardBookUpload(value,user.id)));
  return NextResponse.json({book});
 }catch(error){return NextResponse.json({error:error instanceof BookInputError||error instanceof BookPermissionError?error.message:'No se pudo guardar el cambio. Vuelve a intentarlo.'},{status:error instanceof BookPermissionError?403:error instanceof BookInputError?400:503});}
}
export const PATCH=(request:NextRequest,context:{params:Promise<{id:string}>})=>mutate(request,context,'edit');
export const DELETE=(request:NextRequest,context:{params:Promise<{id:string}>})=>mutate(request,context,'delete');
export const POST=(request:NextRequest,context:{params:Promise<{id:string}>})=>mutate(request,context,'restore');
