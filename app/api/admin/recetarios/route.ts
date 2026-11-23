import {canReadRecipeBook} from '@/data/team-recipe-books';
import {NextRequest,NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth/session';
import {isAllowedWriteOrigin} from '@/lib/request-origin';
import {readBookUpload,discardBookUpload} from '@/lib/recipe-book-upload';
import {BookInputError,BookPermissionError,createRecipeBook,listRecipeBooks} from '@/lib/recipe-book-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});return NextResponse.json({books:(await listRecipeBooks()).filter(book=>canReadRecipeBook(user,book))},{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'No se pudo cargar el catálogo.'},{status:503});}
}
export async function POST(request:NextRequest){
 try{
 const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});
 if(user.role==='revisor')return NextResponse.json({error:'No tienes permiso para añadir libros.'},{status:403});
 if(!isAllowedWriteOrigin(request)||!request.headers.get('content-type')?.startsWith('multipart/form-data'))return NextResponse.json({error:'Solicitud no permitida.'},{status:403});
 if(Number(request.headers.get('content-length')??0)>56*1024*1024)return NextResponse.json({error:'Los archivos superan el tamaño permitido.'},{status:413});
 const form=await request.formData();const pdfId=form.get('pdfUploadId'),coverId=form.get('coverUploadId');
 if(typeof pdfId==='string'&&typeof coverId==='string'){form.set('pdf',await readBookUpload(pdfId,user.id,'pdf'));form.set('cover',await readBookUpload(coverId,user.id,'cover'));}
 const book=await createRecipeBook(form,user);
 if(typeof pdfId==='string'&&typeof coverId==='string')await Promise.allSettled([discardBookUpload(pdfId,user.id),discardBookUpload(coverId,user.id)]);
 return NextResponse.json({book},{status:201});
 }catch(error){return NextResponse.json({error:error instanceof BookInputError||error instanceof BookPermissionError?error.message:'No se pudo añadir el recetario. Vuelve a intentarlo.'},{status:error instanceof BookPermissionError?403:error instanceof BookInputError?400:503});}
}
